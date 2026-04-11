import type { Direction4 } from "../types/config";
import type { MotionSample } from "../types/motion";

export function clamp01(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function mean(samples: number[]) {
  if (samples.length === 0) return 0;
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

export function meanSample(samples: MotionSample[]) {
  return {
    x: mean(samples.map((s) => s.x)),
    y: mean(samples.map((s) => s.y)),
    z: mean(samples.map((s) => s.z))
  };
}

export function magnitude3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

export function dominantDirection4(dxAvg: number, dyAvg: number): Direction4 {
  if (Math.abs(dyAvg) >= Math.abs(dxAvg)) {
    // device Y axis dominant
    return dyAvg >= 0 ? "bottom" : "top";
  }
  return dxAvg >= 0 ? "right" : "left";
}

export function confidenceFromAverages(dxAvg: number, dyAvg: number, peakMagnitude: number, threshold: number) {
  const dominant = Math.max(Math.abs(dxAvg), Math.abs(dyAvg));
  const sum = Math.abs(dxAvg) + Math.abs(dyAvg) + 1e-6;
  const axisConfidence = dominant / sum; // 0.5..1.0+
  const magnitudeBoost = clamp01((peakMagnitude - threshold) / Math.max(0.0001, threshold));
  return clamp01(axisConfidence * 0.8 + magnitudeBoost * 0.2);
}
