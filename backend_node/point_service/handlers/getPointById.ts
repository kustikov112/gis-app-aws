import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { jsonResponse } from "./http.js";
import { findPointById, withSignedPhotoUrl } from "./pointStore.js";

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const pointId = event.pathParameters?.pointId;
  console.log("getPointById request", {
    pointId,
    requestId: event.requestContext.requestId,
  });

  if (!pointId) {
    return jsonResponse(400, { error: "pointId is required" });
  }

  try {
    const point = await findPointById(pointId);
    if (!point) {
      return jsonResponse(404, { error: `Point with id '${pointId}' not found` });
    }

    const pointWithSignedPhotoUrl = await withSignedPhotoUrl(point);
    return jsonResponse(200, pointWithSignedPhotoUrl);
  } catch {
    return jsonResponse(500, { error: "Internal server error" });
  }
};
