import type { AppConfig } from "../types/config";
import { DEFAULT_CONFIG } from "./defaultConfig";

const STORAGE_KEY = "magic-draw-config-v1";

function isValidConfig(value: unknown): value is AppConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AppConfig>;
  return v.version === 1 && (v.mode === 4 || v.mode === 8) && Array.isArray(v.predictions);
}

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidConfig(parsed)) return DEFAULT_CONFIG;
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_CONFIG;
  }
}

function mergeWithDefaults(config: AppConfig): AppConfig {
  // Мягкая совместимость: если чего-то не хватает — дотягиваем из дефолтов.
  // Не пытаемся делать сложные миграции на этапе MVP.
  const merged: AppConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    motion: { ...DEFAULT_CONFIG.motion, ...config.motion },
    ui: { ...DEFAULT_CONFIG.ui, ...config.ui },
    mapping4: { ...DEFAULT_CONFIG.mapping4, ...config.mapping4 },
    mapping8: config.mapping8 ?? DEFAULT_CONFIG.mapping8
  };

  const byId = new Map(merged.predictions.map((p) => [p.id, p]));
  merged.predictions = DEFAULT_CONFIG.predictions.map((p) => ({
    ...p,
    ...(byId.get(p.id) ?? {})
  }));

  return merged;
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetConfig() {
  localStorage.removeItem(STORAGE_KEY);
}