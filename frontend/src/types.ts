export type Point = {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrl?: string;
  aiLabels?: Array<{ name: string; confidence: number }>;
};

export type FeatureFlags = {
  module: number;
  ui: {
    showMap: boolean;
    enableCreatePoint: boolean;
    enableUploadPhoto: boolean;
    enableCsvImport: boolean;
    enableAuthButtons: boolean;
    showAiLabels: boolean;
  };
  api: {
    enablePointsApi: boolean;
    pointsSource: "mock" | "dynamodb";
  };
  security: {
    enableBasicAuthForImport: boolean;
    enableCognito: boolean;
    requireAuthForCreatePoint: boolean;
  };
  async: {
    enableSqsPipeline: boolean;
    enableSnsNotifications: boolean;
  };
  ai: {
    enableRekognitionLabels: boolean;
    enableModeration: boolean;
    enableTextDetection: boolean;
  };
};
