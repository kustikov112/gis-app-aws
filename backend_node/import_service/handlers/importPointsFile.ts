import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({});

const jsonResponse = (
  statusCode: number,
  payload: unknown,
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const getBucketName = (): string => {
  const bucketName = process.env.IMPORT_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("IMPORT_BUCKET_NAME is not set");
  }

  return bucketName;
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const fileName = event.queryStringParameters?.fileName?.trim();
    if (!fileName) {
      return jsonResponse(400, { error: "fileName is required" });
    }

    if (!fileName.toLowerCase().endsWith(".csv")) {
      return jsonResponse(400, { error: "fileName must end with .csv" });
    }

    const bucketName = getBucketName();
    const key = `uploaded/${fileName}`;
    const url = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
      { expiresIn: 300 },
    );

    return jsonResponse(200, { url, key });
  } catch {
    return jsonResponse(500, { error: "Internal server error" });
  }
};
