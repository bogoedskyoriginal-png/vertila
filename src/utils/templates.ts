import type { PredictionTemplate } from "../types/templates";

const LS_TEMPLATES_KEY = "magic-prediction-templates-v1";

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function safeGetLs(key: string) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetLs(key: string, value: string) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function loadTemplates(): PredictionTemplate[] {
  const raw = safeGetLs(LS_TEMPLATES_KEY);
  if (!raw) return [];
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(Boolean) as PredictionTemplate[];
}

export function saveTemplates(templates: PredictionTemplate[]) {
  safeSetLs(LS_TEMPLATES_KEY, JSON.stringify(templates));
}

export function addTemplate(t: PredictionTemplate) {
  const all = loadTemplates();
  all.unshift(t);
  saveTemplates(all);
}

export function deleteTemplate(id: string) {
  const all = loadTemplates();
  saveTemplates(all.filter((t) => t.id !== id));
}

export function makeTemplateId(): string {
  // short enough, collision-resistant for local use
  return Math.random().toString(36).slice(2, 10);
}

