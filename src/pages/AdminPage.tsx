import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { AppConfig, AppMode, OutputMode, PredictionDrawing, PredictionId } from "../types/config";
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

function updatePredictionLinkQuery(config: AppConfig, id: PredictionId, linkQuery: string): AppConfig {
  return {
    ...config,
    predictions: config.predictions.map((p) => (p.id === id ? { ...p, linkQuery } : p))
  };
}

function labelForId(id: PredictionId, strategy: "speed" | "tilts") {
  const isSecond = id >= 5;
  const base = ((id - 1) % 4) + 1;

  const dir =
    base === 1 ? "ВЕРХ" : base === 2 ? "ПРАВО" : base === 3 ? "НИЗ" : "ЛЕВО";

  if (strategy === "speed") {
    return isSecond ? `${dir} (быстро)` : `${dir} (медленно)`;
  }

  // tilts strategy
  return isSecond ? `${dir} (2 наклона)` : `${dir} (1 наклон)`;
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
  const outputMode: OutputMode = config.outputMode || "drawings";
  const activeIds = useMemo(() => predictionIdsForMode(config.mode), [config.mode]);
  const predictionMap = useMemo(() => new Map(config.predictions.map((p) => [p.id, p])), [config.predictions]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

  const effectiveStrategy: "speed" | "tilts" = (() => {
    if (outputMode === "links") return "tilts";
    if (config.mode !== 8) return "tilts";
    return config.motion?.mode8Strategy || "tilts";
  })();

  const showMode8StrategyToggle = outputMode === "drawings" && config.mode === 8;
  const showSpeedSensitivityToggle = showMode8StrategyToggle && effectiveStrategy === "speed";
  const speedSensitivity = config.motion?.speedSensitivity || "medium";

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
            ? "Такого пользователя нет (ID не создан в мастер-админке)."
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
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6 }}>{labelForId(id, effectiveStrategy)}</div>
          {outputMode === "drawings" ? (
            <button className="btn" onClick={() => setOpenEditor(id)} style={{ padding: "6px 10px", minHeight: 38 }}>
              Редактировать
            </button>
          ) : null}
        </div>

        {outputMode === "drawings" ? (
          <PredictionThumbnail drawing={p.drawing} imageDataUrl={p.imageDataUrl} maxHeight={240} />
        ) : (
          <input
            className="input"
            value={String(p.linkQuery || "")}
            onChange={(e) => setRemote((prev) => updatePredictionLinkQuery(prev ?? DEFAULT_CONFIG, id, e.target.value))}
            placeholder="Запрос для Google Картинок"
            style={{ minHeight: 46 }}
          />
        )}
      </div>
    );
  }

  function renderSideCard(title: string, ids: readonly PredictionId[]) {
    return (
      <div className="card" style={{ padding: 12, borderRadius: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
        <div className="adminSideGrid">{ids.map((id) => renderPredictionCell(id))}</div>
      </div>
    );
  }

  return (
    <div className="adminRoot">
      <div className="page" style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div className="card" style={{ padding: 14, borderRadius: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Настройка Триггера</div>
              <div className="hint">
                ID: <span className="kbd">{code}</span>
              </div>
            </div>
            {remoteError && <div style={{ color: "#fecaca", fontWeight: 800, alignSelf: "center" }}>{remoteError}</div>}
          </div>
        </div>

        <div className="adminLayoutGrid">
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div className="card" style={{ padding: 12, borderRadius: 16 }}>
              <div className="hint" style={{ fontWeight: 800, marginBottom: 8 }}>
                Тип предсказаний
              </div>
              <div className="segmented">
                <button
                  type="button"
                  className={outputMode === "drawings" ? "segBtn segBtnActive" : "segBtn"}
                  disabled={!!remoteError}
                  onClick={() =>
                    setRemote((prev) => {
                      const base = prev ?? DEFAULT_CONFIG;
                      return { ...base, outputMode: "drawings" };
                    })
                  }
                >
                  Рисунки
                </button>
                <button
                  type="button"
                  className={outputMode === "links" ? "segBtn segBtnActive" : "segBtn"}
                  disabled={!!remoteError}
                  onClick={() =>
                    setRemote((prev) => {
                      const base = prev ?? DEFAULT_CONFIG;
                      return { ...base, outputMode: "links", motion: { ...base.motion, mode8Strategy: "tilts" } };
                    })
                  }
                >
                  Ссылки
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: 12, borderRadius: 16 }}>
              <div className="hint" style={{ fontWeight: 800, marginBottom: 8 }}>
                Количество предсказаний
              </div>
              <div className="segmented">
                <button
                  type="button"
                  className={config.mode === 4 ? "segBtn segBtnActive" : "segBtn"}
                  disabled={!!remoteError}
                  onClick={() => setRemote((prev) => ({ ...(prev ?? DEFAULT_CONFIG), mode: 4 }))}
                >
                  4
                </button>
                <button
                  type="button"
                  className={config.mode === 8 ? "segBtn segBtnActive" : "segBtn"}
                  disabled={!!remoteError}
                  onClick={() => setRemote((prev) => ({ ...(prev ?? DEFAULT_CONFIG), mode: 8 }))}
                >
                  8
                </button>
              </div>
            </div>

            {showMode8StrategyToggle && (
              <div className="card" style={{ padding: 12, borderRadius: 16 }}>
                <div className="hint" style={{ fontWeight: 800, marginBottom: 8 }}>
                  Способ активации предсказания
                </div>
                <div className="segmented segmentedOneCol">
                  <button
                    type="button"
                    className={effectiveStrategy === "tilts" ? "segBtn segBtnActive" : "segBtn"}
                    disabled={!!remoteError}
                    onClick={() =>
                      setRemote((prev) => {
                        const base = prev ?? DEFAULT_CONFIG;
                        return { ...base, motion: { ...base.motion, mode8Strategy: "tilts" } };
                      })
                    }
                  >
                    Наклоны
                  </button>
                  <button
                    type="button"
                    className={effectiveStrategy === "speed" ? "segBtn segBtnActive" : "segBtn"}
                    disabled={!!remoteError}
                    onClick={() =>
                      setRemote((prev) => {
                        const base = prev ?? DEFAULT_CONFIG;
                        return { ...base, motion: { ...base.motion, mode8Strategy: "speed" } };
                      })
                    }
                  >
                    Скорость
                  </button>
                </div>
              </div>
            )}

            {showSpeedSensitivityToggle && (
              <div className="card" style={{ padding: 12, borderRadius: 16 }}>
                <div className="hint" style={{ fontWeight: 800, marginBottom: 8 }}>
                  Чувствительность скорости
                </div>
                <div className="segmented segmentedOneCol">
                  <button
                    type="button"
                    className={speedSensitivity === "low" ? "segBtn segBtnActive" : "segBtn"}
                    disabled={!!remoteError}
                    onClick={() =>
                      setRemote((prev) => {
                        const base = prev ?? DEFAULT_CONFIG;
                        return { ...base, motion: { ...base.motion, speedSensitivity: "low" } };
                      })
                    }
                  >
                    Низкая
                  </button>
                  <button
                    type="button"
                    className={speedSensitivity === "medium" ? "segBtn segBtnActive" : "segBtn"}
                    disabled={!!remoteError}
                    onClick={() =>
                      setRemote((prev) => {
                        const base = prev ?? DEFAULT_CONFIG;
                        return { ...base, motion: { ...base.motion, speedSensitivity: "medium" } };
                      })
                    }
                  >
                    Средняя
                  </button>
                  <button
                    type="button"
                    className={speedSensitivity === "high" ? "segBtn segBtnActive" : "segBtn"}
                    disabled={!!remoteError}
                    onClick={() =>
                      setRemote((prev) => {
                        const base = prev ?? DEFAULT_CONFIG;
                        return { ...base, motion: { ...base.motion, speedSensitivity: "high" } };
                      })
                    }
                  >
                    Высокая
                  </button>
                </div>
              </div>
            )}

            <div className="card" style={{ padding: 12, borderRadius: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Шаблоны</div>
              <input
                className="input"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Название шаблона"
                style={{ minHeight: 46 }}
              />
              <div style={{ height: 10 }} />
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
	                    mode8Strategy: effectiveStrategy,
	                    speedSensitivity,
	                    outputMode,
	                    predictions: DEFAULT_CONFIG.predictions.map((base) => {
                      const prev = config.predictions.find((p) => p.id === base.id);
                      return {
                        id: base.id,
                        imageDataUrl: String(prev?.imageDataUrl || ""),
                        linkQuery: String(prev?.linkQuery || ""),
                        drawing:
                          prev?.drawing && prev.drawing.v === 1
                            ? { ...prev.drawing, aspect: prev.drawing.aspect ?? 9 / 16 }
                            : { v: 1, aspect: 9 / 16, strokes: [] }
                      };
                    })
                  };
                  addTemplate(t);
                  setTemplates(loadTemplates());
                  setSelectedTemplateId(t.id);
                  setTemplateName("");
                }}
              >
                Сохранить
              </button>

              <div style={{ height: 10 }} />
              <select
                className="select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{ minHeight: 46 }}
              >
                <option value="">— выбрать —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <div style={{ height: 10 }} />
              <button
                className="btn"
                disabled={!selectedTemplate || !!remoteError}
                onClick={() => {
                  if (!selectedTemplate) return;
                  setRemote((prev) => {
                    const base = prev ?? DEFAULT_CONFIG;
                    const byId = new Map(selectedTemplate.predictions.map((p) => [p.id, p]));
	                    const nextOutput: OutputMode = (selectedTemplate.outputMode as OutputMode) || "drawings";
	                    const nextStrategy: "speed" | "tilts" =
	                      nextOutput === "links" ? "tilts" : (selectedTemplate.mode8Strategy as any) || base.motion.mode8Strategy;
	                    const nextSens: "low" | "medium" | "high" =
	                      (selectedTemplate.speedSensitivity as any) === "low"
	                        ? "low"
	                        : (selectedTemplate.speedSensitivity as any) === "high"
	                          ? "high"
	                          : "medium";

	                    return {
	                      ...base,
	                      mode: selectedTemplate.mode,
	                      outputMode: nextOutput,
	                      motion: { ...base.motion, mode8Strategy: nextStrategy, speedSensitivity: nextSens },
	                      predictions: DEFAULT_CONFIG.predictions.map((pBase) => {
                        const found = byId.get(pBase.id);
                        if (!found) return { ...pBase, linkQuery: "" };
                        return {
                          ...pBase,
                          imageDataUrl: String(found.imageDataUrl || ""),
                          linkQuery: String(found.linkQuery || ""),
                          drawing:
                            found.drawing && found.drawing.v === 1
                              ? found.drawing
                              : { v: 1, aspect: 9 / 16, strokes: [] }
                        };
                      })
                    };
                  });
                }}
              >
                Применить
              </button>

              <div style={{ height: 10 }} />
              <button
                className="btn btnDanger"
                disabled={!selectedTemplate}
                onClick={() => {
                  if (!selectedTemplate) return;
                  if (!confirm(`Удалить шаблон “${selectedTemplate.name}”?`)) return;
                  deleteTemplate(selectedTemplate.id);
                  setTemplates(loadTemplates());
                  setSelectedTemplateId("");
                }}
              >
                Удалить
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 14, borderRadius: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>
              {outputMode === "drawings" ? "Предсказания (рисунки)" : "Предсказания (запросы)"}
            </div>

            <div className="adminCross">
              <div className="adminTop">{renderSideCard("Верх", sideIds.top)}</div>
              <div className="adminLeft">{renderSideCard("Лево", sideIds.left)}</div>
              <div className="adminRight">{renderSideCard("Право", sideIds.right)}</div>
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
                      outputMode,
                      motion: { ...config.motion, mode8Strategy: effectiveStrategy },
                      predictions: DEFAULT_CONFIG.predictions.map((base) => {
                        const prev = config.predictions.find((p) => p.id === base.id);
                        return {
                          ...base,
                          imageDataUrl: String(prev?.imageDataUrl || ""),
                          linkQuery: String(prev?.linkQuery || ""),
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
        </div>

        <PredictionEditorModal
          open={openEditor !== null}
          title={openEditor ? labelForId(openEditor, effectiveStrategy) : ""}
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
    </div>
  );
}



