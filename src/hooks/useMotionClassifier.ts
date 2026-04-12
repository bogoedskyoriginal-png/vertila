import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig, Direction4, FlipSpeed, PredictionId } from "../types/config";
import type { FlipResult, MotionFlowState, MotionSample } from "../types/motion";
import { dominantDirection4, magnitude3, meanSample } from "../utils/motionMath";

type Baseline = { x: number; y: number; z: number };

type HookResult = {
  state: MotionFlowState;
  sensorAvailable: boolean;
  permissionGranted: boolean;
  permissionError: string | null;
  result: FlipResult | null;
  arm: () => Promise<void>;
  reset: () => void;
};

function nowMs() {
  return performance.now();
}

function isIossafariPermissionFlowSupported(): boolean {
  const w = window as unknown as { DeviceMotionEvent?: unknown };
  const DME = w.DeviceMotionEvent as { requestPermission?: () => Promise<"granted" | "denied"> } | undefined;
  return typeof DME?.requestPermission === "function";
}

async function requestIosMotionPermission(): Promise<boolean> {
  const w = window as any;

  const reqMotion = w.DeviceMotionEvent?.requestPermission as undefined | (() => Promise<"granted" | "denied">);
  const reqOrient = w.DeviceOrientationEvent?.requestPermission as undefined | (() => Promise<"granted" | "denied">);

  // Some iOS versions are picky; try both permission APIs when present.
  try {
    if (typeof reqMotion === "function") {
      const r = await reqMotion();
      if (r === "granted") return true;
    }
  } catch {
    // ignore, try orientation
  }

  try {
    if (typeof reqOrient === "function") {
      const r = await reqOrient();
      if (r === "granted") return true;
    }
  } catch {
    // ignore
  }

  return false;
}

function predictionIdFor(side: Direction4, speed: FlipSpeed, mode: 4 | 8): PredictionId {
  if (mode === 4) {
    return (side === "top" ? 1 : side === "right" ? 2 : side === "bottom" ? 3 : 4) as PredictionId;
  }
  const base = side === "top" ? 1 : side === "right" ? 2 : side === "bottom" ? 3 : 4;
  return (speed === "fast" ? base + 4 : base) as PredictionId;
}

