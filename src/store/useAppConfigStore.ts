import type { AppConfig } from "../types/config";
import { createSimpleStore, useSimpleStore } from "./simpleStore";
import { loadConfig, resetConfig, saveConfig } from "../utils/storage";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";

const appConfigStore = createSimpleStore<AppConfig>(loadConfig());

export function useAppConfigStore<T>(selector: (config: AppConfig) => T) {
  return useSimpleStore(appConfigStore, selector);
}

export function setAppConfig(next: AppConfig) {
  appConfigStore.set(next);
}

export function updateAppConfig(updater: (prev: AppConfig) => AppConfig) {
  appConfigStore.set(updater);
}

export function persistAppConfig() {
  saveConfig(appConfigStore.get());
}

export function resetAppConfigToDefaults() {
  resetConfig();
  appConfigStore.set(DEFAULT_CONFIG);
}

export function reloadAppConfigFromStorage() {
  appConfigStore.set(loadConfig());
}