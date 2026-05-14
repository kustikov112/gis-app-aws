import {
	DynamoDBClient,
	GetItemCommand,
	PutItemCommand,
	QueryCommand,
	ScanCommand,
	type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

export type Point = {
	id: string;
	title: string;
	description: string;
	latitude: number;
	longitude: number;
	createdAt: string;
	tags?: string[];
	photoUrl?: string;
	aiLabels?: Array<{ name: string; confidence: number }>;
};

export type PhotoEnrichment = {
	pointId: string;
	photoKey: string;
	labels: Array<{ name: string; confidence: number }>;
	enrichedAt: string;
};

export type CreatePointInput = {
	title: string;
	description: string;
	latitude: number;
	longitude: number;
};

const dynamoDb = new DynamoDBClient({});
const s3Client = new S3Client({});

const getTableName = (): string => {
	const tableName = process.env.POINTS_TABLE_NAME;
	if (!tableName) {
		throw new Error("POINTS_TABLE_NAME is not set");
	}

	return tableName;
};

const getPhotoEnrichmentTableName = (): string | undefined => process.env.PHOTO_ENRICHMENT_TABLE_NAME;

const requireString = (value: AttributeValue | undefined, fieldName: string): string => {
	if (!value || !("S" in value) || value.S === undefined) {
		throw new Error(`Point item is missing '${fieldName}'`);
	}

	return value.S;
};

const requireNumber = (value: AttributeValue | undefined, fieldName: string): number => {
	if (!value || !("N" in value) || value.N === undefined) {
		throw new Error(`Point item is missing '${fieldName}'`);
	}

	return Number(value.N);
};

const toPoint = (item: Record<string, AttributeValue>): Point => {
	const tags = item.tags && "L" in item.tags
		? item.tags.L?.flatMap((entry) => (entry.S ? [entry.S] : []))
		: undefined;

	const point: Point = {
		id: requireString(item.id, "id"),
		title: requireString(item.title, "title"),
		description: requireString(item.description, "description"),
		latitude: requireNumber(item.latitude, "latitude"),
		longitude: requireNumber(item.longitude, "longitude"),
		createdAt: requireString(item.createdAt, "createdAt"),
	};

	if (tags && tags.length > 0) {
		point.tags = tags;
	}

	if (item.photoUrl && "S" in item.photoUrl && item.photoUrl.S) {
		point.photoUrl = item.photoUrl.S;
	}

	return point;
};

const toPhotoEnrichment = (item: Record<string, AttributeValue>): PhotoEnrichment => {
	const labels = item.labels && "L" in item.labels
		? item.labels.L?.flatMap((entry) => {
			if (!entry.M) {
				return [];
			}

			const name = entry.M.name && "S" in entry.M.name ? entry.M.name.S : undefined;
			const confidence = entry.M.confidence && "N" in entry.M.confidence
				? Number(entry.M.confidence.N)
				: undefined;

			if (!name || confidence === undefined) {
				return [];
			}

			return [{ name, confidence }];
		}) ?? []
		: [];

	return {
		pointId: requireString(item.pointId, "pointId"),
		photoKey: requireString(item.photoKey, "photoKey"),
		labels,
		enrichedAt: requireString(item.enrichedAt, "enrichedAt"),
	};
};

const toItem = (point: Point): Record<string, AttributeValue> => {
	const item: Record<string, AttributeValue> = {
		id: { S: point.id },
		title: { S: point.title },
		description: { S: point.description },
		latitude: { N: point.latitude.toString() },
		longitude: { N: point.longitude.toString() },
		createdAt: { S: point.createdAt },
	};

	if (point.tags && point.tags.length > 0) {
		item.tags = {
			L: point.tags.map((tag) => ({ S: tag })),
		};
	}

	if (point.photoUrl) {
		item.photoUrl = { S: point.photoUrl };
	}

	return item;
};

export const listPoints = async (): Promise<Point[]> => {
	const response = await dynamoDb.send(
		new ScanCommand({
			TableName: getTableName(),
		}),
	);

	return (response.Items ?? [])
		.map(toPoint)
		.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
};

export const findPointById = async (pointId: string): Promise<Point | null> => {
	const response = await dynamoDb.send(
		new GetItemCommand({
			TableName: getTableName(),
			Key: {
				id: { S: pointId },
			},
		}),
	);

	return response.Item ? toPoint(response.Item) : null;
};

export const findLatestEnrichmentByPointId = async (pointId: string): Promise<PhotoEnrichment | null> => {
	const tableName = getPhotoEnrichmentTableName();
	if (!tableName) {
		return null;
	}

	const response = await dynamoDb.send(
		new QueryCommand({
			TableName: tableName,
			KeyConditionExpression: "pointId = :pointId",
			ExpressionAttributeValues: {
				":pointId": { S: pointId },
			},
		}),
	);

	const enrichments = (response.Items ?? []).map(toPhotoEnrichment);
	if (enrichments.length === 0) {
		return null;
	}

	enrichments.sort(
		(left, right) => right.enrichedAt.localeCompare(left.enrichedAt) || right.photoKey.localeCompare(left.photoKey),
	);

	return enrichments[0];
};

export const persistPoint = async (input: CreatePointInput): Promise<Point> => {
	const point: Point = {
		id: randomUUID(),
		title: input.title,
		description: input.description,
		latitude: input.latitude,
		longitude: input.longitude,
		createdAt: new Date().toISOString(),
	};

	await dynamoDb.send(
		new PutItemCommand({
			TableName: getTableName(),
			Item: toItem(point),
			ConditionExpression: "attribute_not_exists(id)",
		}),
	);

	return point;
};

const parseS3Url = (photoUrl: string): { bucket: string; key: string } | null => {
	try {
		const parsed = new URL(photoUrl);
		const hostMatch = parsed.hostname.match(/^(.+)\.s3\.[^.]+\.amazonaws\.com$/);
		if (!hostMatch) {
			return null;
		}

		const bucket = hostMatch[1];
		const key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
		if (!bucket || !key) {
			return null;
		}

		return { bucket, key };
	} catch {
		return null;
	}
};

export const withSignedPhotoUrl = async (point: Point): Promise<Point> => {
	if (!point.photoUrl) {
		return point;
	}

	const location = parseS3Url(point.photoUrl);
	if (!location) {
		return point;
	}

	try {
		const signedUrl = await getSignedUrl(
			s3Client,
			new GetObjectCommand({
				Bucket: location.bucket,
				Key: location.key,
			}),
			{ expiresIn: 900 },
		);

		return {
			...point,
			photoUrl: signedUrl,
		};
	} catch {
		return point;
	}
};

export const withSignedPhotoUrls = async (points: Point[]): Promise<Point[]> => {
	return Promise.all(points.map((point) => withSignedPhotoUrl(point)));
};
