import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { jsonResponse } from "./http.js";
import { listPoints } from "./pointStore.js";

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    console.log("getPointsList request", { requestId: event.requestContext.requestId });

    const points = await listPoints();
    return jsonResponse(200, points);
  } catch {
    return jsonResponse(500, { error: "Internal server error" });
  }
};
