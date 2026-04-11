import { useEffect, useMemo, useState } from "react";
import { useDrawingCanvas } from "../hooks/useDrawingCanvas";

const PALETTE = ["#111827", "#2563eb", "#b91c1c", "#16a34a"];

type Props = {
  open: boolean;
  title: string;
  initialDataUrl?: string | null;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
};

export function PredictionDrawModal({ open, title, initialDataUrl, onCancel, onSave }: Props) {
  const [color, setColor] = useState(PALETTE[0]);
  const { canvasRef, bindPointerHandlers, clear, exportDataUrl, loadFromDataUrl } = useDrawingCanvas({
    color,
    lineWidth: 6
  });

  useEffect(() => {
    if (!open) return;
    if (initialDataUrl) {
      loadFromDataUrl(initialDataUrl);
    } else {
      clear();
    }
  }, [open, initialDataUrl, loadFromDataUrl, clear]);

  const canSave = useMemo(() => {
    if (!open) return false;
    return true;
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        zIndex: 60
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="card" style={{ width: "min(720px, 100%)", padding: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={clear} style={{ minHeight: 40 }}>
              Очистить
            </button>
            <button className="btn" onClick={onCancel} style={{ minHeight: 40 }}>
              Отмена
            </button>
            <button
              className="btn btnPrimary"
              disabled={!canSave}
              onClick={() => {
                const url = exportDataUrl();
                if (!url) return;
                onSave(url);
              }}
              style={{ minHeight: 40 }}
            >
              Сохранить
            </button>
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {PALETTE.map((c) => {
            const active = color.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                className="btn"
                onClick={() => setColor(c)}
                aria-label={`color ${c}`}
                style={{
                  minHeight: 40,
                  minWidth: 40,
                  padding: 0,
                  borderRadius: 999,
                  borderColor: active ? "#111827" : "#e5e7eb"
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: c,
                    border: c.toLowerCase() === "#ffffff" ? "1px solid #e5e7eb" : "1px solid rgba(0,0,0,0.12)"
                  }}
                />
              </button>
            );
          })}
        </div>

        <div
          className="card"
          style={{
            marginTop: 10,
            height: 420,
            overflow: "hidden",
            touchAction: "none",
            borderRadius: 16
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

        <div className="hint" style={{ marginTop: 10 }}>
          Рисунок сохраняется в localStorage как data URL (MVP).
        </div>
      </div>
    </div>
  );
}