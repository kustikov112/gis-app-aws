import type { S3Event } from "aws-lambda";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import csvParser from "csv-parser";
import { Readable } from "node:stream";

type ParsedPointRecord = {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
};

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

const decodeS3Key = (key: string): string => decodeURIComponent(key.replace(/\+/g, " "));
const encodeS3Key = (key: string): string => key.split("/").map(encodeURIComponent).join("/");

const toReadable = (body: unknown): Readable => {
  if (body instanceof Readable) {
    return body;
  }

  if (body && typeof body === "object" && Symbol.asyncIterator in body) {
    return Readable.from(body as AsyncIterable<Uint8Array>);
  }

  throw new Error("Unsupported S3 body type for CSV parsing");
};

const toParsedPointRecord = (record: Record<string, unknown>): ParsedPointRecord | null => {
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const description = typeof record.description === "string" ? record.description.trim() : "";
  const latitude = Number.parseFloat(String(record.latitude ?? ""));
  const longitude = Number.parseFloat(String(record.longitude ?? ""));

  if (!title || !description || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { title, description, latitude, longitude };
};

const getPointsImportQueueUrl = (): string => {
  const queueUrl = process.env.POINTS_IMPORT_QUEUE_URL;
  if (!queueUrl) {
    throw new Error("POINTS_IMPORT_QUEUE_URL is not set");
  }

  return queueUrl;
};

const parseCsvFromObject = async (bucketName: string, key: string): Promise<ParsedPointRecord[]> => {
  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );

  if (!object.Body) {
    return [];
  }

  const rows: ParsedPointRecord[] = [];
  const stream = toReadable(object.Body);

  await new Promise<void>((resolve, reject) => {
    stream
      .pipe(csvParser())
      .on("data", (rawRow: Record<string, unknown>) => {
        const parsed = toParsedPointRecord(rawRow);
        if (!parsed) {
          console.log("Skipping invalid CSV row", { rawRow });
          return;
        }

        rows.push(parsed);
        console.log("Parsed CSV row", parsed);
      })
      .on("error", reject)
      .on("end", () => resolve());
  });

  return rows;
};

export const handler = async (event: S3Event): Promise<void> => {
  const pointsImportQueueUrl = getPointsImportQueueUrl();

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const sourceKey = decodeS3Key(record.s3.object.key);

    if (!sourceKey.startsWith("uploaded/")) {
      console.log("Skipping object outside uploaded prefix", { bucketName, sourceKey });
      continue;
    }

    const rows = await parseCsvFromObject(bucketName, sourceKey);

    for (const row of rows) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: pointsImportQueueUrl,
          MessageBody: JSON.stringify(row),
        }),
      );
    }

    console.log("Sent parsed rows to points import queue", {
      bucketName,
      sourceKey,
      count: rows.length,
    });

    const destinationKey = sourceKey.replace(/^uploaded\//, "parsed/");
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucketName,
        Key: destinationKey,
        CopySource: `${bucketName}/${encodeS3Key(sourceKey)}`,
      }),
    );

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: sourceKey,
      }),
    );

    console.log("CSV file moved to parsed prefix", {
      bucketName,
      sourceKey,
      destinationKey,
    });
  }
};
