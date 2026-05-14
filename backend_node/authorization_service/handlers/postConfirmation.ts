import type { PostConfirmationTriggerEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDb = new DynamoDBClient({});

const getUsersTableName = (): string => {
  const tableName = process.env.USERS_TABLE_NAME;
  if (!tableName) {
    throw new Error("USERS_TABLE_NAME is not set");
  }

  return tableName;
};

export const handler = async (
  event: PostConfirmationTriggerEvent,
): Promise<PostConfirmationTriggerEvent> => {
  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;

  if (!userId || !email) {
    console.log("Skipping user persistence due to missing attributes", {
      userId,
      email,
    });
    return event;
  }

  await dynamoDb.send(
    new PutItemCommand({
      TableName: getUsersTableName(),
      Item: {
        userId: { S: userId },
        email: { S: email },
        createdAt: { S: new Date().toISOString() },
      },
    }),
  );

  return event;
};
