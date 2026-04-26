import React from "react";
import type { FeatureFlags, Point } from "../types";
import { DisabledFeature } from "./DisabledFeature";

type Props = {
  flags: FeatureFlags;
  points: Point[];
  isAuthenticated: boolean;
  userEmail?: string;
  onCreatePoint?: () => Promise<void>;
  onUploadPhoto?: (pointId: string, file: File) => Promise<void>;
  onImportCsv?: (file: File) => Promise<void>;
  onLogin?: () => void;
  onLogout?: () => void;
};

const DEFAULT_CENTER = {
  latitude: 50.4501,
  longitude: 30.5234,
};

const buildEmbedUrl = (point?: Point): string => {
  const center = point
    ? { latitude: point.latitude, longitude: point.longitude }
    : DEFAULT_CENTER;
  const delta = 0.35;
  const left = center.longitude - delta;
  const right = center.longitude + delta;
  const top = center.latitude + delta;
  const bottom = center.latitude - delta;
  const marker = `${center.latitude},${center.longitude}`;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${marker}`;
};

export const MapPointsPage: React.FC<Props> = ({
  flags,
  points,
  isAuthenticated,
  userEmail,
  onCreatePoint,
  onUploadPhoto,
  onImportCsv,
  onLogin,
  onLogout,
}) => {
  const canCreatePoint = flags.ui.enableCreatePoint && (!flags.security.requireAuthForCreatePoint || isAuthenticated);
  const canUploadPhoto = flags.ui.enableUploadPhoto && (!flags.security.enableCognito || isAuthenticated);
  const mapUrl = buildEmbedUrl(points[0]);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const csvInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    if (!points.length) {
      alert("Create at least one point before uploading a photo.");
      return;
    }
    uploadInputRef.current?.click();
  };

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUploadPhoto) {
      return;
    }

    const pointId = points[0]?.id;
    if (!pointId) {
      return;
    }

    try {
      await onUploadPhoto(pointId, file);
      alert("Photo uploaded successfully.");
    } catch {
      alert("Photo upload failed.");
    }
  };

  const handleCsvChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onImportCsv) {
      return;
    }

    try {
      await onImportCsv(file);
      alert("CSV uploaded. Parser Lambda will process it shortly.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "CSV import upload failed.");
    }
  };

  return (
    <main>
      <h1>MapPoints</h1>
      {flags.ui.enableAuthButtons ? (
        <section style={{ marginTop: 12 }}>
          {isAuthenticated ? (
            <>
              <span>Logged in as {userEmail || "user"}</span>
              <span style={{ marginInline: 8 }} />
              <button onClick={onLogout}>Logout</button>
            </>
          ) : (
            <button onClick={onLogin}>Login</button>
          )}
        </section>
      ) : null}
      {flags.ui.showMap ? (
        <section style={{ marginTop: 12 }}>
          <div style={{ overflow: "hidden", border: "1px solid #d0d0d0", borderRadius: 12 }}>
            <iframe
              title="OpenStreetMap"
              src={mapUrl}
              style={{ border: 0, width: "100%", minHeight: 360 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            Map data from <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>
          </div>
        </section>
      ) : null}
      <section style={{ marginTop: 16 }}>
        {canCreatePoint ? <button onClick={() => void onCreatePoint?.()}>Add Point</button> : <DisabledFeature label="Add Point" />}
        <div />
        {canUploadPhoto ? (
          <>
            <button onClick={handleUploadClick}>Upload Photo</button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleUploadChange}
            />
          </>
        ) : (
          <DisabledFeature label="Upload Photo" />
        )}
        <div />
        {flags.ui.enableCsvImport ? (
          <>
            <button onClick={() => csvInputRef.current?.click()}>Import CSV</button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleCsvChange}
            />
          </>
        ) : (
          <DisabledFeature label="Import CSV" />
        )}
      </section>
      <section style={{ marginTop: 16 }}>
        <h2>Points</h2>
        <ul>
          {points.map((point) => (
            <li key={point.id}>
              <strong>{point.title}</strong> ({point.latitude}, {point.longitude})
              {point.photoUrl ? (
                <div>
                  <a href={point.photoUrl} target="_blank" rel="noreferrer">
                    Open photo
                  </a>
                </div>
              ) : null}
              {flags.ui.showAiLabels && point.aiLabels?.length ? (
                <div>{point.aiLabels.map((label) => label.name).join(", ")}</div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};
