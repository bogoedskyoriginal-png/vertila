import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { AppConfig, AppMode, PredictionDrawing, PredictionId } from "../types/config";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";
import { apiGet, apiSend } from "../utils/api";
import type { UserConfigResponse } from "../types/api";
import { PredictionThumbnail } from "../components/PredictionThumbnail";
import { PredictionEditorModal } from "../components/PredictionEditorModal";
import { addTemplate, deleteTemplate, loadTemplates, makeTemplateId } from "../utils/templates";
import type { PredictionTemplate } from "../types/templates";

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

function updatePredictionDrawing(config: AppConfig, id: PredictionId, drawing: PredictionDrawing): AppConfig {
  return {
    ...config,
    predictions: config.predictions.map((p) =>
      p.id === id ? { ...p, drawing: { ...drawing, aspect: drawing.aspect ?? p.drawing?.aspect ?? 9 / 16 } } : p
    )
  };
}

function labelForId(id: PredictionId) {
  if (id === 1) return "ВЕРХ (1 наклон)";
  if (id === 2) return "ПРАВО (1 наклон)";
  if (id === 3) return "НИЗ (1 наклон)";
  if (id === 4) return "ЛЕВО (1 наклон)";
  if (id === 5) return "ВЕРХ (2 наклона)";
  if (id === 6) return "ПРАВО (2 наклона)";
  if (id === 7) return "НИЗ (2 наклона)";
  return "ЛЕВО (2 наклона)";
}

export function AdminPage() {
  const params = useParams();
  const code = normalizeCode(params.code);

  const [remote, setRemote] = useState<AppConfig | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [openEditor, setOpenEditor] = useState<PredictionId | null>(null);
  const [templates, setTemplates] = useState<PredictionTemplate[]>(() => loadTemplates());
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const config = remote ?? DEFAULT_CONFIG;
  const activeIds = useMemo(() => predictionIdsForMode(config.mode), [config.mode]);
  const predictionMap = useMemo(() => new Map(config.predictions.map((p) => [p.id, p])), [config.predictions]);
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

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
      <div key={id} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.6 }}>{labelForId(id)}</div>
          <button className="btn" onClick={() => setOpenEditor(id)} style={{ padding: "6px 10px", minHeight: 38 }}>
            Редактировать
          </button>
        </div>
        <PredictionThumbnail drawing={p.drawing} imageDataUrl={p.imageDataUrl} maxHeight={240} />
      </div>
    );
  }

  function renderSideCard(title: string, ids: readonly PredictionId[]) {
    return (
      <div className="card" style={{ padding: 12, borderRadius: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
        <div className="adminSideGrid">{ids.map((id) => renderPredictionCell(id))}</div>
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
              ID: <span className="kbd">{code}</span>
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

        {remoteError && <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>{remoteError}</div>}
      </div>

      <div className="card" style={{ padding: 14, borderRadius: 16, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>Шаблоны</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="input"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Название шаблона"
              style={{ flex: "1 1 240px", minHeight: 46 }}
            />
            <button
              className="btn btnPrimary"
              disabled={!!remoteError || !templateName.trim()}
              onClick={() => {
                const name = templateName.trim();
                const t: PredictionTemplate = {
                  id: makeTemplateId(),
                  name,
                  createdAt: Date.now(),
                  mode: config.mode,
                  predictions: DEFAULT_CONFIG.predictions.map((base) => {
                    const prev = config.predictions.find((p) => p.id === base.id);
                    return {
                      id: base.id,
                      imageDataUrl: String(prev?.imageDataUrl || ""),
                      drawing:
                        prev?.drawing && prev.drawing.v === 1
                          ? { ...prev.drawing, aspect: prev.drawing.aspect ?? 9 / 16 }
                          : { v: 1, aspect: 9 / 16, strokes: [] }
                    };
                  })
                };
                addTemplate(t);
                const next = loadTemplates();
                setTemplates(next);
                setSelectedTemplateId(t.id);
                setTemplateName("");
              }}
            >
              Сохранить как шаблон
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select
              className="select"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              style={{ flex: "1 1 320px", minHeight: 46 }}
            >
              <option value="">— выбрать шаблон —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.mode})
                </option>
              ))}
            </select>

            <button
              className="btn"
              disabled={!selectedTemplate || !!remoteError}
              onClick={() => {
                if (!selectedTemplate) return;
                setRemote((prev) => {
                  const base = prev ?? DEFAULT_CONFIG;
                  const byId = new Map(selectedTemplate.predictions.map((p) => [p.id, p]));
                  return {
                    ...base,
                    mode: selectedTemplate.mode,
                    predictions: DEFAULT_CONFIG.predictions.map((pBase) => {
                      const found = byId.get(pBase.id);
                      if (!found) return { ...pBase };
                      return {
                        ...pBase,
                        imageDataUrl: String(found.imageDataUrl || ""),
                        drawing: found.drawing && found.drawing.v === 1 ? found.drawing : { v: 1, aspect: 9 / 16, strokes: [] }
                      };
                    })
                  };
                });
              }}
            >
              Применить шаблон
            </button>

            <button
              className="btn btnDanger"
              disabled={!selectedTemplate}
              onClick={() => {
                if (!selectedTemplate) return;
                if (!confirm(`Удалить шаблон “${selectedTemplate.name}”?`)) return;
                deleteTemplate(selectedTemplate.id);
                const next = loadTemplates();
                setTemplates(next);
                setSelectedTemplateId("");
              }}
            >
              Удалить
            </button>
          </div>
        </div>
      </div>

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
                      imageDataUrl: String(prev?.imageDataUrl || ""),
                      drawing:
                        prev?.drawing && prev.drawing.v === 1
                          ? { ...prev.drawing, aspect: prev.drawing.aspect ?? 9 / 16 }
                          : { v: 1, aspect: 9 / 16, strokes: [] }
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

          {savedAt && <div className="hint">Сохранено: {new Date(savedAt).toLocaleTimeString()}</div>}
        </div>
      </div>

      <PredictionEditorModal
        open={openEditor !== null}
        title={openEditor ? labelForId(openEditor) : ""}
        initial={
          openEditor
            ? (config.predictions.find((p) => p.id === openEditor)?.drawing ?? { v: 1, aspect: 9 / 16, strokes: [] })
            : { v: 1, aspect: 9 / 16, strokes: [] }
        }
        onClose={() => setOpenEditor(null)}
        onSave={(drawing, imageDataUrl) => {
          if (!openEditor) return;
          setRemote((prev) =>
            updatePredictionDrawing(updatePredictionImage(prev ?? DEFAULT_CONFIG, openEditor, imageDataUrl), openEditor, drawing)
          );
          setOpenEditor(null);
        }}
      />
    </div>
  );
}
