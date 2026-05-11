import React from "react";
import type { FeatureFlags, Point } from "../types";
import { DisabledFeature } from "./DisabledFeature";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";

// Configure Leaflet marker icons
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

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

const MapComponent: React.FC<{ points: Point[] }> = ({ points }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);

  React.useEffect(() => {
    if (!mapRef.current) return;

    const center: [number, number] = points.length > 0
      ? [points[0].latitude, points[0].longitude]
      : [48.0, 10.0];

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView([center[0], center[1]], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    // Clear existing markers
    mapInstanceRef.current.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker) mapInstanceRef.current!.removeLayer(layer);
    });

    // Add all points as markers
    points.forEach((point) => {
      L.marker([point.latitude, point.longitude])
        .bindPopup(`<strong>${point.title}</strong><br>${point.description}`)
        .addTo(mapInstanceRef.current!);
    });

    return () => {
      // Cleanup is handled by keeping the map instance
    };
  }, [points]);

  return (
    <div
      ref={mapRef}
      style={{
        height: "360px",
        width: "100%",
        borderRadius: "12px",
        border: "1px solid #d0d0d0",
        overflow: "hidden",
      }}
    />
  );
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
          <MapComponent points={points} />
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
              {point.createdAt ? <div>Created: {point.createdAt}</div> : null}
              {point.tags?.length ? <div>Tags: {point.tags.join(", ")}</div> : null}
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
