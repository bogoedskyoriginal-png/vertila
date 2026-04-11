export type AppMode = 4 | 8;

export type Direction4 = "top" | "right" | "bottom" | "left";

export type PredictionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PredictionItem = {
  id: PredictionId;
  label: string;
  text: string;
};

export type Mapping4 = Record<Direction4, PredictionId>;

// Placeholder-ready структура для будущего 8-направленного mapping/classification.
// В MVP классификация остается 4-направленной, а mode=8 использует graceful fallback.
export type Mapping8 = {
  experimental: true;
  // Например, позже можно описать ключи как "topLeft" | "top" | "topRight" | ...
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
