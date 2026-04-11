import type { AppConfig } from "./config";

export type CreateShowResponse = {
  showCode?: string;
  // backward-compat (older deployments)
  showId?: string;
  adminKey: string;
};

export type PublicConfigResponse = {
  config: Omit<AppConfig, "predictions"> & {
    predictions: Array<{ id: number; label: string }>;
  };
  updatedAt: number;
};

export type AdminConfigResponse = {
  config: AppConfig;
  updatedAt: number;
};

export type SessionResponse = {
  sessionId: string;
};

export type RevealResponse = {
  predictionText: string;
  predictionImageDataUrl: string;
};