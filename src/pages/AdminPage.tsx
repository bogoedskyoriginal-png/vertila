import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { AppConfig, AppMode, PredictionId } from "../types/config";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";
import { apiGet, apiSend } from "../utils/api";
import type { UserConfigResponse } from "../types/api";
import { Toolbar } from "../components/Toolbar";
import type { DrawingTool } from "../hooks/useDrawingCanvas";
import { MiniDrawingCanvas } from "../components/MiniDrawingCanvas";

const COLORS = ["#111827", "#2563eb", "#b91c1c", "#16a34a", "#000000"];

function normalizeCode(code: string | undefined) {
  return String(code || "").trim().toUpperCase();
}

function predictionIdsForMode(mode: AppMode): PredictionId[] {
  return mode === 4 ? ([1, 2, 3, 4] as const) : ([1, 2, 3, 4, 5, 6, 7, 8] as const);
}

function updatePredictionImage(config: AppConfig, id: PredictionId, imageDataUrl: string): AppConfig {
  return {
    ...config,
    predictions: config.predictions.map((p) => (p.id === id ? { ...p, imageDataUrl } : p))
  };
}

function labelRuForId(id: PredictionId) {
  if (id === 1) return "ВЕРХ (медленно)";
  if (id === 2) return "ПРАВО (медленно)";
  if (id === 3) return "НИЗ (медленно)";
  if (id === 4) return "ЛЕВО (медленно)";
  if (id === 5) return "ВЕРХ (быстро)";
  if (id === 6) return "ПРАВО (быстро)";
  if (id === 7) return "НИЗ (быстро)";
  return "ЛЕВО (быстро)";
}

export function AdminPage() {
  const params = useParams();
  const code = normalizeCode(params.code);

  const [remote, setRemote] = useState<AppConfig | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [color, setColor] = useState(COLORS[0]);
  const [tool, setTool] = useState<DrawingTool>("pen");

  const config = remote ?? DEFAULT_CONFIG;
  const activeIds = useMemo(() => predictionIdsForMode(config.mode), [config.mode]);
  const predictionMap = useMemo(() => new Map(config.predictions.map((p) => [p.id, p])), [config.predictions]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setRemoteError(null);
      setRemote(null);
      setSavedAt(null);
      try {
        const data = await apiGet<UserConfigResponse>(`/api/users/${encodeURIComponent(code)}/config`);
        if (cancelled) return;
        setRemote(data.config);
      } catch (e) {
        if (cancelled) return;
        setRemoteError(
          e instanceof Error && e.message === "API 404"
            ? "Такого пользователя нет (ID не создан в мастер‑админке)."
            : e instanceof Error
              ? e.message
              : "load_failed"
        );
      }
    }
    if (code) load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const sideIds = useMemo(() => {
    return {
      top: config.mode === 8 ? ([1, 5] as const) : ([1] as const),
      right: config.mode === 8 ? ([2, 6] as const) : ([2] as const),
      bottom: config.mode === 8 ? ([3, 7] as const) : ([3] as const),
      left: config.mode === 8 ? ([4, 8] as const) : ([4] as const)
    };
  }, [config.mode]);

  function renderPredictionCell(id: PredictionId) {
    const p = predictionMap.get(id);
    if (!p || !activeIds.includes(id)) return null;

    return (
      <div key={id} style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 220px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.6 }}>{labelRuForId(id)}</div>
          <button
            className="btn"
            onClick={() => setRemote((prev) => updatePredictionImage(prev ?? DEFAULT_CONFIG, id, ""))}
            style={{ padding: "6px 10px", minHeight: 38 }}
          >
            Очистить
          </button>
        </div>

        <MiniDrawingCanvas
          value={p.imageDataUrl}
          color={color}
          tool={tool}
          onChange={(dataUrl) => setRemote((prev) => updatePredictionImage(prev ?? DEFAULT_CONFIG, id, dataUrl))}
          height={170}
        />
      </div>
    );
  }

  function renderSideCard(title: string, ids: readonly PredictionId[]) {
    return (
      <div className="card" style={{ padding: 12, borderRadius: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{ids.map((id) => renderPredictionCell(id))}</div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 980, margin: "0 auto" }}>
      <div className="card" style={{ padding: 14, borderRadius: 16, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Админка фокусника</div>
            <div className="hint">
              Код: <span className="kbd">{code}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div className="hint">Режим</div>
            <button
              className={config.mode === 4 ? "btn btnPrimary" : "btn"}
              onClick={() => setRemote((prev) => ({ ...(prev ?? DEFAULT_CONFIG), mode: 4 }))}
            >
              4
            </button>
            <button
              className={config.mode === 8 ? "btn btnPrimary" : "btn"}
              onClick={() => setRemote((prev) => ({ ...(prev ?? DEFAULT_CONFIG), mode: 8 }))}
            >
              8
            </button>
          </div>
        </div>

        {remoteError && (
          <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>
            {remoteError} Откройте правильную ссылку вида <span className="kbd">/12345/admin</span> (и убедитесь, что ID создан в мастер‑админке).
          </div>
        )}
      </div>

      <Toolbar colors={COLORS} selectedColor={color} tool={tool} onSelectColor={setColor} onSelectTool={setTool} />

      <div className="card" style={{ padding: 14, borderRadius: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>Предсказания (рисунки)</div>

        <div className="adminCross">
          <div className="adminTop">{renderSideCard("Верх", sideIds.top)}</div>
          <div className="adminLeft adminMiddleRow">{renderSideCard("Лево", sideIds.left)}</div>
          <div className="adminRight adminMiddleRow">{renderSideCard("Право", sideIds.right)}</div>
          <div className="adminBottom">{renderSideCard("Низ", sideIds.bottom)}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
          <button
            className="btn btnPrimary"
            disabled={saving || !!remoteError}
            onClick={async () => {
              setSaving(true);
              try {
                const toSave: AppConfig = {
                  ...config,
                  // Ensure predictions array is always 1..8
                  predictions: DEFAULT_CONFIG.predictions.map((base) => {
                    const prev = config.predictions.find((p) => p.id === base.id);
                    return {
                      ...base,
                      imageDataUrl: String(prev?.imageDataUrl || "")
                    };
                  })
                };
                await apiSend(`/api/users/${encodeURIComponent(code)}/config`, "PUT", { config: toSave });
                setSavedAt(Date.now());
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Сохранение…" : "Применить изменения"}
          </button>

          <button
            className="btn"
            disabled={saving || !!remoteError}
            onClick={() => {
              setRemote((prev) => {
                const base = prev ?? DEFAULT_CONFIG;
                const ids = predictionIdsForMode(base.mode);
                return {
                  ...base,
                  predictions: base.predictions.map((p) => (ids.includes(p.id as any) ? { ...p, imageDataUrl: "" } : p))
                };
              });
            }}
          >
            Очистить все
          </button>

          {savedAt && <div className="hint">Сохранено: {new Date(savedAt).toLocaleTimeString()}</div>}
        </div>

        <div className="hint" style={{ marginTop: 10 }}>
          Дальше: откройте зрительскую ссылку <span className="kbd">/{code}</span>, сделайте двойной быстрый тап по экрану, положите телефон экраном вниз и переворачивайте через нужный край.
        </div>
      </div>
    </div>
  );
}
