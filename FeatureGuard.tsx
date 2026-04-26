import React from "react";

type FeatureGuardProps = {
  enabled: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ enabled, fallback, children }) => {
  if (!enabled) {
    return <>{fallback ?? <span>Available in next modules</span>}</>;
  }

  return <>{children}</>;
};
