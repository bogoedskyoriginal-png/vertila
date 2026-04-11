import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { AppMode, Direction4, PredictionId } from "../types/config";
import { AdminPredictionForm } from "../components/AdminPredictionForm";
import { AdminMotionSettingsForm } from "../components/AdminMotionSettingsForm";
import { AdminUiSettingsForm } from "../components/AdminUiSettingsForm";
import { ConfigSummary } from "../components/ConfigSummary";
import { updateAppConfig, useAppConfigStore } from "../store/useAppConfigStore";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";
import { apiGet, apiSend } from "../utils/api";
import type { AdminConfigResponse } from "../types/api";

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
  const params = useParams();
  const showId = params.showId ?? null;
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("key") ?? "";

  const config = useAppConfigStore((c) => c);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const spectatorLink = useMemo(() => {
    if (!showId) return "";
    return `${window.location.origin}/draw/${encodeURIComponent(showId)}`;
  }, [showId]);

  const predictionOptions = useMemo(() => {
    const count = config.mode === 4 ? 4 : 8;
    return config.predictions.slice(0, count).map((p) => ({ id: p.id, label: `${p.id}. ${p.label}` }));
  }, [config.mode, config.predictions]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!showId || !adminKey) return;
      setLoading(true);
      try {
        const res = await apiGet<AdminConfigResponse>(`/api/shows/${encodeURIComponent(showId)}/admin`, {
          headers: { "x-admin-key": adminKey }
        });
        if (cancelled) return;
        updateAppConfig(() => res.config);
        setToast("Loaded from server");
        window.setTimeout(() => setToast(null), 1500);
      } catch (e) {
        if (cancelled) return;
        setToast(e instanceof Error ? `Load failed: ${e.message}` : "Load failed");
        window.setTimeout(() => setToast(null), 2500);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [adminKey, showId]);

  if (!showId || !adminKey) {
    return (
      <div style={{ minHeight: "100vh", background: "#050507", color: "#fff", padding: 18 }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Magician Admin</div>
          <div
            style={{
              background: "#0b0b10",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: 14
            }}
          >
            <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.4 }}>
              Открой эту страницу по ссылке, которую сгенерировал Master Admin.
              Она выглядит так:
              <div style={{ marginTop: 8, fontFamily: "ui-monospace", fontSize: 12, opacity: 0.85 }}>
                /admin/&lt;showId&gt;?key=&lt;adminKey&gt;
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <a href="/master" style={{ color: "#fff" }}>
                Перейти в Master Admin
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 980, margin: "0 auto" }}>
      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 10,
          background: "#0b0b10",
          color: "#fff",
          borderColor: "rgba(255,255,255,0.12)"
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>Magician Admin</div>
        <div className="hint" style={{ color: "rgba(255,255,255,0.7)" }}>
          Настройки сохраняются на сервере и применяются к spectator ссылке.
        </div>
        <div className="hint" style={{ color: "rgba(255,255,255,0.7)", wordBreak: "break-all" }}>
          Spectator: {spectatorLink}
        </div>
        <div className="row" style={{ flexWrap: "wrap", marginTop: 10 }}>
          <button
            className="btn btnPrimary"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await apiSend<{ ok: boolean }>(
                  `/api/shows/${encodeURIComponent(showId)}/admin`,
                  "PUT",
                  { config },
                  { "x-admin-key": adminKey }
                );
                setToast("Saved to server");
              } catch (e) {
                setToast(e instanceof Error ? `Save failed: ${e.message}` : "Save failed");
              } finally {
                setLoading(false);
                window.setTimeout(() => setToast(null), 2200);
              }
            }}
          >
            Save to server
          </button>
          <button
            className="btn"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const res = await apiGet<AdminConfigResponse>(`/api/shows/${encodeURIComponent(showId)}/admin`, {
                  headers: { "x-admin-key": adminKey }
                });
                updateAppConfig(() => res.config);
                setToast("Reloaded");
              } catch (e) {
                setToast(e instanceof Error ? `Reload failed: ${e.message}` : "Reload failed");
              } finally {
                setLoading(false);
                window.setTimeout(() => setToast(null), 2200);
              }
            }}
          >
            Reload
          </button>
          <button className="btn" onClick={() => navigator.clipboard.writeText(spectatorLink)}>
            Copy spectator link
          </button>
          <button className="btn" onClick={() => window.open(spectatorLink, "_blank")}>
            Open spectator
          </button>
          <button className="btn" onClick={() => setShowSummary((v) => !v)}>
            Config summary
          </button>
          <button
            className="btn btnDanger"
            onClick={() => {
              updateAppConfig(() => DEFAULT_CONFIG);
              setToast("Reset locally (save to apply)");
              window.setTimeout(() => setToast(null), 2200);
            }}
          >
            Reset local
          </button>
        </div>
        {toast && <div className="hint" style={{ marginTop: 8, color: "rgba(255,255,255,0.7)" }}>{toast}</div>}
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
              </div>
            ) : (
              <div className="col">
                <div className="hint">mode=8 — experimental placeholder-ready.</div>
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
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: "1 1 360px" }}>
          <div className="card" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Mode</div>
            <select
              className="select"
              value={config.mode}
              onChange={(e) => {
                const mode = Number(e.target.value) as AppMode;
                updateAppConfig((prev) => ({ ...prev, mode }));
              }}
            >
              <option value={4}>4 outcomes</option>
              <option value={8}>8 outcomes (experimental)</option>
            </select>
          </div>

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