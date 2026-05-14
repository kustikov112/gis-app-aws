import { BatchWriteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

const tableName = process.env.POINTS_TABLE_NAME;

if (!tableName) {
  throw new Error("POINTS_TABLE_NAME environment variable is required");
}

const dynamoDb = new DynamoDBClient({});

const seedPoints = [
  {
    id: "19ba3d6a-f8ed-491b-a192-0a33b71b38c4",
    title: "Eiffel Tower",
    description: "Iconic iron lattice tower in Paris.",
    latitude: 48.8584,
    longitude: 2.2945,
    createdAt: "2025-01-15T10:00:00Z",
    tags: ["landmark", "paris"],
  },
  {
    id: "ed7d1f23-5a4a-402d-9c58-45ef2bb7cd11",
    title: "Brandenburg Gate",
    description: "Historic 18th-century gate in Berlin.",
    latitude: 52.5163,
    longitude: 13.3777,
    createdAt: "2025-01-16T09:30:00Z",
    tags: ["berlin", "landmark"],
  },
  {
    id: "dce8dd4c-e76f-43b9-8e9f-8d0a5b4a2b55",
    title: "Colosseum",
    description: "Ancient amphitheatre in the center of Rome.",
    latitude: 41.8902,
    longitude: 12.4922,
    createdAt: "2025-01-17T08:15:00Z",
    tags: ["rome", "history"],
  },
  {
    id: "1d9b8702-fd10-4ce4-b749-7b8e98a6f1a0",
    title: "Big Ben",
    description: "Clock tower next to the Palace of Westminster.",
    latitude: 51.5007,
    longitude: -0.1246,
    createdAt: "2025-01-18T11:45:00Z",
    tags: ["london", "clocktower"],
  },
  {
    id: "f1d4c6aa-9a5f-4e62-b2c2-e51cd4a48f38",
    title: "Plaza Mayor",
    description: "Historic central square in Madrid.",
    latitude: 40.4154,
    longitude: -3.7074,
    createdAt: "2025-01-19T13:20:00Z",
    tags: ["madrid", "square"],
  },
];

const toItem = (point) => ({
  id: { S: point.id },
  title: { S: point.title },
  description: { S: point.description },
  latitude: { N: point.latitude.toString() },
  longitude: { N: point.longitude.toString() },
  createdAt: { S: point.createdAt },
  tags: { L: point.tags.map((tag) => ({ S: tag })) },
});

const response = await dynamoDb.send(
  new BatchWriteItemCommand({
    RequestItems: {
      [tableName]: seedPoints.map((point) => ({
        PutRequest: {
          Item: toItem(point),
        },
      })),
    },
  }),
);

const unprocessedCount = response.UnprocessedItems?.[tableName]?.length ?? 0;

if (unprocessedCount > 0) {
  throw new Error(`Seed completed with ${unprocessedCount} unprocessed items`);
}

console.log(`Seeded ${seedPoints.length} points into ${tableName}`);