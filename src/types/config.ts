export type AppMode = 4 | 8;

export type Direction4 = "top" | "right" | "bottom" | "left";
export type FlipSpeed = "slow" | "fast";

export type PredictionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type OutputMode = "drawings" | "links";

export type PredictionItem = {
  id: PredictionId;
  label: string;
  // PNG data URL. Empty string = not set yet.
  imageDataUrl: string;
  // Link-mode: query for Google Images (or full https:// URL).
  linkQuery?: string;
  // Vector strokes to render prediction at any size (prevents pixelation).
  drawing?: PredictionDrawing;
};

export type DrawingPoint = { x: number; y: number };

export type DrawingStroke = {
  tool: "pen" | "eraser";
  color: string;
  // Width in CSS pixels (will be converted to canvas px using DPR).
  width: number;
  points: DrawingPoint[];
};

export type PredictionDrawing = {
  v: 1;
  // Source canvas aspect ratio (width / height) at the time of drawing.
  // Used to render with "contain" scaling on different screen sizes to avoid stretching.
  aspect?: number;
  strokes: DrawingStroke[];
};

export type MotionConfig = {
  // Countdown before calibration/arming (seconds).
  countdownSeconds: number;
  // How long to sample a "resting" baseline after arming (ms).
  calibrationMs: number;
  // Delta magnitude threshold to start detecting a flip (m/s^2-ish units from devicemotion).
  motionThreshold: number;
  // Flip duration <= fastFlipMs is considered "fast" (for mode=8).
  fastFlipMs: number;
  // For mode=8: either distinguish outcomes by flip speed, or by 1/2 tilts.
  mode8Strategy: "speed" | "tilts";
};

export type AppConfig = {
  version: 2;
  mode: AppMode;
  outputMode: OutputMode;
  predictions: PredictionItem[];
  motion: MotionConfig;
};
