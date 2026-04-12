import type { Direction4, FlipSpeed, PredictionId } from "./config";

export type MotionFlowState =
  | "idle"
  | "requestingPermission"
  | "countdown"
  | "calibrating"
  | "armed"
  | "preview"
  | "detecting"
  | "locked";

export type FlipResult = {
  side: Direction4;
  speed: FlipSpeed;
  durationMs: number;
  predictionId: PredictionId;
};

export type MotionSample = {
  t: number;
  x: number;
  y: number;
  z: number;
};
