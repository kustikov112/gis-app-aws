import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { MOCK_POINTS } from "./mockPoints.js";

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const pointId = event.pathParameters?.pointId;
  if (!pointId) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "pointId is required" }),
    };
  }

  const point = MOCK_POINTS.find((candidate) => candidate.id === pointId);
  if (!point) {
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: `Point with id '${pointId}' not found` }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(point),
  };
};
