import fs from "node:fs";
import path from "node:path";

const DEFAULT_PATH = path.resolve(process.cwd(), "data", "store.json");

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJsonAtomic(filePath, value) {
  ensureDir(filePath);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export function createStore(opts = {}) {
  const filePath = opts.filePath || DEFAULT_PATH;

  const state =
    readJson(filePath) ||
    ({
      shows: {},
      sessions: {}
    });

  function persist() {
    writeJsonAtomic(filePath, state);
  }

  function getShow(id) {
    return state.shows[id] || null;
  }

  function setShow(id, show) {
    state.shows[id] = show;
    persist();
  }

  function updateShow(id, updater) {
    const prev = getShow(id);
    if (!prev) return null;
    const next = updater(prev);
    state.shows[id] = next;
    persist();
    return next;
  }

  function createSession(showId, sessionId) {
    const key = `${showId}:${sessionId}`;
    state.sessions[key] = { used: false, createdAt: Date.now() };
    persist();
  }

  function getSession(showId, sessionId) {
    const key = `${showId}:${sessionId}`;
    return state.sessions[key] || null;
  }

  function markSessionUsed(showId, sessionId, resultIndex) {
    const key = `${showId}:${sessionId}`;
    const s = state.sessions[key];
    if (!s) return false;
    s.used = true;
    s.usedAt = Date.now();
    s.resultIndex = resultIndex;
    persist();
    return true;
  }

  function cleanupSessions(maxAgeMs = 20 * 60 * 1000) {
    const now = Date.now();
    let changed = false;
    for (const key of Object.keys(state.sessions)) {
      const s = state.sessions[key];
      const createdAt = Number(s?.createdAt || 0);
      if (!createdAt || now - createdAt > maxAgeMs) {
        delete state.sessions[key];
        changed = true;
      }
    }
    if (changed) persist();
  }

  return {
    filePath,
    getShow,
    setShow,
    updateShow,
    createSession,
    getSession,
    markSessionUsed,
    cleanupSessions
  };
}