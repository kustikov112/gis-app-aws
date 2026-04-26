import React from "react";

export const DisabledFeature: React.FC<{ label: string }> = ({ label }) => {
  return <span style={{ opacity: 0.65 }}>{label} (Available in next modules)</span>;
};
