import type { Point } from "../types";

export type ApiConfig = {
  pointsBaseUrl?: string;
  importBaseUrl?: string;
};

export const createApiClient = (config: ApiConfig) => ({
  getPoints: async () => {
    if (!config.pointsBaseUrl) {
      return [];
    }
    const response = await fetch(`${config.pointsBaseUrl}/points`);
    if (!response.ok) {
      throw new Error(`Failed to load points: ${response.status}`);
    }
    return response.json() as Promise<Point[]>;
  },
  getPointById: async (pointId: string) => {
    if (!config.pointsBaseUrl) {
      throw new Error("Points API is disabled");
    }

    const response = await fetch(`${config.pointsBaseUrl}/points/${pointId}`);
    if (!response.ok) {
      throw new Error(`Failed to load point ${pointId}: ${response.status}`);
    }

    return response.json() as Promise<Point>;
  },
  createPoint: async (payload: unknown, idToken?: string) => {
    if (!config.pointsBaseUrl) {
      throw new Error("Points API is disabled");
    }
    const response = await fetch(`${config.pointsBaseUrl}/points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: idToken } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to create point: ${response.status}`);
    }
    return response.json();
  },
  getUploadUrl: async (pointId: string, fileName: string) => {
    if (!config.importBaseUrl) {
      throw new Error("Import API is disabled");
    }

    const query = new URLSearchParams({ pointId, fileName });
    const response = await fetch(`${config.importBaseUrl}/upload?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.status}`);
    }
    return response.json() as Promise<{ url: string; key: string; photoUrl?: string }>;
  },
  getImportUrl: async (fileName: string, authorizationToken?: string) => {
    if (!config.importBaseUrl) {
      throw new Error("Import API is disabled");
    }

    const query = new URLSearchParams({ fileName });
    const response = await fetch(`${config.importBaseUrl}/import?${query.toString()}`, {
      headers: {
        ...(authorizationToken ? { Authorization: `Basic ${authorizationToken}` } : {}),
      },
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized import request. Set localStorage.authorization_token.");
      }
      if (response.status === 403) {
        throw new Error("Forbidden import request. Check localStorage.authorization_token value.");
      }
      throw new Error(`Failed to get CSV import URL: ${response.status}`);
    }
    return response.json() as Promise<{ url: string; key: string }>;
  },
});
