import { useEffect } from "react";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";
import type { DrawingTool } from "../hooks/useDrawingCanvas";

export type DrawingCanvasApi = {
  clear: () => void;
  exportDataUrl: () => string | null;
  drawStrokes: (drawing: import("../types/config").PredictionDrawing, opts?: { clear?: boolean }) => Promise<void>;
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
};

export function DrawingCanvas({
  color,
  tool,
  lineWidth,
  eraserWidth,
  className,
  style,
  onReady,
  onStrokeEnd
}: Props) {
  const { canvasRef, bindPointerHandlers, clear, exportDataUrl, drawStrokes, drawFromDataUrl } = useDrawingCanvas({
    color,
    tool,
    lineWidth,
    eraserWidth
  });

  useEffect(() => {
    onReady?.({ clear, exportDataUrl, drawStrokes, drawFromDataUrl });
  }, [clear, drawFromDataUrl, exportDataUrl, onReady, drawStrokes]);

  return (
    <div
      className={className ?? "card"}
      style={{
        width: "100%",
        height: "calc(100vh - 24px - 64px)",
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
