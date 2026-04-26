// TODO Module 6: triggered by SQS pointsImportQueue (batchSize: 5)
// For each message: parse { title, description, latitude, longitude }
// Write to DynamoDB points + point_metadata tables (reuse createPoint logic)
// After processing the batch: publish a summary notification to SNS pointsImportTopic
//   Include a numeric message attribute `count` with the number of points created
export const handler = async (_event: unknown): Promise<void> => {
  throw new Error("Not implemented");
};
