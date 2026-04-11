import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { makeUserCode, safeEqual } from "./ids.js";
import { isValidConfig } from "./validate.js";
import { DEFAULT_CONFIG } from "./defaultConfig.js";
import { createStore } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "20mb" }));

const store = createStore({
  filePath: process.env.STORE_PATH
});

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function isValidCode(code) {
  if (!code) return false;
  if (code.length !== 5) return false;
  // a-z, 0-9 only (case-insensitive)
  return /^[A-Z0-9]{5}$/.test(code);
}

function requireMaster(req, res) {
  const user = process.env.MASTER_USER || "master";
  const pass = process.env.MASTER_PASS || "master123";

  const auth = req.header("authorization") || "";
  if (!auth.startsWith("Basic ")) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }

  let decoded = "";
  try {
    decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
  } catch {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }

  const idx = decoded.indexOf(":");
  if (idx <= 0) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }

  const gotUser = decoded.slice(0, idx);
  const gotPass = decoded.slice(idx + 1);

  if (!safeEqual(gotUser, user) || !safeEqual(gotPass, pass)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }

  return true;
}

function normalizeConfig(input) {
  if (!isValidConfig(input)) return DEFAULT_CONFIG;

  // v1 -> v2 migration (keep mode, keep any saved images)
  if (input.version === 1) {
    const byId = new Map();
    for (const p of input.predictions || []) byId.set(Number(p.id), p);

    return {
      version: 2,
      mode: input.mode === 8 ? 8 : 4,
      predictions: DEFAULT_CONFIG.predictions.map((base) => {
        const prev = byId.get(base.id);
        return {
          id: base.id,
          label: base.label,
          imageDataUrl: String(prev?.imageDataUrl || "")
        };
      }),
      motion: {
        calibrationMs: Number(input.motion?.calibrationMs || DEFAULT_CONFIG.motion.calibrationMs),
        motionThreshold: Number(input.motion?.motionThreshold || DEFAULT_CONFIG.motion.motionThreshold),
        fastFlipMs: Number(DEFAULT_CONFIG.motion.fastFlipMs)
      }
    };
  }

  // v2: lightly normalize fields
  const mode = input.mode === 8 ? 8 : 4;
  const preds = Array.isArray(input.predictions) ? input.predictions : [];
  const byId = new Map();
  for (const p of preds) byId.set(Number(p?.id), p);

  return {
    version: 2,
    mode,
    predictions: DEFAULT_CONFIG.predictions.map((base) => {
      const prev = byId.get(base.id);
      return {
        id: base.id,
        label: base.label,
        imageDataUrl: String(prev?.imageDataUrl || "")
      };
    }),
    motion: {
      calibrationMs: Number(input.motion?.calibrationMs || DEFAULT_CONFIG.motion.calibrationMs),
      motionThreshold: Number(input.motion?.motionThreshold || DEFAULT_CONFIG.motion.motionThreshold),
      fastFlipMs: Number(input.motion?.fastFlipMs || DEFAULT_CONFIG.motion.fastFlipMs)
    }
  };
}

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, storePath: store.filePath, usersCount: store.listUsers().length });
});

// Master: list users
app.get("/api/master/users", async (req, res) => {
  if (!requireMaster(req, res)) return;
  const users = store
    .listUsers()
    .map((u) => ({ code: u.code, createdAt: u.createdAt, updatedAt: u.updatedAt }))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  res.json({ users });
});

// Master: create user (by code or random)
app.post("/api/master/users", async (req, res) => {
  if (!requireMaster(req, res)) return;

  let code = normalizeCode(req.body?.code);
  if (code) {
    if (!isValidCode(code)) return res.status(400).json({ error: "invalid_code" });
    if (store.getUser(code)) return res.status(409).json({ error: "already_exists" });
  } else {
    code = makeUserCode(5);
    for (let i = 0; i < 30; i++) {
      if (!store.getUser(code)) break;
      code = makeUserCode(5);
    }
    if (store.getUser(code)) return res.status(500).json({ error: "could_not_allocate_code" });
  }

  const config = normalizeConfig(req.body?.config);
  store.setUser(code, {
    code,
    config,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  res.json({ code });
});

// Master: delete user (code can be reused after delete)
app.delete("/api/master/users/:code", async (req, res) => {
  if (!requireMaster(req, res)) return;
  const code = normalizeCode(req.params.code);
  if (!isValidCode(code)) return res.status(400).json({ error: "invalid_code" });
  const ok = store.deleteUser(code);
  if (!ok) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

// Public: spectator/admin config load
app.get("/api/users/:code/config", async (req, res) => {
  const code = normalizeCode(req.params.code);
  const user = store.getUser(code);
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json({ config: normalizeConfig(user.config), updatedAt: user.updatedAt });
});

// Admin (no auth in MVP): save config
app.put("/api/users/:code/config", async (req, res) => {
  const code = normalizeCode(req.params.code);
  const user = store.getUser(code);
  if (!user) return res.status(404).json({ error: "not_found" });

  const config = normalizeConfig(req.body?.config);
  store.updateUser(code, (prev) => ({
    ...prev,
    config,
    updatedAt: Date.now()
  }));

  res.json({ ok: true });
});

const distDir = path.resolve(__dirname, "..", "dist");
app.use(express.static(distDir));
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`server listening on :${port}`);
  console.log(`store file: ${store.filePath}`);
});

