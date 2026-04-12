import type { AppMode, PredictionId } from "./config";
import type { PredictionDrawing } from "./config";

export type PredictionTemplate = {
  id: string;
  name: string;
  createdAt: number;
  mode: AppMode;
  mode8Strategy?: "speed" | "tilts";
  outputMode?: "drawings" | "links";
  predictions: Array<{
    id: PredictionId;
    drawing: PredictionDrawing;
    imageDataUrl: string;
    linkQuery?: string;
  }>;
};

