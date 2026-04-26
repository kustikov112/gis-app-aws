// TODO Module 8: Cognito Post Confirmation trigger
// When a user confirms their email, write a record to the `users` DynamoDB table:
//   { userId: cognitoSub, email, createdAt }
// Return the event object unchanged (required by Cognito trigger contract)
export const handler = async (event: unknown): Promise<unknown> => {
  throw new Error("Not implemented");
  return event;
};
