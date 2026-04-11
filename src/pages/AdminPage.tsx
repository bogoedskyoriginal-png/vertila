import { useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig, AppMode, Direction4, PredictionId, PredictionItem } from "../types/config";
import { AdminPredictionForm } from "../components/AdminPredictionForm";
import { AdminMotionSettingsForm } from "../components/AdminMotionSettingsForm";
import { AdminUiSettingsForm } from "../components/AdminUiSettingsForm";
import { ConfigSummary } from "../components/ConfigSummary";
import {
  persistAppConfig,
  resetAppConfigToDefaults,
  setAppConfig,
  updateAppConfig,
  useAppConfigStore
} from "../store/useAppConfigStore";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";
import { apiGet, apiSend } from "../utils/api";
import type { AdminConfigResponse, CreateShowResponse } from "../types/api";

const DIRS_4: Direction4[] = ["top", "right", "bottom", "left"];

const LS_SHOW_ID = "magic-show-id-v1";
const LS_ADMIN_KEY = "magic-admin-key-v1";

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

function isValidConfig(value: unknown): value is AppConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AppConfig>;
  return v.version === 1 && (v.mode === 4 || v.mode === 8) && Array.isArray(v.predictions);
}

function normalizePredictions(input: unknown): PredictionItem[] {
  const list = Array.isArray(input) ? (input as unknown[]) : [];
  const byId = new Map<number, Partial<PredictionItem>>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item as Partial<PredictionItem>;
    const id = Number(it.id);
    if (![1, 2, 3, 4, 5, 6, 7, 8].includes(id)) continue;
    byId.set(id, it);
  }

  return DEFAULT_CONFIG.predictions.map((p) => {
    const incoming = byId.get(p.id) ?? {};
    const imageDataUrl = (incoming as { imageDataUrl?: unknown }).imageDataUrl;

    return {
      ...p,
      ...incoming,
      id: p.id,
      label: typeof incoming.label === "string" ? incoming.label : p.label,
      text: typeof incoming.text === "string" ? incoming.text : p.text,
      imageDataUrl: typeof imageDataUrl === "string" ? imageDataUrl : p.imageDataUrl
    };
  });
}

function mergeWithDefaults(imported: AppConfig): AppConfig {
  return {
    ...DEFAULT_CONFIG,
    ...imported,
    predictions: normalizePredictions(imported.predictions),
    motion: { ...DEFAULT_CONFIG.motion, ...imported.motion },
    ui: { ...DEFAULT_CONFIG.ui, ...imported.ui },
    mapping4: { ...DEFAULT_CONFIG.mapping4, ...imported.mapping4 },
    mapping8: imported.mapping8 ?? DEFAULT_CONFIG.mapping8
  };
}

