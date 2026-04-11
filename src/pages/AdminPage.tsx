import { useMemo, useState } from "react";
import type { AppMode, Direction4, PredictionId } from "../types/config";
import { AdminPredictionForm } from "../components/AdminPredictionForm";
import { AdminMotionSettingsForm } from "../components/AdminMotionSettingsForm";
import { AdminUiSettingsForm } from "../components/AdminUiSettingsForm";
import { ConfigSummary } from "../components/ConfigSummary";
import {
  persistAppConfig,
  resetAppConfigToDefaults,
  updateAppConfig,
  useAppConfigStore
} from "../store/useAppConfigStore";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";

const DIRS_4: Direction4[] = ["top", "right", "bottom", "left"];

function PredictionSelect({
  value,
  onChange,
  options
}: {
  value: PredictionId;
  onChange: (id: PredictionId) => void;
  options: { id: PredictionId; label: string }[];
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(Number(e.target.value) as PredictionId)}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function AdminPage() {
  const config = useAppConfigStore((c) => c);
  const [showSummary, setShowSummary] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const predictionOptions = useMemo(() => {
    const count = config.mode === 4 ? 4 : 8;
    return config.predictions.slice(0, count).map((p) => ({ id: p.id, label: `${p.id}. ${p.label}` }));
  }, [config.mode, config.predictions]);

  return (
    <div className="page" style={{ maxWidth: 920, margin: "0 auto" }}>
      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Admin panel</div>
        <div className="hint">
          Настройки сохраняются в <span className="kbd">localStorage</span> и читаются страницей <span className="kbd">/draw</span>.
        </div>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div className="card" style={{ padding: 14, flex: "1 1 340px" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Режим</div>
          <div className="row">
            <select
              className="select"
              value={config.mode}
              onChange={(e) => {
                const mode = Number(e.target.value) as AppMode;
                updateAppConfig((prev) => ({ ...prev, mode }));
              }}
            >
              <option value={4}>4 outcomes (production)</option>
              <option value={8}>8 outcomes (experimental UI / placeholder-ready)</option>
            </select>
          </div>
          {config.mode === 8 && (
            <div className="hint" style={{ marginTop: 8 }}>
              В MVP классификация датчиков надежно работает для 4 исходов; mode=8 пока использует fallback на 4-направления.
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 14, flex: "1 1 340px" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Кнопки</div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button
              className="btn btnPrimary"
              onClick={() => {
                persistAppConfig();
                setSaveToast("Saved");
                window.setTimeout(() => setSaveToast(null), 1200);
              }}
            >
              Save settings
            </button>
            <button
              className="btn btnDanger"
              onClick={() => {
                resetAppConfigToDefaults();
                setShowSummary(false);
              }}
            >
              Reset to defaults
            </button>
            <button className="btn" onClick={() => setShowSummary((v) => !v)}>
              Preview spectator config summary
            </button>
          </div>
          {saveToast && <div className="hint" style={{ marginTop: 8 }}>Saved to localStorage.</div>}
        </div>
      </div>

      <div className="row" style={{ gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px" }}>
          <AdminPredictionForm
            mode={config.mode}
            predictions={config.predictions}
            onChange={(predictions) => updateAppConfig((prev) => ({ ...prev, predictions }))}
          />

          <div style={{ height: 10 }} />

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Mapping</div>

            {config.mode === 4 ? (
              <div className="col">
                {DIRS_4.map((dir) => (
                  <div key={dir} className="row" style={{ justifyContent: "space-between" }}>
                    <div className="label" style={{ minWidth: 90 }}>
                      {dir} →
                    </div>
                    <div style={{ flex: 1 }}>
                      <PredictionSelect
                        value={config.mapping4[dir]}
                        options={predictionOptions}
                        onChange={(id) => {
                          updateAppConfig((prev) => ({
                            ...prev,
                            mapping4: { ...prev.mapping4, [dir]: id }
                          }));
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="hint">
                  Это mapping результата классификации (direction) в индекс предсказания. Предсказания не захардкожены в spectator page — берутся только из общего конфига.
                </div>
              </div>
            ) : (
              <div className="col">
                <div className="hint">
                  UI для mapping8 — experimental. Структура данных уже готова: <span className="kbd">config.mapping8</span>.
                </div>
                <button
                  className="btn"
                  onClick={() =>
                    updateAppConfig((prev) => ({
                      ...prev,
                      mapping8: prev.mapping8 ?? DEFAULT_CONFIG.mapping8
                    }))
                  }
                >
                  Initialize mapping8 placeholder
                </button>
                <div className="hint">
                  Реальная 8-outcome классификация подключается позже в <span className="kbd">useMotionClassifier</span>.
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: "1 1 340px" }}>
          <AdminMotionSettingsForm
            motion={config.motion}
            onChange={(motion) => updateAppConfig((prev) => ({ ...prev, motion }))}
          />

          <div style={{ height: 10 }} />

          <AdminUiSettingsForm ui={config.ui} onChange={(ui) => updateAppConfig((prev) => ({ ...prev, ui }))} />

          {showSummary && (
            <>
              <div style={{ height: 10 }} />
              <ConfigSummary config={config} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
