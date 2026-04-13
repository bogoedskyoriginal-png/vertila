export const DEFAULT_CONFIG = {
  version: 2,
  mode: 4,
  outputMode: "drawings",
  linkUiTheme: "dark",
  // 1..4: slow top/right/bottom/left
  // 5..8: fast top/right/bottom/left
  predictions: [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
    id,
    label:
      id === 1
        ? "Top (slow)"
        : id === 2
          ? "Right (slow)"
          : id === 3
            ? "Bottom (slow)"
            : id === 4
              ? "Left (slow)"
              : id === 5
                ? "Top (fast)"
                : id === 6
                  ? "Right (fast)"
                  : id === 7
                    ? "Bottom (fast)"
                    : "Left (fast)",
    imageDataUrl: "",
    linkQuery: "",
    drawing: { v: 1, aspect: 9 / 16, strokes: [] }
  })),
  motion: {
    countdownSeconds: 5,
    calibrationMs: 350,
    motionThreshold: 3.5,
    fastFlipMs: 450,
    mode8Strategy: "tilts",
    speedSensitivity: "medium"
  }
};
