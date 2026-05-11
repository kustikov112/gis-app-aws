import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { MOCK_POINTS } from "./mockPoints.js";

// TODO Module 3: return mock array of points
// TODO Module 4: replace with DynamoDB scan (join points + point_metadata tables)
export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(MOCK_POINTS),
    };
  } catch {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
