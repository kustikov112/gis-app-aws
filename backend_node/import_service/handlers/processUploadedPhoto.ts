import type { S3Event } from "aws-lambda";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient({});

const getTableName = (): string => {
  const tableName = process.env.POINTS_TABLE_NAME;
  if (!tableName) {
    throw new Error("POINTS_TABLE_NAME is not set");
  }

  return tableName;
};

const decodeS3Key = (key: string): string => decodeURIComponent(key.replace(/\+/g, " "));

const encodeS3Key = (key: string): string => key.split("/").map(encodeURIComponent).join("/");

export const handler = async (event: S3Event): Promise<void> => {
  const tableName = getTableName();
  const region = process.env.AWS_REGION ?? "eu-central-1";

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const key = decodeS3Key(record.s3.object.key);
    const keyParts = key.split("/");

    if (keyParts.length < 3 || keyParts[0] !== "uploads") {
      console.log("Skipping object outside uploads prefix", { bucketName, key });
      continue;
    }

    const pointId = keyParts[1];
    const photoUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${encodeS3Key(key)}`;

    await dynamoDb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: {
          id: { S: pointId },
        },
        UpdateExpression: "SET photoUrl = :photoUrl",
        ExpressionAttributeValues: {
          ":photoUrl": { S: photoUrl },
        },
      }),
    );

    console.log("Updated point photo", {
      bucketName,
      key,
      pointId,
      photoUrl,
    });
  }
};
