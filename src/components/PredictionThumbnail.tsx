import { useEffect } from "react";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";
import type { PredictionDrawing } from "../types/config";

type Props = {
  drawing: PredictionDrawing | null | undefined;
  imageDataUrl?: string;
  maxHeight?: number;
};

export function PredictionThumbnail({ drawing, imageDataUrl, maxHeight = 220 }: Props) {
  const { canvasRef, clear, drawStrokes, drawFromDataUrl } = useDrawingCanvas({
    color: "#111827",
    tool: "pen",
    lineWidth: 5,
    eraserWidth: 28
  });

  useEffect(() => {
    const d = drawing;
    if (d && d.v === 1 && Array.isArray(d.strokes) && d.strokes.length > 0) {
      drawStrokes(d, { clear: true, fit: "contain" }).catch(() => undefined);
      return;
    }
    if (imageDataUrl) {
      drawFromDataUrl(imageDataUrl, { clear: true }).catch(() => undefined);
      return;
    }
    clear();
  }, [clear, drawFromDataUrl, drawStrokes, drawing, imageDataUrl]);

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "9 / 16",
        maxHeight,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.08)",
        background: "#fff"
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none", touchAction: "none" }}
      />
    </div>
  );
}
