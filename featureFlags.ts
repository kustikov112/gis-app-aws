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

export const defaultFlags: FeatureFlags = {
  module: 2,
  ui: {
    showMap: true,
    enableCreatePoint: false,
    enableUploadPhoto: false,
    enableCsvImport: false,
    enableAuthButtons: false,
    showAiLabels: false,
  },
  api: {
    enablePointsApi: false,
    pointsSource: "mock",
  },
  security: {
    enableBasicAuthForImport: false,
    enableCognito: false,
    requireAuthForCreatePoint: false,
  },
  async: {
    enableSqsPipeline: false,
    enableSnsNotifications: false,
  },
  ai: {
    enableRekognitionLabels: false,
    enableModeration: false,
    enableTextDetection: false,
  },
};

export const canCreatePoint = (flags: FeatureFlags, isAuthenticated: boolean): boolean => {
  if (!flags.ui.enableCreatePoint) {
    return false;
  }

  if (flags.security.requireAuthForCreatePoint) {
    return isAuthenticated;
  }

  return true;
};
