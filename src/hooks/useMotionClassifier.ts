import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig, Direction4, PredictionId } from "../types/config";
import type { MotionFlowState, MotionSample } from "../types/motion";
import { confidenceFromAverages, dominantDirection4, magnitude3, meanSample } from "../utils/motionMath";
import { updateSpectatorHiddenState } from "../store/useSpectatorStateStore";

type Baseline = { x: number; y: number; z: number };

type HookResult = {
  appState: MotionFlowState;
  countdownValue: number;
  sensorAvailable: boolean;
  permissionGranted: boolean;
  permissionError: string | null;
  classifiedDirection: Direction4 | null;
  classifiedResultIndex: PredictionId | null;
  selectedPredictionText: string | null;
  confidenceScore: number | null;
  experimentalNote: string | null;
  enableSensors: () => Promise<void>;
  startArming: () => void;
  resetClassifier: () => void;
};

function nowMs() {
  return performance.now();
}

function isIossafariPermissionFlowSupported(): boolean {
  const w = window as unknown as { DeviceMotionEvent?: unknown };
  const DME = w.DeviceMotionEvent as { requestPermission?: () => Promise<"granted" | "denied"> } | undefined;
  return typeof DME?.requestPermission === "function";
}

function pickPredictionText(config: AppConfig, id: PredictionId): string {
  const item = config.predictions.find((p) => p.id === id);
  return item?.text ?? "";
}