function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdminPage() {
  const config = useAppConfigStore((c) => c);
  const [showSummary, setShowSummary] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showId, setShowId] = useState<string>("");
  const [adminKey, setAdminKey] = useState<string>("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const qsShow = url.searchParams.get("show");
    const qsKey = url.searchParams.get("key");

    const lsShow = localStorage.getItem(LS_SHOW_ID);
    const lsKey = localStorage.getItem(LS_ADMIN_KEY);

    setShowId(qsShow ?? lsShow ?? "");
    setAdminKey(qsKey ?? lsKey ?? "");
  }, []);

  useEffect(() => {
    if (showId) localStorage.setItem(LS_SHOW_ID, showId);
  }, [showId]);

  useEffect(() => {
    if (adminKey) localStorage.setItem(LS_ADMIN_KEY, adminKey);
  }, [adminKey]);

  const predictionOptions = useMemo(() => {
    const count = config.mode === 4 ? 4 : 8;
    return config.predictions.slice(0, count).map((p) => ({ id: p.id, label: `${p.id}. ${p.label}` }));
  }, [config.mode, config.predictions]);

  const spectatorLink = useMemo(() => {
    if (!showId) return "";
    return `${window.location.origin}/draw/${encodeURIComponent(showId)}`;
  }, [showId]);

  const adminLink = useMemo(() => {
    if (!showId || !adminKey) return "";
    return `${window.location.origin}/admin?show=${encodeURIComponent(showId)}&key=${encodeURIComponent(adminKey)}`;
  }, [adminKey, showId]);

  return (
    <div className="page" style={{ maxWidth: 980, margin: "0 auto" }}>
      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Admin panel</div>
        <div className="hint">
          Локально: настройки сохраняются в <span className="kbd">localStorage</span> этого браузера.
          Для работы «настроил на ноуте → открыл на телефоне» нужен backend (Vercel KV).
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Backend (Show links)</div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <div className="label">showId</div>
            <input className="input" value={showId} onChange={(e) => setShowId(e.target.value.trim())} placeholder="например: AbCdEf123456" />
          </div>
          <div style={{ flex: "1 1 260px" }}>
            <div className="label">adminKey</div>
            <input className="input" value={adminKey} onChange={(e) => setAdminKey(e.target.value.trim())} placeholder="UUID" />
          </div>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <button
            className="btn btnPrimary"
            onClick={async () => {
              try {
                const res = await apiSend<CreateShowResponse>("/api/shows", "POST", { config });
                setShowId(res.showId);
                setAdminKey(res.adminKey);
                setToast("Show created on server");
              } catch (e) {
                setToast(e instanceof Error ? `Create failed: ${e.message}` : "Create failed");
              } finally {
                window.setTimeout(() => setToast(null), 2200);
              }
            }}
          >
            Create show on server
          </button>

          <button
            className="btn"
            disabled={!showId || !adminKey}
            onClick={async () => {
              try {
                await apiSend<{ ok: boolean }>(`/api/shows/${encodeURIComponent(showId)}/admin`, "PUT", { config }, { "x-admin-key": adminKey });
                setToast("Pushed to server");
              } catch (e) {
                setToast(e instanceof Error ? `Push failed: ${e.message}` : "Push failed");
              } finally {
                window.setTimeout(() => setToast(null), 2200);
              }
            }}
          >
            Push updates
          </button>

          <button
            className="btn"
            disabled={!showId || !adminKey}
            onClick={async () => {
              try {
                const res = await apiGet<AdminConfigResponse>(`/api/shows/${encodeURIComponent(showId)}/admin`, {
                  headers: { "x-admin-key": adminKey }
                } as any);
                if (!isValidConfig(res.config)) {
                  setToast("Load failed: invalid config");
                  return;
                }
                const merged = mergeWithDefaults(res.config);
                setAppConfig(merged);
                persistAppConfig();
                setToast("Loaded from server and saved locally");
              } catch (e) {
                setToast(e instanceof Error ? `Load failed: ${e.message}` : "Load failed");
              } finally {
                window.setTimeout(() => setToast(null), 2200);
              }
            }}
          >
            Load from server
          </button>
        </div>

        {toast && <div className="hint" style={{ marginTop: 8 }}>{toast}</div>}

        <div className="divider" />

        <div className="col" style={{ gap: 8 }}>
          <div>
            <span className="label">Spectator link</span>
            <div className="hint" style={{ wordBreak: "break-all" }}>{spectatorLink || "—"}</div>
          </div>
          <div>
            <span className="label">Admin link (private)</span>
            <div className="hint" style={{ wordBreak: "break-all" }}>{adminLink || "—"}</div>
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button
              className="btn"
              disabled={!spectatorLink}
              onClick={() => navigator.clipboard.writeText(spectatorLink)}
            >
              Copy spectator link
            </button>
            <button
              className="btn"
              disabled={!adminLink}
              onClick={() => navigator.clipboard.writeText(adminLink)}
            >
              Copy admin link
            </button>
            <button className="btn" disabled={!spectatorLink} onClick={() => window.open(spectatorLink, "_blank")}>Open spectator</button>
          </div>

          <div className="hint">
            Важно: spectator получает только public-config, а предсказание выдаётся сервером только после <span className="kbd">locked</span> (через одноразовую session).
          </div>
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
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Локальные кнопки</div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button
              className="btn btnPrimary"
              onClick={() => {
                persistAppConfig();
                setToast("Saved to localStorage");
                window.setTimeout(() => setToast(null), 1400);
              }}
            >
              Save settings
            </button>
            <button
              className="btn btnDanger"
              onClick={() => {
                resetAppConfigToDefaults();
                setToast("Reset to defaults");
                window.setTimeout(() => setToast(null), 1400);
              }}
            >
              Reset to defaults
            </button>
            <button className="btn" onClick={() => setShowSummary((v) => !v)}>
              Preview spectator config summary
            </button>
          </div>
          {toast && <div className="hint" style={{ marginTop: 8 }}>{toast}</div>}
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Перенос настроек (file, без backend)</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={() => {
              const stamp = new Date().toISOString().replace(/[:.]/g, "-");
              downloadJson(`magic-draw-config-${stamp}.json`, config);
              setToast("Exported config file");
              window.setTimeout(() => setToast(null), 1400);
            }}
          >
            Export settings (file)
          </button>

          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            Import settings (file)
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const text = await file.text();
                const parsed = JSON.parse(text) as unknown;
                if (!isValidConfig(parsed)) {
                  setToast("Import failed: invalid config format");
                  window.setTimeout(() => setToast(null), 2200);
                  return;
                }
                const merged = mergeWithDefaults(parsed);
                setAppConfig(merged);
                persistAppConfig();
                setToast("Imported and saved to localStorage");
                window.setTimeout(() => setToast(null), 2200);
              } catch {
                setToast("Import failed: could not read JSON");
                window.setTimeout(() => setToast(null), 2200);
              }
            }}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 460px" }}>
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
                  Это mapping результата классификации (direction) в индекс предсказания.
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

        <div style={{ flex: "1 1 360px" }}>
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