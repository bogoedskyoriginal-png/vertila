import { useEffect } from "react";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";
import type { DrawingTool } from "../hooks/useDrawingCanvas";

type Props = {
  value: string;
  color: string;
  tool: DrawingTool;
  onChange: (dataUrl: string) => void;
  height?: number;
};

export function MiniDrawingCanvas({ value, color, tool, onChange, height = 160 }: Props) {
  const { canvasRef, bindPointerHandlers, clear, exportDataUrl, drawFromDataUrl } = useDrawingCanvas({
    color,
    tool,
    lineWidth: 5,
    eraserWidth: 18
  });

  useEffect(() => {
    if (!value) {
      clear();
      return;
    }
    drawFromDataUrl(value, { clear: true }).catch(() => undefined);
  }, [clear, drawFromDataUrl, value]);

  const commit = () => {
    const url = exportDataUrl();
    if (url) onChange(url);
  };

  return (
    <div
      style={{
        width: "100%",
        height,
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
        onPointerUp={commit}
        onPointerCancel={commit}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}

