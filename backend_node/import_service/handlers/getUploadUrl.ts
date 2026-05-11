import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

// TODO Module 5: read pointId + fileName from query params
// Generate an S3 presigned PUT URL for key `uploads/{pointId}/{fileName}`
// Expiry: 300 seconds. Return { url } as JSON.
export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  throw new Error("Not implemented");
};
