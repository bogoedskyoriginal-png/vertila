import type { AppMode, PredictionItem } from "../types/config";

type Props = {
  mode: AppMode;
  predictions: PredictionItem[];
  onChange: (next: PredictionItem[]) => void;
};

export function AdminPredictionForm({ mode, predictions, onChange }: Props) {
  const visibleCount = mode === 4 ? 4 : 8;
  const visible = predictions.slice(0, visibleCount);

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Предсказания</div>
      <div className="col">
        {visible.map((p) => (
          <div key={p.id} className="col" style={{ gap: 6 }}>
            <div className="label">{p.label}</div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
