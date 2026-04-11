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
      users: {}
    });

  function persist() {
    writeJsonAtomic(filePath, state);
  }

  function getUser(code) {
    return state.users[code] || null;
  }

  function setUser(code, user) {
    state.users[code] = user;
    persist();
  }

  function updateUser(code, updater) {
    const prev = getUser(code);
    if (!prev) return null;
    const next = updater(prev);
    state.users[code] = next;
    persist();
    return next;
  }

  function listUsers() {
    return Object.values(state.users);
  }

  function deleteUser(code) {
    if (!state.users[code]) return false;
    delete state.users[code];
    persist();
    return true;
  }

  return {
    filePath,
    getUser,
    setUser,
    updateUser,
    listUsers,
    deleteUser
  };
}
