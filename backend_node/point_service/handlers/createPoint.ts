import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

// TODO Module 4: parse body, write to DynamoDB points + point_metadata tables in a transaction
export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  throw new Error("Not implemented");
};
