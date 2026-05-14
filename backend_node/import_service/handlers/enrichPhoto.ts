import type { S3Event } from "aws-lambda";
import { DetectLabelsCommand, RekognitionClient } from "@aws-sdk/client-rekognition";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const rekognition = new RekognitionClient({});
const dynamoDb = new DynamoDBClient({});

const getPhotoEnrichmentTableName = (): string => {
  const tableName = process.env.PHOTO_ENRICHMENT_TABLE_NAME;
  if (!tableName) {
    throw new Error("PHOTO_ENRICHMENT_TABLE_NAME is not set");
  }

  return tableName;
};

const decodeS3Key = (key: string): string => decodeURIComponent(key.replace(/\+/g, " "));

const extractPointId = (key: string): string | null => {
  const keyParts = key.split("/");
  if (keyParts.length < 3 || keyParts[0] !== "uploads") {
    return null;
  }

  return keyParts[1] || null;
};

export const handler = async (event: S3Event): Promise<void> => {
  const photoEnrichmentTableName = getPhotoEnrichmentTableName();

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const photoKey = decodeS3Key(record.s3.object.key);
    const pointId = extractPointId(photoKey);

    if (!pointId) {
      console.log("Skipping object outside uploads prefix", { bucketName, photoKey });
      continue;
    }

    const response = await rekognition.send(
      new DetectLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucketName,
            Name: photoKey,
          },
        },
        MaxLabels: 10,
        MinConfidence: 70,
      }),
    );

    const labels = (response.Labels ?? []).flatMap((label) => {
      if (!label.Name || typeof label.Confidence !== "number") {
        return [];
      }

      return [{
        name: label.Name,
        confidence: label.Confidence,
      }];
    });

    await dynamoDb.send(
      new PutItemCommand({
        TableName: photoEnrichmentTableName,
        Item: {
          pointId: { S: pointId },
          photoKey: { S: photoKey },
          labels: {
            L: labels.map((label) => ({
              M: {
                name: { S: label.name },
                confidence: { N: label.confidence.toString() },
              },
            })),
          },
          enrichedAt: { S: new Date().toISOString() },
        },
      }),
    );

    console.log("Stored photo enrichment", {
      bucketName,
      photoKey,
      pointId,
      labelCount: labels.length,
    });
  }
};
