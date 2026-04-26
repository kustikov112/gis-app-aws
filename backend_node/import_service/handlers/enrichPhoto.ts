// TODO Module 10: triggered by S3 ObjectCreated on uploads/ prefix
// Call Rekognition DetectLabels (MaxLabels: 10, MinConfidence: 70)
// Store results in photo_enrichment DynamoDB table:
//   { pointId, photoKey, labels: [{ name, confidence }], enrichedAt }
export const handler = async (_event: unknown): Promise<void> => {
  throw new Error("Not implemented");
};

// Placeholder so the file compiles — remove once implemented
if (false) {
    const key = record.s3?.object?.key;
    if (bucket && key) {
      await enrichPhoto(bucket, key);
    }
  }
};
