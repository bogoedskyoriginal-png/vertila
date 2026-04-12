import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { DrawingCanvas } from "../components/DrawingCanvas";
import type { DrawingCanvasApi } from "../components/DrawingCanvas";
import type { DrawingTool } from "../hooks/useDrawingCanvas";
import { SpectatorToolbar } from "../components/SpectatorToolbar";
import { useMotionClassifier } from "../hooks/useMotionClassifier";
import type { AppConfig, PredictionDrawing, PredictionId } from "../types/config";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";
import { apiGet } from "../utils/api";
import type { UserConfigResponse } from "../types/api";

const COLORS = ["#111827", "#2563eb", "#b91c1c", "#16a34a", "#000000"];

function normalizeCode(code: string | undefined) {
  return String(code || "").trim().toUpperCase();
}

function findPredictionImage(config: AppConfig, id: PredictionId) {
  const p = config.predictions.find((x) => x.id === id);
  return String(p?.imageDataUrl || "");
}

function findPredictionDrawing(config: AppConfig, id: PredictionId): PredictionDrawing | null {
  const p = config.predictions.find((x) => x.id === id);
  const d = p?.drawing;
  if (d && d.v === 1 && Array.isArray(d.strokes) && d.strokes.length > 0) return d;
  return null;
}

function isDoubleTap(lastTapAt: number, now: number) {
  return now - lastTapAt <= 260;
}

export function DrawPage() {
  const params = useParams();
  const code = normalizeCode(params.code);

  const [remoteConfig, setRemoteConfig] = useState<AppConfig | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [color, setColor] = useState(COLORS[0]);
  const [tool, setTool] = useState<DrawingTool>("pen");
  const [canvasApi, setCanvasApi] = useState<DrawingCanvasApi | null>(null);

  const config = remoteConfig ?? DEFAULT_CONFIG;
  const motion = useMotionClassifier(config);

  const lastTapAtRef = useRef<number>(0);
  const revealAppliedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setRemoteError(null);
      setRemoteConfig(null);
      revealAppliedRef.current = false;
      try {
        const data = await apiGet<UserConfigResponse>(`/api/users/${encodeURIComponent(code)}/config`);
        if (cancelled) return;
        setRemoteConfig(data.config);
      } catch (e) {
        if (cancelled) return;
        setRemoteError(
          e instanceof Error && e.message === "API 404"
            ? "Такой страницы не существует (ID не создан в мастер‑админке)."
            : e instanceof Error
              ? e.message
              : "load_failed"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (code) load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Apply prediction drawing once after lock.
  useEffect(() => {
    async function apply() {
      if (!canvasApi) return;
      if (revealAppliedRef.current) return;
      if (motion.state !== "locked") return;
      if (!motion.result) return;

      revealAppliedRef.current = true;
      const drawing = findPredictionDrawing(config, motion.result.predictionId);
      if (drawing) {
        await canvasApi.drawStrokes(drawing, { clear: false });
        return;
      }

      const img = findPredictionImage(config, motion.result.predictionId);
      if (!img) return;
      await canvasApi.drawFromDataUrl(img, { clear: false });
    }
    apply().catch(() => undefined);
  }, [canvasApi, config, motion.result, motion.state]);

  const spectatorUi = useMemo(() => {
    if (remoteError) {
      return (
        <div className="page" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="card" style={{ padding: 14, borderRadius: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Ошибка</div>
            <div className="hint">{remoteError}</div>
            <div className="hint" style={{ marginTop: 10 }}>
              Если вы ожидаете, что эта страница должна работать — сначала создайте ID в мастер‑админке и откройте ссылку
              фокусника <span className="kbd">/{code}/admin</span>.
            </div>
          </div>
        </div>
      );
    }

    if (loading && !remoteConfig) {
      return (
        <div className="page" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="card" style={{ padding: 14, borderRadius: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Загрузка…</div>
            <div className="hint">Подготовка страницы…</div>
          </div>
        </div>
      );
    }

    return null;
  }, [loading, remoteConfig, remoteError]);

  if (spectatorUi) return spectatorUi;

  return (
    <div className="page appFullHeight">
      <div className="spectatorLayout">
        {motion.permissionError && (
          <div className="card" style={{ padding: 12, borderColor: "rgba(185,28,28,0.25)" }}>
            <div style={{ fontWeight: 900, color: "#b91c1c", marginBottom: 4 }}>Не удалось включить датчики</div>
            <div className="hint">{motion.permissionError}</div>
          </div>
        )}

        <SpectatorToolbar
          colors={COLORS}
          selectedColor={color}
          tool={tool}
          onSelectColor={setColor}
          onSelectTool={setTool}
        />

        <div
          className="spectatorCanvasWrap"
          onPointerDown={() => {
            const now = Date.now();
            if (isDoubleTap(lastTapAtRef.current, now)) {
              lastTapAtRef.current = 0;
              revealAppliedRef.current = false;
              void motion.arm();
            } else {
              lastTapAtRef.current = now;
            }
          }}
        >
          <DrawingCanvas
            color={color}
            tool={tool}
            onReady={setCanvasApi}
            className=""
            style={{ border: "none", boxShadow: "none", borderRadius: 0 }}
          />
        </div>

        <div className="spectatorBottomBar">
          <button
            className="btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              revealAppliedRef.current = false;
              void motion.arm();
            }}
            style={{ width: "100%", justifyContent: "center", fontWeight: 900, borderRadius: 18 }}
          >
            Очистить
          </button>
        </div>
      </div>
    </div>
  );
}
