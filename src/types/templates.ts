import type { AppMode, OutputMode, PredictionId } from "./config";
import type { PredictionDrawing } from "./config";

export type PredictionTemplate = {
  id: string;
  name: string;
  createdAt: number;
  mode: AppMode;
  outputMode?: OutputMode;
  predictions: Array<{
    id: PredictionId;
    drawing: PredictionDrawing;
    imageDataUrl: string;
    linkQuery?: string;
  }>;
};
