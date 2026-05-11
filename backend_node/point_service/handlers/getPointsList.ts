import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { jsonResponse } from "./http.js";
import { listPoints, withSignedPhotoUrls } from "./pointStore.js";

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    console.log("getPointsList request", { requestId: event.requestContext.requestId });

    const points = await listPoints();
    const pointsWithSignedPhotoUrls = await withSignedPhotoUrls(points);
    return jsonResponse(200, pointsWithSignedPhotoUrls);
  } catch {
    return jsonResponse(500, { error: "Internal server error" });
  }
};
