import { useMemo, useState } from "react";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { Toolbar } from "../components/Toolbar";
import { CountdownOverlay } from "../components/CountdownOverlay";
import { useAppConfigStore } from "../store/useAppConfigStore";
import { resetSpectatorHiddenState, useSpectatorStateStore } from "../store/useSpectatorStateStore";
import { useMotionClassifier } from "../hooks/useMotionClassifier";

const PALETTE = ["#111827", "#2563eb", "#b91c1c", "#16a34a"];

export function DrawPage() {
  const config = useAppConfigStore((c) => c);
  const ui = config.ui;

  const [color, setColor] = useState<string>(PALETTE[0]);
  const [canvasApi, setCanvasApi] = useState<{ clear: () => void } | null>(null);
  const classifier = useMotionClassifier(config);

  const hidden = useSpectatorStateStore((s) => s);

  const enableLabel = useMemo(() => {
    if (classifier.appState === "requestingPermission") return "Разрешение…";
    if (classifier.appState === "countdown") return "Подготовка…";
    if (classifier.appState === "calibrating") return "Калибровка…";
    if (classifier.appState === "armed") return "Готово";
    if (classifier.appState === "locked") return "Готово";
    return "Включить датчики";
  }, [classifier.appState]);

  const overlay = useMemo(() => {
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
    return {
      visible: false,
      title: "",
      subtitle: undefined as string | undefined,
      value: undefined as number | undefined
    };
  }, [classifier.appState, classifier.countdownValue]);

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
              state: <span className="kbd">{classifier.appState}</span>
            </div>
            <div>
              sensorAvailable: <span className="kbd">{String(classifier.sensorAvailable)}</span>
            </div>
            <div>
              permissionGranted: <span className="kbd">{String(classifier.permissionGranted)}</span>
            </div>
            {classifier.permissionError && (
              <div style={{ color: "#b91c1c" }}>
                permissionError: <span className="kbd">{classifier.permissionError}</span>
              </div>
            )}
            {classifier.experimentalNote && <div className="hint">{classifier.experimentalNote}</div>}
            <div className="divider" />
            <div>
              classifiedDirection: <span className="kbd">{String(hidden.classifiedDirection)}</span>
            </div>
            <div>
              classifiedResultIndex: <span className="kbd">{String(hidden.classifiedResultIndex)}</span>
            </div>
            <div>
              confidenceScore: <span className="kbd">{String(hidden.confidenceScore)}</span>
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