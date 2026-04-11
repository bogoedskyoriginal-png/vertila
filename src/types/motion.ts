import type { Direction4, PredictionId } from "./config";

export type MotionFlowState =
  | "idle"
  | "requestingPermission"
  | "countdown"
  | "calibrating"
  | "armed"
  | "motionDetected"
  | "classified"
  | "locked";

export type SpectatorHiddenState = {
  classifiedDirection: Direction4 | null;
  classifiedResultIndex: PredictionId | null;
  selectedPredictionText: string | null;
  selectedPredictionImageDataUrl: string | null;
  confidenceScore: number | null;
  lockedAt: number | null;
};

export type MotionSample = {
  t: number;
  x: number;
  y: number;
  z: number;
};