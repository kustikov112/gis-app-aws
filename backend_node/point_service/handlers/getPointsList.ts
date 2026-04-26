import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

// TODO Module 3: return mock array of points
// TODO Module 4: replace with DynamoDB scan (join points + point_metadata tables)
export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  throw new Error("Not implemented");
};
