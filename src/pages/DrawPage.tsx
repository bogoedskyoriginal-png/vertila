import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { Toolbar } from "../components/Toolbar";
import { CountdownOverlay } from "../components/CountdownOverlay";
import {
  resetSpectatorHiddenState,
  updateSpectatorHiddenState,
  useSpectatorStateStore
} from "../store/useSpectatorStateStore";
import { useMotionClassifier } from "../hooks/useMotionClassifier";
import type { AppConfig } from "../types/config";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";
import { apiGet, apiSend } from "../utils/api";
import type { PublicConfigResponse, RevealResponse, SessionResponse } from "../types/api";

const PALETTE = ["#111827", "#2563eb", "#b91c1c", "#16a34a"];

function toSpectatorConfig(publicConfig: PublicConfigResponse["config"]): AppConfig {
  return {
    ...publicConfig,
    predictions: publicConfig.predictions.map((p) => ({
      id: p.id as any,
      label: p.label,
      text: "",
      imageDataUrl: ""
    }))
  } as AppConfig;
}

export function DrawPage() {
  const params = useParams();
  const code = (params.code ?? null) as string | null;

  const [remoteConfig, setRemoteConfig] = useState<AppConfig | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [color, setColor] = useState<string>(PALETTE[0]);
  const [canvasApi, setCanvasApi] = useState<{ clear: () => void } | null>(null);

  const baseConfig = remoteConfig ?? DEFAULT_CONFIG;
  const classifier = useMotionClassifier(baseConfig);
  const ui = baseConfig.ui;

  const hidden = useSpectatorStateStore((s) => s);
  const revealStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!code) {
        setRemoteError("Нужна spectator ссылка вида /draw/<code>.");
        setRemoteConfig(null);
        setSessionId(null);
        revealStartedRef.current = false;
        return;
      }

      setRemoteError(null);
      setRemoteConfig(null);
      setSessionId(null);
      revealStartedRef.current = false;

      try {
        const data = await apiGet<PublicConfigResponse>(`/api/shows/${encodeURIComponent(code)}/config`);
        if (cancelled) return;
        setRemoteConfig(toSpectatorConfig(data.config));

        const session = await apiSend<SessionResponse>(
          `/api/shows/${encodeURIComponent(code)}/session`,
          "POST",
          {}
        );
        if (cancelled) return;
        setSessionId(session.sessionId);
      } catch (e) {
        if (cancelled) return;
        setRemoteError(e instanceof Error ? e.message : "Не удалось загрузить настройки");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    async function reveal() {
      if (!code) return;
      if (!sessionId) return;
      if (revealStartedRef.current) return;
      if (classifier.appState !== "locked") return;
      if (!hidden.classifiedResultIndex) return;

      revealStartedRef.current = true;
      try {
        const data = await apiSend<RevealResponse>(
          `/api/shows/${encodeURIComponent(code)}/reveal`,
          "POST",
          { sessionId, resultIndex: hidden.classifiedResultIndex }
        );

        updateSpectatorHiddenState((prev) => ({
          ...prev,
          selectedPredictionText: data.predictionText?.trim() ? data.predictionText : null,
          selectedPredictionImageDataUrl: data.predictionImageDataUrl?.trim() ? data.predictionImageDataUrl : null
        }));
      } catch {
        // ignore
      }
    }

    reveal();
  }, [classifier.appState, hidden.classifiedResultIndex, sessionId, code]);

  const enableLabel = useMemo(() => {
    if (classifier.appState === "requestingPermission") return "Разрешение…";
    if (classifier.appState === "countdown") return "Подготовка…";
    if (classifier.appState === "calibrating") return "Калибровка…";
    if (classifier.appState === "armed") return "Готово";
    if (classifier.appState === "locked") return "Готово";
    return "Включить датчики";
  }, [classifier.appState]);

  const overlay = useMemo(() => {
    if (remoteError) {
      return { visible: true, title: "Ошибка", subtitle: remoteError, value: undefined as number | undefined };
    }

    if (code && !remoteConfig) {
      return { visible: true, title: "Загрузка", subtitle: "Подготовка…", value: undefined as number | undefined };
    }

    if (classifier.appState === "countdown") {
      return {
        visible: true,
        title: "Подготовка",
        subtitle: "Положите телефон и подождите окончания отсчёта.",
        value: classifier.countdownValue
      };
    }
    if (classifier.appState === "calibrating") {
      return {
        visible: true,
        title: "Калибровка",
        subtitle: "Пожалуйста, не двигайте телефон.",
        value: undefined as number | undefined
      };
    }

    return { visible: false, title: "", subtitle: undefined as string | undefined, value: undefined as number | undefined };
  }, [classifier.appState, classifier.countdownValue, remoteConfig, remoteError, code]);

  return (
    <div className="page" style={{ maxWidth: 720, margin: "0 auto" }}>
      <Toolbar
        showEnableSensorsButton={ui.showEnableSensorsButton}
        showClearCanvasButton={ui.showClearCanvasButton}
        showResetHiddenStateButton={ui.showResetHiddenStateButton}
        enableButtonLabel={enableLabel}
        disabledEnable={
          classifier.appState !== "idle" && classifier.appState !== "armed" && classifier.appState !== "locked"
        }
        onEnableSensors={() => classifier.enableSensors()}
        onClearCanvas={() => canvasApi?.clear()}
        onResetHiddenState={() => {
          classifier.resetClassifier();
          resetSpectatorHiddenState();
          revealStartedRef.current = false;
        }}
        colors={PALETTE}
        selectedColor={color}
        onSelectColor={setColor}
      />

      {classifier.permissionError && !ui.enableDebugMode && (
        <div className="card" style={{ padding: 12, marginBottom: 10, borderColor: "rgba(185,28,28,0.25)" }}>
          <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>Не удалось включить датчики</div>
          <div className="hint">{classifier.permissionError}</div>
        </div>
      )}

      <DrawingCanvas color={color} onReady={(api) => setCanvasApi(api)} />

      <CountdownOverlay visible={overlay.visible} title={overlay.title} subtitle={overlay.subtitle} value={overlay.value} />

      {ui.enableDebugMode && (
        <div className="card" style={{ padding: 12, marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Debug</div>
          <div className="col" style={{ gap: 6, fontSize: 12 }}>
            <div>
              code: <span className="kbd">{String(code)}</span>
            </div>
            <div>
              sessionId: <span className="kbd">{sessionId ? "yes" : "no"}</span>
            </div>
            <div>
              state: <span className="kbd">{classifier.appState}</span>
            </div>
            <div>
              classifiedResultIndex: <span className="kbd">{String(hidden.classifiedResultIndex)}</span>
            </div>
            <div>
              selectedPredictionText: <span className="kbd">{String(hidden.selectedPredictionText)}</span>
            </div>
            <div>
              selectedPredictionImage: <span className="kbd">{hidden.selectedPredictionImageDataUrl ? "yes" : "no"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}