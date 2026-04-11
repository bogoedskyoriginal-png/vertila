import type { AppConfig, PredictionId } from "../types/config";

function predictionLabel(id: PredictionId) {
  return `Prediction ${id}`;
}

export const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  mode: 4,
  predictions: ([1, 2, 3, 4, 5, 6, 7, 8] as const).map((id) => ({
    id,
    label: predictionLabel(id),
    text: id <= 4 ? `Заглушка ${id}` : ""
  })),
  mapping4: {
    top: 1,
    right: 2,
    bottom: 3,
    left: 4
  },
  mapping8: {
    experimental: true,
    map: {}
  },
  motion: {
    countdownSeconds: 5,
    calibrationMs: 400,
    // MVP-дефолт: достаточно высокий порог, чтобы не ловить мелкий шум.
    motionThreshold: 3.5,
    // 0..1
    confidenceThreshold: 0.6
  },
  ui: {
    showEnableSensorsButton: true,
    showClearCanvasButton: true,
    showResetHiddenStateButton: true,
    enableDebugMode: false
  }
};
