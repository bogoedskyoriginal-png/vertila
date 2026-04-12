import { useEffect, useMemo, useState } from "react";
import { DrawingCanvas } from "./DrawingCanvas";
import type { DrawingCanvasApi } from "./DrawingCanvas";
import type { DrawingTool } from "../hooks/useDrawingCanvas";
import type { DrawingStroke, PredictionDrawing } from "../types/config";
import { SpectatorToolbar } from "./SpectatorToolbar";

const COLORS = ["#111827", "#2563eb", "#b91c1c", "#16a34a", "#000000"];

type Props = {
  open: boolean;
  title: string;
  initial: PredictionDrawing;
  onClose: () => void;
  onSave: (drawing: PredictionDrawing, imageDataUrl: string) => void;
};

function pushStroke(prev: PredictionDrawing, stroke: DrawingStroke): PredictionDrawing {
  const strokes = Array.isArray(prev?.strokes) ? prev.strokes : [];
  return { v: 1, aspect: prev.aspect, strokes: [...strokes, stroke] };
}

export function PredictionEditorModal({ open, title, initial, onClose, onSave }: Props) {
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [draft, setDraft] = useState<PredictionDrawing>(initial);
  const [api, setApi] = useState<DrawingCanvasApi | null>(null);

  useEffect(() => {
    if (!open) return;
    setTool("pen");
    setColor(COLORS[0]);
    setDraft(initial);
  }, [initial, open]);

  useEffect(() => {
    if (!open) return;
    if (!api) return;
    const d = draft;
    if (d && d.v === 1 && Array.isArray(d.strokes) && d.strokes.length > 0) {
      api.drawStrokes(d, { clear: true, fit: "cover" }).catch(() => undefined);
    } else {
      api.clear();
    }
  }, [api, draft, open]);

  const hasStrokes = useMemo(() => (Array.isArray(draft?.strokes) ? draft.strokes.length > 0 : false), [draft]);
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 50,
        padding: 12,
        boxSizing: "border-box"
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          height: "100%",
          maxWidth: 720,
          margin: "0 auto",
          borderRadius: 18,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            padding: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid rgba(17,24,39,0.08)"
          }}
        >
          <div style={{ fontWeight: 900 }}>{title}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={onClose} style={{ minHeight: 44, borderRadius: 14 }}>
              Закрыть
            </button>
            <button
              className="btn btnPrimary"
              onClick={() => {
                const img = api?.exportDataUrl() ?? "";
                onSave(draft, img);
              }}
              style={{ minHeight: 44, borderRadius: 14 }}
            >
              Сохранить
            </button>
          </div>
        </div>

        <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative" }}>
          <div className="spectatorCanvasWrap" style={{ height: "100%", borderRadius: 0, border: "none", boxShadow: "none" }}>
            <DrawingCanvas
              color={color}
              tool={tool}
              onReady={setApi}
              className=""
              style={{ border: "none", boxShadow: "none", borderRadius: 0 }}
              onStrokeComplete={(stroke) => {
                setDraft((prev) => {
                  const aspect = prev.aspect ?? 9 / 16;
                  return pushStroke({ ...prev, aspect }, stroke);
                });
              }}
            />
          </div>

          <SpectatorToolbar
            colors={COLORS}
            selectedColor={color}
            tool={tool}
            onSelectColor={setColor}
            onSelectTool={setTool}
            charging={false}
            hasError={false}
            onMop={() => {
              api?.clear();
              setDraft({ v: 1, aspect: draft.aspect ?? 9 / 16, strokes: [] });
            }}
          />

          {/* non-verbal hint: show subtle flash on clear */}
          {!hasStrokes && (
            <div style={{ position: "absolute", left: 12, top: 12, opacity: 0.25, fontSize: 12, pointerEvents: "none" }}>
              {/* intentionally empty */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

