import type { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from "aws-lambda";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { persistPoint, type CreatePointInput } from "./pointStore.js";

type QueuePointMessage = {
  title: unknown;
  description: unknown;
  latitude: unknown;
  longitude: unknown;
};

const snsClient = new SNSClient({});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const getTopicArn = (): string => {
  const topicArn = process.env.POINTS_IMPORT_TOPIC_ARN;
  if (!topicArn) {
    throw new Error("POINTS_IMPORT_TOPIC_ARN is not set");
  }

  return topicArn;
};

const parseMessage = (body: string): CreatePointInput => {
  const parsed = JSON.parse(body) as QueuePointMessage;

  if (
    typeof parsed.title !== "string" ||
    parsed.title.trim() === "" ||
    typeof parsed.description !== "string" ||
    parsed.description.trim() === "" ||
    !isFiniteNumber(parsed.latitude) ||
    !isFiniteNumber(parsed.longitude)
  ) {
    throw new Error("Invalid point message schema");
  }

  return {
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    latitude: parsed.latitude,
    longitude: parsed.longitude,
  };
};

const publishBatchSummary = async (createdCount: number): Promise<void> => {
  if (createdCount <= 0) {
    return;
  }

  await snsClient.send(
    new PublishCommand({
      TopicArn: getTopicArn(),
      Subject: "Points import batch processed",
      Message: `Successfully created ${createdCount} point(s) from SQS batch`,
      MessageAttributes: {
        count: {
          DataType: "Number",
          StringValue: String(createdCount),
        },
      },
    }),
  );
};

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  let createdCount = 0;

  for (const record of event.Records) {
    try {
      const input = parseMessage(record.body);
      await persistPoint(input);
      createdCount += 1;
    } catch (error) {
      console.log("Failed to process SQS message", {
        messageId: record.messageId,
        error,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  await publishBatchSummary(createdCount);

  return { batchItemFailures };
};
