import React from "react";
import { FeatureFlags } from "./featureFlags";

type Props = {
  flags: FeatureFlags;
  onChange: (next: FeatureFlags) => void;
};

const toggle = (
  flags: FeatureFlags,
  path: "ui.enableCreatePoint" | "ui.enableUploadPhoto" | "ui.enableCsvImport" | "ui.enableAuthButtons" | "ui.showAiLabels"
): FeatureFlags => {
  const [scope, key] = path.split(".") as ["ui", keyof FeatureFlags["ui"]];
  return {
    ...flags,
    [scope]: {
      ...flags[scope],
      [key]: !flags[scope][key],
    },
  };
};

export const FeatureFlagsPanel: React.FC<Props> = ({ flags, onChange }) => {
  return (
    <section style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <h3>Module feature checkboxes</h3>
      <label>
        <input
          type="checkbox"
          checked={flags.ui.enableCreatePoint}
          onChange={() => onChange(toggle(flags, "ui.enableCreatePoint"))}
        />
        Enable Create Point
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={flags.ui.enableUploadPhoto}
          onChange={() => onChange(toggle(flags, "ui.enableUploadPhoto"))}
        />
        Enable Upload Photo
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={flags.ui.enableCsvImport}
          onChange={() => onChange(toggle(flags, "ui.enableCsvImport"))}
        />
        Enable CSV Import
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={flags.ui.enableAuthButtons}
          onChange={() => onChange(toggle(flags, "ui.enableAuthButtons"))}
        />
        Enable Login/Logout UI
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={flags.ui.showAiLabels}
          onChange={() => onChange(toggle(flags, "ui.showAiLabels"))}
        />
        Show AI Labels
      </label>
    </section>
  );
};
