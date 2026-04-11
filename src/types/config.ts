export type AppMode = 4 | 8;

export type Direction4 = "top" | "right" | "bottom" | "left";
export type FlipSpeed = "slow" | "fast";

export type PredictionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PredictionItem = {
  id: PredictionId;
  label: string;
  // PNG data URL. Empty string = not set yet.
  imageDataUrl: string;
};

export type MotionConfig = {
  // How long to sample a "resting" baseline after arming (ms).
  calibrationMs: number;
  // Delta magnitude threshold to start detecting a flip (m/s^2-ish units from devicemotion).
  motionThreshold: number;
  // Flip duration <= fastFlipMs is considered "fast" (for mode=8).
  fastFlipMs: number;
};

export type AppConfig = {
  version: 2;
  mode: AppMode;
  predictions: PredictionItem[];
  motion: MotionConfig;
};

