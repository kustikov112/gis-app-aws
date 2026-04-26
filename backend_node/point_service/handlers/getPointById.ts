import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const pointId = event.pathParameters?.pointId;
  if (!pointId) {
    return { statusCode: 400, body: JSON.stringify({ message: "pointId is required" }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: pointId,
      title: "Starter Point",
      description: "Replace with DynamoDB lookup in module 4",
      latitude: 0,
      longitude: 0,
    }),
  };
};
