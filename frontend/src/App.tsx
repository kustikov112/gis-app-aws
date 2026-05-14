import React, { useEffect, useState } from "react";
import { createApiClient } from "./api/client";
import { MapPointsPage } from "./components/MapPointsPage";
import type { FeatureFlags, Point } from "./types";
import featureFlags from "./config/featureFlags.json";

const ID_TOKEN_KEY = "id_token";
const ACCESS_TOKEN_KEY = "access_token";

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = atob(padded);
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isTokenExpired = (token?: string): boolean => {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") {
    return true;
  }

  return Date.now() >= exp * 1000;
};

const mockPoints: Point[] = [
  { id: "1", title: "Paris", description: "Starter point", latitude: 48.8566, longitude: 2.3522 },
  { id: "2", title: "London", description: "Starter point", latitude: 51.5072, longitude: -0.1276 },
];

export const App: React.FC = () => {
  const [flags] = useState<FeatureFlags>(featureFlags as FeatureFlags);
  const [points, setPoints] = useState<Point[]>(flags.api.pointsSource === "mock" ? mockPoints : []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const api = createApiClient({
    pointsBaseUrl: import.meta.env.VITE_POINTS_API_URL,
    importBaseUrl: import.meta.env.VITE_IMPORT_API_URL,
  });

  const cognitoDomain: string | undefined = import.meta.env.VITE_COGNITO_DOMAIN;
  const cognitoClientId: string | undefined = import.meta.env.VITE_COGNITO_CLIENT_ID;
  const cognitoRedirectUri: string | undefined = import.meta.env.VITE_COGNITO_REDIRECT_URI;

  const syncAuthState = () => {
    const idToken = localStorage.getItem(ID_TOKEN_KEY) || undefined;
    if (!idToken || isTokenExpired(idToken)) {
      localStorage.removeItem(ID_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setIsAuthenticated(false);
      setUserEmail(undefined);
      return;
    }

    const payload = decodeJwtPayload(idToken);
    const email = typeof payload?.email === "string" ? payload.email : undefined;

    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const refreshPoints = async () => {
    if (!flags.api.enablePointsApi) {
      return;
    }
    try {
      const items = await api.getPoints();
      if (!flags.ai.enableRekognitionLabels || !flags.ui.showAiLabels) {
        setPoints(items);
        return;
      }

      const pointsWithDetails = await Promise.all(
        items.map(async (point) => {
          if (!point.photoUrl) {
            return point;
          }

          try {
            return await api.getPointById(point.id);
          } catch {
            return point;
          }
        }),
      );

      setPoints(pointsWithDetails);
    } catch {
      setPoints(flags.api.pointsSource === "mock" ? mockPoints : []);
    }
  };

  useEffect(() => {
    refreshPoints();
  }, [flags]);

  useEffect(() => {
    syncAuthState();
  }, [flags.security.enableCognito]);

  useEffect(() => {
    if (!flags.security.enableCognito || !cognitoDomain || !cognitoClientId || !cognitoRedirectUri) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const code = currentUrl.searchParams.get("code");
    if (!code) {
      return;
    }

    const exchangeCodeForTokens = async () => {
      try {
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          client_id: cognitoClientId,
          code,
          redirect_uri: cognitoRedirectUri,
        });

        const response = await fetch(`${cognitoDomain}/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (!response.ok) {
          throw new Error(`Failed to exchange auth code: ${response.status}`);
        }

        const data = await response.json() as {
          id_token?: string;
          access_token?: string;
        };

        if (!data.id_token || !data.access_token) {
          throw new Error("Cognito token response is missing tokens");
        }

        localStorage.setItem(ID_TOKEN_KEY, data.id_token);
        localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
        currentUrl.searchParams.delete("code");
        window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
        syncAuthState();
      } catch (error) {
        console.error(error);
        alert("Authentication failed. Please try logging in again.");
      }
    };

    void exchangeCodeForTokens();
  }, [flags.security.enableCognito, cognitoClientId, cognitoDomain, cognitoRedirectUri]);

  const handleLogin = () => {
    if (!cognitoDomain || !cognitoClientId || !cognitoRedirectUri) {
      alert("Cognito configuration is missing in frontend environment variables.");
      return;
    }

    const query = new URLSearchParams({
      client_id: cognitoClientId,
      response_type: "code",
      scope: "openid email profile",
      redirect_uri: cognitoRedirectUri,
    });

    window.location.href = `${cognitoDomain}/login?${query.toString()}`;
  };

  const handleLogout = () => {
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setIsAuthenticated(false);
    setUserEmail(undefined);

    if (!cognitoDomain || !cognitoClientId || !cognitoRedirectUri) {
      return;
    }

    const query = new URLSearchParams({
      client_id: cognitoClientId,
      logout_uri: cognitoRedirectUri,
    });

    window.location.href = `${cognitoDomain}/logout?${query.toString()}`;
  };

  const handleCreatePoint = async () => {
    const idToken = localStorage.getItem(ID_TOKEN_KEY) || undefined;
    const now = Date.now();
    const latitude = 50.45 + (now % 1000) / 100000;
    const longitude = 30.52 + (now % 1000) / 100000;

    await api.createPoint(
      {
        title: `Point ${new Date(now).toISOString()}`,
        description: "Created from frontend",
        latitude,
        longitude,
      },
      flags.security.enableCognito ? idToken : undefined,
    );

    await refreshPoints();
  };

  const handleUploadPhoto = async (pointId: string, file: File) => {
    const { url } = await api.getUploadUrl(pointId, file.name);
    const uploadResponse = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file to S3: ${uploadResponse.status}`);
    }

    // Give S3 trigger a moment to update DynamoDB, then refresh points.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await refreshPoints();
  };

  const handleImportCsv = async (file: File) => {
    const authToken = flags.security.enableBasicAuthForImport
      ? localStorage.getItem("authorization_token") || undefined
      : undefined;

    const { url } = await api.getImportUrl(file.name, authToken);
    const uploadResponse = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "text/csv",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload CSV to S3: ${uploadResponse.status}`);
    }
  };

  return (
    <MapPointsPage
      flags={flags}
      points={points}
      isAuthenticated={isAuthenticated}
      userEmail={userEmail}
      onCreatePoint={handleCreatePoint}
      onUploadPhoto={handleUploadPhoto}
      onImportCsv={handleImportCsv}
      onLogin={handleLogin}
      onLogout={handleLogout}
    />
  );
};
