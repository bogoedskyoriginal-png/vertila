import { useEffect } from "react";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";

type Props = {
  color: string;
  lineWidth?: number;
  onReady?: (api: { clear: () => void }) => void;
};

export function DrawingCanvas({ color, lineWidth, onReady }: Props) {
  const { canvasRef, bindPointerHandlers, clear } = useDrawingCanvas({ color, lineWidth });

  useEffect(() => {
    onReady?.({ clear });
  }, [clear, onReady]);

  return (
    <div
      className="card"
      style={{
        width: "100%",
        height: "calc(100vh - 24px - 64px)",
        overflow: "hidden",
        touchAction: "none"
      }}
    >
      <canvas
        ref={canvasRef}
        {...bindPointerHandlers}
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
