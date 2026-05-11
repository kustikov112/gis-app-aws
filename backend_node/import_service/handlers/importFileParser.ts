// TODO Module 5: triggered by S3 ObjectCreated on uploaded/ prefix
// Read the CSV from S3, parse each row, log to CloudWatch
// TODO Module 6: send each parsed row as an SQS message to pointsImportQueue
export const handler = async (_event: unknown): Promise<void> => {
  throw new Error("Not implemented");
};

// Placeholder so the file compiles — remove once implemented
if (false) {
      continue;
    }
    await importFileParserToQueue(JSON.parse(record.body));
  }
};
