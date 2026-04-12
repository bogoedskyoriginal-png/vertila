import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig, Direction4, FlipSpeed, PredictionId } from "../types/config";
import type { FlipResult, MotionFlowState, MotionSample } from "../types/motion";
import { dominantDirection4, mean, meanSample } from "../utils/motionMath";

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

  try {
    if (typeof reqMotion === "function") {
      const r = await reqMotion();
      if (r === "granted") return true;
    }
  } catch {
    // ignore
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

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function normalize3(x: number, y: number, z: number) {
  const m = Math.sqrt(x * x + y * y + z * z) || 1;
  return { x: x / m, y: y / m, z: z / m };
}

function dot3(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
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
  const baselineUnitRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const samplesRef = useRef<MotionSample[]>([]);
  const lastEventAtRef = useRef<number>(0);

  const listenerAttachedRef = useRef(false);
  const lockedRef = useRef(false);

  const swingCountRef = useRef(0);
  const inSwingRef = useRef(false);
  const flipStartAtRef = useRef<number | null>(null);
  const flipSideRef = useRef<Direction4 | null>(null);
  const flipSpeedRef = useRef<FlipSpeed | null>(null);
  const flipDecidedRef = useRef(false);
  const flipDxRef = useRef<number[]>([]);
  const flipDyRef = useRef<number[]>([]);

  const countdownTimerRef = useRef<number | null>(null);
  const settleAndCalibrateTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) window.clearTimeout(countdownTimerRef.current);
    if (settleAndCalibrateTimerRef.current) window.clearTimeout(settleAndCalibrateTimerRef.current);
    countdownTimerRef.current = null;
    settleAndCalibrateTimerRef.current = null;
  }, []);

  const stateRef = useRef<MotionFlowState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handler = useCallback((e: DeviceMotionEvent) => {
    if (lockedRef.current) return;

    const a = e.accelerationIncludingGravity;
    if (!a) return;

    // heartbeat (even during countdown)
    lastEventAtRef.current = Date.now();

    const st = stateRef.current;
    if (st !== "calibrating" && st !== "armed" && st !== "preview") return;

    const x = Number(a.x || 0);
    const y = Number(a.y || 0);
    const z = Number(a.z || 0);
    const t = nowMs();

    if (st === "calibrating") {
      samplesRef.current.push({ t, x, y, z });
      return;
    }

    const baseline = baselineRef.current;
    const baseU = baselineUnitRef.current;
    if (!baseline || !baseU) return;

    // Angle from baseline
    const curU = normalize3(x, y, z);
    const cos = clamp(dot3(baseU, curU), -1, 1);
    const angleDeg = (Math.acos(cos) * 180) / Math.PI;

    // Full flip from baseline to opposite
    const flipped = cos <= -0.85;

    // Direction: dominant delta in device x/y vs baseline
    const dx = x - baseline.x;
    const dy = y - baseline.y;
    const side = dominantDirection4(dx, dy);

    const swingAngle = 30;
    const resetAngle = 14;

    const mode = configRef.current.mode;
    const outputMode = configRef.current.outputMode || "drawings";
    const strategy = outputMode === "links" ? "tilts" : configRef.current.motion?.mode8Strategy || "tilts";

    // Mode=8 by speed: require a full flip, classify speed by duration.
    if (mode === 8 && strategy === "speed") {
      // Decide speed early (near start of motion) to avoid any visible "switching" later.
      // Previous (for rollback): startAngle=16, decideAngle=28, fastStartMs≈fastFlipMs*0.35 (cap 240ms)
      // New: decide around ~35–40° so the prediction appears earlier during the flip, not only at the very end.
      const startAngle = 12;
      const decideAngle = 38;
      const fastStartMs = Math.max(110, Math.min(220, Number(configRef.current.motion.fastFlipMs || 450) * 0.30));
      const slowMinMs = Math.max(fastStartMs + 70, Math.min(420, Number(configRef.current.motion.fastFlipMs || 450) * 0.55));

      if (flipStartAtRef.current === null) {
        if (angleDeg >= startAngle) {
          flipStartAtRef.current = t;
          flipSideRef.current = null;
          flipSpeedRef.current = null;
          flipDecidedRef.current = false;
          flipDxRef.current = [];
          flipDyRef.current = [];
        }
      } else {
        flipDxRef.current.push(dx);
        flipDyRef.current.push(dy);

        if (!flipDecidedRef.current && angleDeg >= decideAngle) {
          const dt = Math.max(0, t - flipStartAtRef.current);
          // Stricter requirements:
          // - dt <= fastStartMs => fast
          // - dt >= slowMinMs  => slow
          // - otherwise: keep waiting (prevents borderline flips from being mis-classified too early)
          const speed: FlipSpeed | null = dt <= fastStartMs ? "fast" : dt >= slowMinMs ? "slow" : null;
          if (speed) {
            const mx = mean(flipDxRef.current);
            const my = mean(flipDyRef.current);
            flipSideRef.current = dominantDirection4(mx, my);
            flipSpeedRef.current = speed;
            flipDecidedRef.current = true;

            const finalSide = flipSideRef.current;
            const predictionId = predictionIdFor(finalSide, speed, 8);
            setResult({ side: finalSide, speed, durationMs: dt, predictionId });
            setState("preview");
          }
        }

        if (flipped) {
          const durationMs = Math.max(0, t - flipStartAtRef.current);
          const fastFlipMs = Math.max(120, Number(configRef.current.motion.fastFlipMs || 450));

          if (!flipDecidedRef.current) {
            const mx = mean(flipDxRef.current);
            const my = mean(flipDyRef.current);
            flipSideRef.current = dominantDirection4(mx, my);
            flipSpeedRef.current = durationMs <= fastFlipMs ? "fast" : "slow";
            flipDecidedRef.current = true;
          }

          const finalSide = flipSideRef.current || side;
          const speed = flipSpeedRef.current || (durationMs <= fastFlipMs ? "fast" : "slow");
          const predictionId = predictionIdFor(finalSide, speed, 8);

          setResult({ side: finalSide, speed, durationMs, predictionId });
          lockedRef.current = true;
          setState("locked");
          return;
        }

        // aborted flip
        if (angleDeg <= resetAngle) {
          flipStartAtRef.current = null;
          flipSideRef.current = null;
          flipSpeedRef.current = null;
          flipDecidedRef.current = false;
          flipDxRef.current = [];
          flipDyRef.current = [];
        }
      }

      return;
    }

    // Swing detection with hysteresis: count excursions beyond swingAngle.
    if (!inSwingRef.current && angleDeg >= swingAngle) {
      inSwingRef.current = true;
      swingCountRef.current += 1;

      const count = swingCountRef.current;
      const speed: FlipSpeed = mode === 8 && count >= 2 ? "fast" : "slow";
      const predictionId = predictionIdFor(side, speed, mode);

      setResult({ side, speed, durationMs: 0, predictionId });

      if (outputMode === "links" && mode === 4) {
        lockedRef.current = true;
        setState("locked");
      } else if (count >= 2 && mode === 8) {
        lockedRef.current = true;
        setState("locked");
      } else {
        setState("preview");
      }
    }

    if (inSwingRef.current && angleDeg <= resetAngle) {
      inSwingRef.current = false;
    }

    // If performer fully flips after 1st swing — lock the preview.
    if (!lockedRef.current && st === "preview" && swingCountRef.current === 1 && flipped) {
      lockedRef.current = true;
      setState("locked");
    }
  }, []);

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
    clearTimers();
    samplesRef.current = [];
    baselineRef.current = null;
    baselineUnitRef.current = null;
    swingCountRef.current = 0;
    inSwingRef.current = false;
    flipStartAtRef.current = null;
    flipSideRef.current = null;
    flipSpeedRef.current = null;
    flipDecidedRef.current = false;
    flipDxRef.current = [];
    flipDyRef.current = [];
    lockedRef.current = false;
    setResult(null);

    setState("calibrating");

    const calibrationMs = Math.max(150, Number(configRef.current.motion.calibrationMs || 350));
    const startAt = nowMs();
    const settleMs = 650;

    // collect after settle
    settleAndCalibrateTimerRef.current = window.setTimeout(() => {
      // nothing, collection already happens in handler while calibrating
    }, settleMs);

    window.setTimeout(() => {
      const base = meanSample(samplesRef.current.filter((s) => s.t >= startAt + settleMs));
      baselineRef.current = base;
      baselineUnitRef.current = normalize3(base.x, base.y, base.z);
      samplesRef.current = [];
      swingCountRef.current = 0;
      inSwingRef.current = false;
      setState("armed");
    }, settleMs + calibrationMs);
  }, [clearTimers]);

  const arm = useCallback(async () => {
    setPermissionError(null);

    if (!sensorAvailable) {
      setPermissionError("Датчики движения недоступны на этом устройстве/в этом браузере.");
      return;
    }

    // allow infinite re-arming
    lockedRef.current = false;
    swingCountRef.current = 0;
    inSwingRef.current = false;
    flipStartAtRef.current = null;
    flipSideRef.current = null;
    flipSpeedRef.current = null;
    flipDecidedRef.current = false;
    flipDxRef.current = [];
    flipDyRef.current = [];
    setResult(null);
    clearTimers();

    if (isIossafariPermissionFlowSupported()) {
      setState("requestingPermission");
      try {
        const ok = await requestIosMotionPermission();
        if (!ok) {
          setState("idle");
          setPermissionGranted(false);
          setPermissionError(
            "Доступ к датчикам не разрешён. Safari → aA → Настройки веб‑сайта → Motion & Orientation Access → Allow."
          );
          return;
        }
      } catch {
        setState("idle");
        setPermissionGranted(false);
        setPermissionError("Не удалось запросить разрешение на датчики. Проверьте HTTPS и Safari на iPhone.");
        return;
      }
    }

    setPermissionGranted(true);
    attach();

    setState("countdown");
    const seconds = Math.max(1, Math.floor(Number(configRef.current.motion.countdownSeconds || 5)));
    countdownTimerRef.current = window.setTimeout(() => {
      calibrate();
    }, seconds * 1000);

    const startedAt = Date.now();
    window.setTimeout(() => {
      if (lockedRef.current) return;
      if (Date.now() - startedAt < 800) return;
      if (!lastEventAtRef.current || Date.now() - lastEventAtRef.current > 1200) {
        setPermissionError(
          "Датчики не отдают события. Откройте именно Safari (не встроенный браузер) и включите Motion & Orientation Access для сайта."
        );
      }
    }, 1400);
  }, [attach, calibrate, clearTimers, sensorAvailable]);

  const reset = useCallback(() => {
    clearTimers();
    setPermissionError(null);
    setResult(null);
    baselineRef.current = null;
    baselineUnitRef.current = null;
    samplesRef.current = [];
    swingCountRef.current = 0;
    inSwingRef.current = false;
    flipStartAtRef.current = null;
    flipSideRef.current = null;
    flipSpeedRef.current = null;
    flipDecidedRef.current = false;
    flipDxRef.current = [];
    flipDyRef.current = [];
    lockedRef.current = false;
    setState("idle");
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      detach();
    };
  }, [clearTimers, detach]);

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

