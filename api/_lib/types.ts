export type PredictionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type AppMode = 4 | 8;
export type Direction4 = "top" | "right" | "bottom" | "left";

export type PredictionItem = {
  id: PredictionId;
  label: string;
  text: string;
  imageDataUrl?: string;
};

export type Mapping4 = Record<Direction4, PredictionId>;

export type Mapping8 = {
  experimental: true;
  map: Record<string, PredictionId>;
};

export type MotionConfig = {
  countdownSeconds: number;
  calibrationMs: number;
  motionThreshold: number;
  confidenceThreshold: number;
};

export type UiConfig = {
  showEnableSensorsButton: boolean;
  showClearCanvasButton: boolean;
  showResetHiddenStateButton: boolean;
  enableDebugMode: boolean;
};

export type AppConfig = {
  version: 1;
  mode: AppMode;
  predictions: PredictionItem[];
  mapping4: Mapping4;
  mapping8?: Mapping8;
  motion: MotionConfig;
  ui: UiConfig;
};

export type StoredShow = {
  id: string;
  adminKey: string;
  config: AppConfig;
  createdAt: number;
  updatedAt: number;
};

export type PublicConfig = Omit<AppConfig, "predictions"> & {
  predictions: Array<Pick<PredictionItem, "id" | "label">>;
};