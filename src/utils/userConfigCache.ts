import type { AppConfig } from "../types/config";

const PREFIX = "trigger-user-config-cache-v1:";

function keyFor(code: string) {
  return `${PREFIX}${code}`;
}

export function loadCachedUserConfig(code: string): AppConfig | null {
  try {
    const raw = sessionStorage.getItem(keyFor(code));
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    return data as AppConfig;
  } catch {
    return null;
  }
}

export function saveCachedUserConfig(code: string, config: AppConfig) {
  try {
    sessionStorage.setItem(keyFor(code), JSON.stringify(config));
  } catch {
    // ignore (storage quota, private mode, etc.)
  }
}

