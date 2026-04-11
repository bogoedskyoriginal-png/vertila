import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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

function storageKey(code: string) {
  return `magic-admin-key:${code}`;
}

export function AdminPage() {
  const params = useParams();
  const code = (params.code ?? "").toUpperCase();

  const config = useAppConfigStore((c) => c);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const [adminKey, setAdminKey] = useState<string>("");
  const [adminKeyInput, setAdminKeyInput] = useState<string>("");

  useEffect(() => {
    if (!code) return;
    const saved = localStorage.getItem(storageKey(code)) ?? "";
    setAdminKey(saved);
    setAdminKeyInput("");
  }, [code]);

  const spectatorLink = useMemo(() => {
    if (!code) return "";
    return `${window.location.origin}/${encodeURIComponent(code)}`;
  }, [code]);

  const predictionOptions = useMemo(() => {
    const count = config.mode === 4 ? 4 : 8;
    return config.predictions.slice(0, count).map((p) => ({ id: p.id, label: `${p.id}. ${p.label}` }));
  }, [config.mode, config.predictions]);

  async function loadFromServer(key: string) {
    const res = await apiGet<AdminConfigResponse>(`/api/shows/${encodeURIComponent(code)}/admin`, {
      headers: { "x-admin-key": key }
    });
    updateAppConfig(() => res.config);
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!code) return;
      if (!adminKey) return;

      setLoading(true);
      try {
        await loadFromServer(adminKey);
        if (cancelled) return;
        setToast("Loaded");
      } catch (e) {
        if (cancelled) return;
        setToast(e instanceof Error ? `Load failed: ${e.message}` : "Load failed");
        // invalidate stored key on unauthorized
        localStorage.removeItem(storageKey(code));
        setAdminKey("");
      } finally {
        if (!cancelled) {
          setLoading(false);
          window.setTimeout(() => setToast(null), 2000);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [adminKey, code]);

  if (!code) {
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
              Нужна ссылка вида <span style={{ fontFamily: "ui-monospace" }}>/&lt;CODE&gt;/admin</span>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!adminKey) {
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
            <div style={{ opacity: 0.8, fontSize: 13, lineHeight: 1.4, marginBottom: 10 }}>
              Введите <b>Admin key</b>, который выдал Master Admin.
            </div>
            <input
              value={adminKeyInput}
              onChange={(e) => setAdminKeyInput(e.target.value)}
              placeholder="admin key"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "#06060a",
                color: "#fff",
                outline: "none"
              }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button
                onClick={() => {
                  const k = adminKeyInput.trim();
                  if (!k) return;
                  localStorage.setItem(storageKey(code), k);
                  setAdminKey(k);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "#ffffff",
                  color: "#050507",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Unlock
              </button>
              <button
                onClick={() => window.location.assign("/master")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Go to Master
              </button>
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
        <div style={{ fontWeight: 800, fontSize: 16 }}>Magician Admin — {code}</div>
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
                  `/api/shows/${encodeURIComponent(code)}/admin`,
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
                await loadFromServer(adminKey);
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
          <button
            className="btn"
            onClick={() => {
              localStorage.removeItem(storageKey(code));
              setAdminKey("");
              setToast("Locked");
              window.setTimeout(() => setToast(null), 1200);
            }}
          >
            Lock
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