export function useMotionClassifier(config: AppConfig): HookResult {
  const [state, setState] = useState<MotionFlowState>("idle");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [result, setResult] = useState<FlipResult | null>(null);

  const sensorAvailable = useMemo(() => {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  }, []);

  const configRef = useRef<AppConfig>(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const baselineRef = useRef<Baseline | null>(null);
  const samplesRef = useRef<MotionSample[]>([]);
  const lastEventAtRef = useRef<number>(0);

  const armedAtRef = useRef<number>(0);
  const calibrationCollectAfterRef = useRef<number>(0);
  const motionStartRef = useRef<number | null>(null);
  const motionEndCandidateRef = useRef<number | null>(null);
  const peakDeltaRef = useRef<number>(0);

  const listenerAttachedRef = useRef(false);
  const lockedRef = useRef(false);

  // stateRef is used inside the motion handler without re-attaching the listener.
  const stateRef = useRef<MotionFlowState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handler = useCallback(
    (e: DeviceMotionEvent) => {
      if (lockedRef.current) return;
      const st = stateRef.current;
      if (st !== "calibrating" && st !== "armed" && st !== "detecting") return;

      const a = e.accelerationIncludingGravity;
      if (!a) return;

      lastEventAtRef.current = Date.now();

      const x = Number(a.x || 0);
      const y = Number(a.y || 0);
      const z = Number(a.z || 0);
      const t = nowMs();

      if (st === "calibrating") {
        if (t < calibrationCollectAfterRef.current) return;
        samplesRef.current.push({ t, x, y, z });
        return;
      }

      const baseline = baselineRef.current;
      if (!baseline) return;
      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dz = z - baseline.z;
      const delta = magnitude3(dx, dy, dz);

      const { motionThreshold } = configRef.current.motion;

      if (st === "armed") {
        if (delta >= motionThreshold) {
          motionStartRef.current = t;
          motionEndCandidateRef.current = null;
          peakDeltaRef.current = delta;
          samplesRef.current = [{ t, x, y, z }];
          setState("detecting");
        }
        return;
      }

      if (st === "detecting") {
        samplesRef.current.push({ t, x, y, z });
        peakDeltaRef.current = Math.max(peakDeltaRef.current, delta);

        const quietThreshold = motionThreshold * 0.6;
        if (delta < quietThreshold) {
          if (!motionEndCandidateRef.current) motionEndCandidateRef.current = t;
        } else {
          motionEndCandidateRef.current = null;
        }

        const startedAt = motionStartRef.current ?? t;
        const endCandidateAt = motionEndCandidateRef.current;
        const quietLongEnough = endCandidateAt ? t - endCandidateAt >= 120 : false;
        const maxWindowReached = t - startedAt >= 1200;

        if (!quietLongEnough && !maxWindowReached) return;

        const durationMs = Math.max(1, Math.round(t - startedAt));
        const mean = meanSample(samplesRef.current);
        const dxAvg = mean.x - baseline.x;
        const dyAvg = mean.y - baseline.y;

        const side = dominantDirection4(dxAvg, dyAvg);
        const fastFlipMs = Math.max(50, Number(configRef.current.motion.fastFlipMs || 350));
        const speed: FlipSpeed = durationMs <= fastFlipMs ? "fast" : "slow";
        const predictionId = predictionIdFor(side, speed, configRef.current.mode);

        lockedRef.current = true;
        setState("locked");
        setResult({ side, speed, durationMs, predictionId });
      }
    },
    []
  );

  const attach = useCallback(() => {
    if (listenerAttachedRef.current) return;
    listenerAttachedRef.current = true;
    window.addEventListener("devicemotion", handler, { passive: true });
  }, [handler]);

  const detach = useCallback(() => {
    if (!listenerAttachedRef.current) return;
    listenerAttachedRef.current = false;
    window.removeEventListener("devicemotion", handler);
  }, [handler]);

  const calibrate = useCallback(() => {
    samplesRef.current = [];
    baselineRef.current = null;
    lockedRef.current = false;
    setResult(null);

    setState("calibrating");
    const calibrationMs = Math.max(150, Number(configRef.current.motion.calibrationMs || 350));
    armedAtRef.current = nowMs();
    // Give a short "settle" window so the magician can put the phone face-down right after the double tap.
    calibrationCollectAfterRef.current = armedAtRef.current + 650;

    window.setTimeout(() => {
      const base = meanSample(samplesRef.current);
      baselineRef.current = base;
      samplesRef.current = [];
      motionStartRef.current = null;
      motionEndCandidateRef.current = null;
      peakDeltaRef.current = 0;
      setState("armed");
    }, 650 + calibrationMs);
  }, []);

  const arm = useCallback(async () => {
    setPermissionError(null);

    if (!sensorAvailable) {
      setPermissionError("Датчики движения недоступны на этом устройстве/в этом браузере.");
      return;
    }

    if (lockedRef.current) return;

    if (isIossafariPermissionFlowSupported()) {
      setState("requestingPermission");
      try {
        const ok = await requestIosMotionPermission();
        if (!ok) {
          setState("idle");
          setPermissionGranted(false);
          setPermissionError(
            "Доступ к датчикам не разрешён. Откройте Safari → aA → Настройки веб‑сайта → Motion & Orientation Access → Allow."
          );
          return;
        }
      } catch (e) {
        setState("idle");
        setPermissionGranted(false);
        setPermissionError("Не удалось запросить разрешение на датчики. Проверьте, что открыто по HTTPS в Safari (iPhone).");
        return;
      }
    }

    setPermissionGranted(true);
    attach();
    calibrate();

    // If we got permission but no events arrive, tell the user what to toggle.
    const startedAt = Date.now();
    window.setTimeout(() => {
      if (lockedRef.current) return;
      if (Date.now() - startedAt < 800) return;
      if (!lastEventAtRef.current || Date.now() - lastEventAtRef.current > 1200) {
        setPermissionError(
          "Датчики не отдают события. Откройте именно Safari (не встроенный браузер) и включите Motion & Orientation Access для сайта."
        );
        setState("idle");
        setPermissionGranted(false);
      }
    }, 1400);
  }, [attach, calibrate, sensorAvailable]);

  const reset = useCallback(() => {
    setPermissionError(null);
    setResult(null);
    baselineRef.current = null;
    samplesRef.current = [];
    motionStartRef.current = null;
    motionEndCandidateRef.current = null;
    peakDeltaRef.current = 0;
    lockedRef.current = false;
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      detach();
    };
  }, [detach]);

  return {
    state,
    sensorAvailable,
    permissionGranted,
    permissionError,
    result,
    arm,
    reset
  };
}
