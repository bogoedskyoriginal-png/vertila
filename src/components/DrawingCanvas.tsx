import { useEffect } from "react";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";
import type { DrawingTool } from "../hooks/useDrawingCanvas";
import type { DrawingStroke, PredictionDrawing } from "../types/config";

export type DrawingCanvasApi = {
  clear: () => void;
  exportDataUrl: () => string | null;
  drawStrokes: (drawing: PredictionDrawing, opts?: { clear?: boolean; fit?: "contain" | "cover" }) => Promise<void>;
  drawFromDataUrl: (dataUrl: string, opts?: { clear?: boolean }) => Promise<void>;
};

type Props = {
  color: string;
  tool: DrawingTool;
  lineWidth?: number;
  eraserWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  onReady?: (api: DrawingCanvasApi) => void;
  onStrokeEnd?: () => void;
  onStrokeComplete?: (stroke: DrawingStroke) => void;
};

export function DrawingCanvas({
  color,
  tool,
  lineWidth,
  eraserWidth,
  className,
  style,
  onReady,
  onStrokeEnd,
  onStrokeComplete
}: Props) {
  const { canvasRef, bindPointerHandlers, clear, exportDataUrl, drawStrokes, drawFromDataUrl } = useDrawingCanvas({
    color,
    tool,
    lineWidth,
    eraserWidth,
    onStrokeComplete
  });

  useEffect(() => {
    onReady?.({ clear, exportDataUrl, drawStrokes, drawFromDataUrl });
  }, [clear, drawFromDataUrl, exportDataUrl, onReady, drawStrokes]);

  return (
    <div
      className={className ?? "card"}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
        ...(style ?? {})
      }}
    >
      <canvas
        ref={canvasRef}
        {...bindPointerHandlers}
        onPointerUp={(e) => {
          bindPointerHandlers.onPointerUp?.(e as any);
          onStrokeEnd?.();
        }}
        onPointerCancel={(e) => {
          bindPointerHandlers.onPointerCancel?.(e as any);
          onStrokeEnd?.();
        }}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          background: "#fff"
        }}
      />
    </div>
  );
}

