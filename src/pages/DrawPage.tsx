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

const COLORS = ["#111827", "#2563eb", "#b91c1c", "#16a34a"];

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

  const baseSnapshotRef = useRef<string | null>(null);
  const lastPredictionIdRef = useRef<number | null>(null);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setRemoteError(null);
      setRemoteConfig(null);
      baseSnapshotRef.current = null;
      lastPredictionIdRef.current = null;
      try {
        const data = await apiGet<UserConfigResponse>(`/api/users/${encodeURIComponent(code)}/config`);
        if (cancelled) return;
        setRemoteConfig(data.config);
      } catch (e) {
        if (cancelled) return;
        setRemoteError(
          e instanceof Error && e.message === "API 404"
            ? "Страница не найдена."
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

  useEffect(() => {
    document.documentElement.classList.add("noScroll");
    document.body.classList.add("noScroll");
    return () => {
      document.documentElement.classList.remove("noScroll");
      document.body.classList.remove("noScroll");
    };
  }, []);

  useEffect(() => {
    async function apply() {
      if (!canvasApi) return;
      if (!motion.result) return;
      if (motion.state !== "preview" && motion.state !== "locked") return;

      const predId = Number(motion.result.predictionId);
      if (lastPredictionIdRef.current === predId) return;

      if (!baseSnapshotRef.current) {
        baseSnapshotRef.current = canvasApi.exportDataUrl() ?? null;
      } else {
        await canvasApi.drawFromDataUrl(baseSnapshotRef.current, { clear: true });
      }
      lastPredictionIdRef.current = predId;

      const drawing = findPredictionDrawing(config, motion.result.predictionId);
      if (drawing) {
        await canvasApi.drawStrokes(drawing, { clear: false, fit: "cover" });
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
          </div>
        </div>
      );
    }

    if (loading && !remoteConfig) {
      return (
        <div className="page" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="card" style={{ padding: 14, borderRadius: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Загрузка…</div>
          </div>
        </div>
      );
    }

    return null;
  }, [loading, remoteConfig, remoteError]);

  if (spectatorUi) return spectatorUi;

  const charging = motion.state === "countdown" || motion.state === "calibrating";

  return (
    <div className="page appFullHeight">
      <div className="spectatorLayout">
        <div className="spectatorCanvasWrap">
          <DrawingCanvas
            color={color}
            tool={tool}
            onReady={setCanvasApi}
            className=""
            style={{ border: "none", boxShadow: "none", borderRadius: 0 }}
          />
        </div>

        <SpectatorToolbar
          colors={COLORS}
          selectedColor={color}
          tool={tool}
          onSelectColor={setColor}
          onSelectTool={setTool}
          charging={charging}
          hasError={!!motion.permissionError}
          onMop={() => {
            baseSnapshotRef.current = null;
            lastPredictionIdRef.current = null;
            canvasApi?.clear();
            setFlash((v) => v + 1);
            void motion.arm();
          }}
        />

        {flash > 0 && (
          <div key={flash} className="spectatorFlash" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path
                d="M14 3l7 7-2 2-7-7 2-2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 21h10l7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
