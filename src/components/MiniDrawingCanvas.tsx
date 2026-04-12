import { useEffect } from "react";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";
import type { DrawingTool } from "../hooks/useDrawingCanvas";
import type { DrawingStroke, PredictionDrawing } from "../types/config";

type Props = {
  value: string;
  drawing: PredictionDrawing;
  color: string;
  tool: DrawingTool;
  onChange: (dataUrl: string) => void;
  onDrawingChange: (drawing: PredictionDrawing) => void;
  height?: number;
};

function pushStroke(prev: PredictionDrawing, stroke: DrawingStroke): PredictionDrawing {
  const strokes = Array.isArray(prev?.strokes) ? prev.strokes : [];
  return { v: 1, aspect: prev?.aspect, strokes: [...strokes, stroke] };
}

export function MiniDrawingCanvas({ value, drawing, color, tool, onChange, onDrawingChange, height = 160 }: Props) {
  const { canvasRef, bindPointerHandlers, clear, exportDataUrl, drawStrokes, drawFromDataUrl } = useDrawingCanvas({
    color,
    tool,
    lineWidth: 5,
    eraserWidth: 28,
    onStrokeComplete: (stroke) => {
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const aspect = rect && rect.height > 0 ? rect.width / rect.height : drawing?.aspect;
      onDrawingChange({ ...pushStroke({ ...drawing, aspect }, stroke), aspect });
    }
  });

  useEffect(() => {
    const strokes = Array.isArray(drawing?.strokes) ? drawing.strokes : [];
    if (strokes.length > 0) {
      drawStrokes(drawing, { clear: true }).catch(() => undefined);
      return;
    }
    if (value) {
      drawFromDataUrl(value, { clear: true }).catch(() => undefined);
      return;
    }
    clear();
  }, [clear, drawFromDataUrl, drawStrokes, drawing, value]);

  const commit = () => {
    const url = exportDataUrl();
    if (url) onChange(url);
  };

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "4 / 3",
        minHeight: height,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.08)",
        background: "#fff",
        touchAction: "none"
      }}
    >
      <canvas
        ref={canvasRef}
        {...bindPointerHandlers}
        onPointerUp={(e) => {
          bindPointerHandlers.onPointerUp?.(e as any);
          commit();
        }}
        onPointerCancel={(e) => {
          bindPointerHandlers.onPointerCancel?.(e as any);
          commit();
        }}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
