export const DEFAULT_CONFIG = {
  version: 1,
  mode: 4,
  predictions: [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
    id,
    label: `Prediction ${id}`,
    text: id <= 4 ? `Заглушка ${id}` : "",
    imageDataUrl: ""
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
    motionThreshold: 3.5,
    confidenceThreshold: 0.6
  },
  ui: {
    showEnableSensorsButton: true,
    showClearCanvasButton: true,
    showResetHiddenStateButton: true,
    enableDebugMode: false
  }
};