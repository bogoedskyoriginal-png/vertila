import { useMemo, useState } from "react";
import type { AppMode, PredictionId, PredictionItem } from "../types/config";
import { PredictionDrawModal } from "./PredictionDrawModal";

type Props = {
  mode: AppMode;
  predictions: PredictionItem[];
  onChange: (next: PredictionItem[]) => void;
};

function previewLabel(p: PredictionItem) {
  const hasText = Boolean(p.text && p.text.trim().length > 0);
  const hasDraw = Boolean(p.imageDataUrl && p.imageDataUrl.trim().length > 0);
  if (hasText && hasDraw) return "текст + рисунок";
  if (hasDraw) return "рисунок";
  if (hasText) return "текст";
  return "пусто";
}

export function AdminPredictionForm({ mode, predictions, onChange }: Props) {
  const visibleCount = mode === 4 ? 4 : 8;
  const visible = predictions.slice(0, visibleCount);

  const [drawForId, setDrawForId] = useState<PredictionId | null>(null);

  const current = useMemo(() => {
    if (!drawForId) return null;
    return predictions.find((p) => p.id === drawForId) ?? null;
  }, [drawForId, predictions]);

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Предсказания</div>
      <div className="col">
        {visible.map((p) => (
          <div key={p.id} className="card" style={{ padding: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.label}</div>
                <div className="hint">{previewLabel(p)}</div>
              </div>

              <div className="row" style={{ flexWrap: "wrap" }}>
                <button className="btn" onClick={() => setDrawForId(p.id)}>
                  Нарисовать
                </button>
                <button
                  className="btn"
                  disabled={!p.imageDataUrl}
                  onClick={() => {
                    const next = predictions.map((item) => (item.id === p.id ? { ...item, imageDataUrl: "" } : item));
                    onChange(next);
                  }}
                >
                  Удалить рисунок
                </button>
              </div>
            </div>

            <div className="col" style={{ gap: 6, marginTop: 10 }}>
              <div className="label">Текст предсказания (опционально)</div>
              <textarea
                className="textarea"
                value={p.text}
                onChange={(e) => {
                  const text = e.target.value;
                  const next = predictions.map((item) => (item.id === p.id ? { ...item, text } : item));
                  onChange(next);
                }}
                placeholder="Текст предсказания"
              />

              {p.imageDataUrl && p.imageDataUrl.trim().length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div className="label">Рисунок</div>
                  <img
                    src={p.imageDataUrl}
                    alt="prediction drawing"
                    style={{
                      display: "block",
                      width: "min(320px, 100%)",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#fff"
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <PredictionDrawModal
        open={drawForId !== null}
        title={current ? `Нарисовать: ${current.label}` : "Нарисовать"}
        initialDataUrl={current?.imageDataUrl ?? null}
        onCancel={() => setDrawForId(null)}
        onSave={(dataUrl) => {
          if (!drawForId) return;
          const next = predictions.map((item) => (item.id === drawForId ? { ...item, imageDataUrl: dataUrl } : item));
          onChange(next);
          setDrawForId(null);
        }}
      />
    </div>
  );
}