import type { MotionConfig } from "../types/config";

type Props = {
  motion: MotionConfig;
  onChange: (next: MotionConfig) => void;
};

export function AdminMotionSettingsForm({ motion, onChange }: Props) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Тайминги и пороги</div>

      <div className="col">
        <div className="col" style={{ gap: 6 }}>
          <div className="label">countdownSeconds</div>
          <input
            className="input"
            type="number"
            min={1}
            value={motion.countdownSeconds}
            onChange={(e) => onChange({ ...motion, countdownSeconds: Number(e.target.value) })}
          />
        </div>

        <div className="col" style={{ gap: 6 }}>
          <div className="label">calibrationMs</div>
          <input
            className="input"
            type="number"
            min={200}
            step={50}
            value={motion.calibrationMs}
            onChange={(e) => onChange({ ...motion, calibrationMs: Number(e.target.value) })}
          />
        </div>

        <div className="col" style={{ gap: 6 }}>
          <div className="label">motionThreshold</div>
          <input
            className="input"
            type="number"
            min={0.1}
            step={0.1}
            value={motion.motionThreshold}
            onChange={(e) => onChange({ ...motion, motionThreshold: Number(e.target.value) })}
          />
          <div className="hint">Порог детекта движения (разница от baseline, чем выше — тем меньше ложных срабатываний).</div>
        </div>

        <div className="col" style={{ gap: 6 }}>
          <div className="label">confidenceThreshold</div>
          <input
            className="input"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={motion.confidenceThreshold}
            onChange={(e) => onChange({ ...motion, confidenceThreshold: Number(e.target.value) })}
          />
          <div className="hint">0..1. Если уверенность ниже — классификатор продолжает ждать движение.</div>
        </div>
      </div>
    </div>
  );
}
