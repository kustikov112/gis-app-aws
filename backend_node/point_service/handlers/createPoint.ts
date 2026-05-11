import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { jsonResponse } from "./http.js";
import { persistPoint, type CreatePointInput } from "./pointStore.js";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseCreatePointBody = (body: string | undefined): CreatePointInput | null => {
  if (!body) {
    return null;
  }

  const parsed = JSON.parse(body) as Record<string, unknown>;
  const { title, description, latitude, longitude } = parsed;

  if (
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof description !== "string" ||
    description.trim() === "" ||
    !isFiniteNumber(latitude) ||
    !isFiniteNumber(longitude)
  ) {
    return null;
  }

  return {
    title: title.trim(),
    description: description.trim(),
    latitude,
    longitude,
  };
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("createPoint request", {
    requestId: event.requestContext.requestId,
    body: event.body,
  });

  try {
    const payload = parseCreatePointBody(event.body ?? undefined);
    if (!payload) {
      return jsonResponse(400, {
        error: "title, description, latitude, and longitude are required",
      });
    }

    const point = await persistPoint(payload);
    return jsonResponse(201, point);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonResponse(400, { error: "Request body must be valid JSON" });
    }

    return jsonResponse(500, { error: "Internal server error" });
  }
};