export function useMotionClassifier(config: AppConfig): HookResult {
  const [appState, setAppState] = useState<MotionFlowState>("idle");
  const [countdownValue, setCountdownValue] = useState<number>(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [classifiedDirection, setClassifiedDirection] = useState<Direction4 | null>(null);
  const [classifiedResultIndex, setClassifiedResultIndex] = useState<PredictionId | null>(null);
  const [selectedPredictionText, setSelectedPredictionText] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);

  const sensorAvailable = useMemo(() => {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  }, []);

  const configRef = useRef<AppConfig>(config);
  const appStateRef = useRef<MotionFlowState>(appState);
  const permissionGrantedRef = useRef<boolean>(permissionGranted);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    permissionGrantedRef.current = permissionGranted;
  }, [permissionGranted]);

  const baselineRef = useRef<Baseline | null>(null);
  const calibrationSamplesRef = useRef<MotionSample[]>([]);
  const detectionSamplesRef = useRef<MotionSample[]>([]);
  const peakMagnitudeRef = useRef<number>(0);

  const countdownTimerRef = useRef<number | null>(null);
  const calibrateTimerRef = useRef<number | null>(null);
  const detectionTimerRef = useRef<number | null>(null);

  const listenerAttachedRef = useRef(false);
  const lockedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    if (calibrateTimerRef.current) window.clearTimeout(calibrateTimerRef.current);
    if (detectionTimerRef.current) window.clearTimeout(detectionTimerRef.current);
    countdownTimerRef.current = null;
    calibrateTimerRef.current = null;
    detectionTimerRef.current = null;
  }, []);

  const resetHiddenState = useCallback(() => {
    updateSpectatorHiddenState(() => ({
      classifiedDirection: null,
      classifiedResultIndex: null,
      selectedPredictionText: null,
      confidenceScore: null,
      lockedAt: null
    }));
  }, []);

  const lockResult = useCallback((direction: Direction4, resultIndex: PredictionId, predictionText: string, confidence: number) => {
    lockedRef.current = true;
    setClassifiedDirection(direction);
    setClassifiedResultIndex(resultIndex);
    setSelectedPredictionText(predictionText);
    setConfidenceScore(confidence);
    setAppState("locked");

    updateSpectatorHiddenState(() => ({
      classifiedDirection: direction,
      classifiedResultIndex: resultIndex,
      selectedPredictionText: predictionText,
      confidenceScore: confidence,
      lockedAt: Date.now()
    }));
  }, []);

  const classifyWindow = useCallback(() => {
    if (lockedRef.current) return;
    const baseline = baselineRef.current;
    if (!baseline) {
      setAppState("armed");
      return;
    }

    const configNow = configRef.current;
    const samples = detectionSamplesRef.current;
    if (samples.length < 5) {
      setAppState("armed");
      return;
    }

    const avg = meanSample(samples);
    const dxAvg = avg.x - baseline.x;
    const dyAvg = avg.y - baseline.y;

    const direction = dominantDirection4(dxAvg, dyAvg);
    const confidence = confidenceFromAverages(dxAvg, dyAvg, peakMagnitudeRef.current, configNow.motion.motionThreshold);

    if (confidence < configNow.motion.confidenceThreshold) {
      setAppState("armed");
      detectionSamplesRef.current = [];
      peakMagnitudeRef.current = 0;
      return;
    }

    // MVP: надежная классификация только для 4 исходов.
    // mode=8 сейчас использует graceful fallback на mapping4/predictions.
    const predictionId = configNow.mapping4[direction];
    const predictionText = pickPredictionText(configNow, predictionId);

    setAppState("classified");
    lockResult(direction, predictionId, predictionText, confidence);
  }, [lockResult]);

  const startDetectionWindow = useCallback(() => {
    setAppState("motionDetected");
    detectionSamplesRef.current = [];
    peakMagnitudeRef.current = 0;

    if (detectionTimerRef.current) window.clearTimeout(detectionTimerRef.current);
    detectionTimerRef.current = window.setTimeout(() => classifyWindow(), 260);
  }, [classifyWindow]);

  const onMotion = useCallback(
    (e: DeviceMotionEvent) => {
      if (lockedRef.current) return;

      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;
      const t = nowMs();
      const sample: MotionSample = { t, x, y, z };

      const stateNow = appStateRef.current;
      const configNow = configRef.current;

      if (stateNow === "calibrating") {
        calibrationSamplesRef.current.push(sample);
        return;
      }

      const baseline = baselineRef.current;
      if (!baseline) return;

      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dz = z - baseline.z;
      const mag = magnitude3(dx, dy, dz);

      if (stateNow === "armed") {
        if (mag >= configNow.motion.motionThreshold) {
          startDetectionWindow();
          detectionSamplesRef.current.push(sample);
          peakMagnitudeRef.current = Math.max(peakMagnitudeRef.current, mag);
        }
        return;
      }

      if (stateNow === "motionDetected") {
        detectionSamplesRef.current.push(sample);
        peakMagnitudeRef.current = Math.max(peakMagnitudeRef.current, mag);
      }
    },
    [startDetectionWindow]
  );

  const attachListener = useCallback(() => {
    if (listenerAttachedRef.current) return;
    window.addEventListener("devicemotion", onMotion as EventListener, { passive: true });
    listenerAttachedRef.current = true;
  }, [onMotion]);

  const detachListener = useCallback(() => {
    if (!listenerAttachedRef.current) return;
    window.removeEventListener("devicemotion", onMotion as EventListener);
    listenerAttachedRef.current = false;
  }, [onMotion]);

  const startCalibration = useCallback(() => {
    if (lockedRef.current) return;

    setAppState("calibrating");
    calibrationSamplesRef.current = [];
    baselineRef.current = null;

    const configNow = configRef.current;
    const duration = Math.max(200, configNow.motion.calibrationMs);

    if (calibrateTimerRef.current) window.clearTimeout(calibrateTimerRef.current);
    calibrateTimerRef.current = window.setTimeout(() => {
      const samples = calibrationSamplesRef.current;
      baselineRef.current = meanSample(samples);
      setAppState("armed");
    }, duration);
  }, []);

  const startCountdown = useCallback(() => {
    if (lockedRef.current) return;

    clearTimers();
    setPermissionError(null);
    setAppState("countdown");

    const configNow = configRef.current;
    const total = Math.max(1, Math.floor(configNow.motion.countdownSeconds));
    setCountdownValue(total);

    countdownTimerRef.current = window.setInterval(() => {
      setCountdownValue((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearTimers();
          startCalibration();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [clearTimers, startCalibration]);

  const startArming = useCallback(() => {
    if (!sensorAvailable) {
      setPermissionError("Датчики движения недоступны на этом устройстве/в этом браузере.");
      return;
    }
    if (!permissionGrantedRef.current) {
      setPermissionError("Сначала разрешите доступ к датчикам (кнопка включения).");
      return;
    }

    attachListener();
    startCountdown();
  }, [attachListener, sensorAvailable, startCountdown]);

  const enableSensors = useCallback(async () => {
    setPermissionError(null);

    if (!sensorAvailable) {
      setPermissionError("Датчики движения недоступны на этом устройстве/в этом браузере.");
      return;
    }

    if (lockedRef.current) return;

    if (isIossafariPermissionFlowSupported()) {
      setAppState("requestingPermission");
      try {
        const w = window as unknown as {
          DeviceMotionEvent?: { requestPermission?: () => Promise<"granted" | "denied"> };
        };
        const res = await w.DeviceMotionEvent!.requestPermission!();
        if (res !== "granted") {
          setAppState("idle");
          setPermissionGranted(false);
          permissionGrantedRef.current = false;
          setPermissionError("Доступ к датчикам не разрешен. Проверьте настройки Safari и попробуйте снова.");
          return;
        }
      } catch {
        setAppState("idle");
        setPermissionGranted(false);
        permissionGrantedRef.current = false;
        setPermissionError("Не удалось запросить разрешение на датчики. Попробуйте снова.");
        return;
      }
    }

    setPermissionGranted(true);
    permissionGrantedRef.current = true;

    // В MVP включение датчиков сразу запускает sequence.
    attachListener();
    startCountdown();
  }, [attachListener, sensorAvailable, startCountdown]);

  const resetClassifier = useCallback(() => {
    clearTimers();
    detachListener();

    setAppState("idle");
    setCountdownValue(0);
    setPermissionError(null);

    setClassifiedDirection(null);
    setClassifiedResultIndex(null);
    setSelectedPredictionText(null);
    setConfidenceScore(null);

    baselineRef.current = null;
    calibrationSamplesRef.current = [];
    detectionSamplesRef.current = [];
    peakMagnitudeRef.current = 0;
    lockedRef.current = false;

    resetHiddenState();
  }, [clearTimers, detachListener, resetHiddenState]);

  useEffect(() => {
    return () => {
      clearTimers();
      detachListener();
    };
  }, [clearTimers, detachListener]);

  const experimentalNote = config.mode === 8 ? "mode=8: experimental placeholder (сейчас используется 4-direction fallback)" : null;

  return {
    appState,
    countdownValue,
    sensorAvailable,
    permissionGranted,
    permissionError,
    classifiedDirection,
    classifiedResultIndex,
    selectedPredictionText,
    confidenceScore,
    experimentalNote,
    enableSensors,
    startArming,
    resetClassifier
  };
}
