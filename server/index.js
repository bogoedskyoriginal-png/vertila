import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { makeAdminKey, makeSessionId, makeShowCode, safeEqual } from "./ids.js";
import { isValidConfig } from "./validate.js";
import { DEFAULT_CONFIG } from "./defaultConfig.js";
import { createStore } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));

const store = createStore({
  filePath: process.env.STORE_PATH
});

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

function publicConfig(config) {
  return {
    ...config,
    predictions: (config.predictions || []).map((p) => ({ id: p.id, label: p.label }))
  };
}

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, storePath: store.filePath });
});

// Master: create show
app.post("/api/master/shows", async (req, res) => {
  if (!requireMaster(req, res)) return;

  store.cleanupSessions();

  const config = req.body?.config;
  const finalConfig = isValidConfig(config) ? config : DEFAULT_CONFIG;

  let code = makeShowCode(5);
  for (let i = 0; i < 30; i++) {
    if (!store.getShow(code)) break;
    code = makeShowCode(5);
  }

  if (store.getShow(code)) {
    return res.status(500).json({ error: "could_not_allocate_code" });
  }

  const adminKey = makeAdminKey();
  store.setShow(code, {
    code,
    adminKey,
    config: finalConfig,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  res.json({ showCode: code, showId: code, adminKey });
});

app.get("/api/shows/:code/config", async (req, res) => {
  store.cleanupSessions();

  const code = String(req.params.code || "");
  const show = store.getShow(code);
  if (!show) return res.status(404).json({ error: "not_found" });
  res.json({ config: publicConfig(show.config), updatedAt: show.updatedAt });
});

app.get("/api/shows/:code/admin", async (req, res) => {
  store.cleanupSessions();

  const code = String(req.params.code || "");
  const show = store.getShow(code);
  if (!show) return res.status(404).json({ error: "not_found" });

  const key = req.header("x-admin-key") || "";
  if (!key || !safeEqual(key, show.adminKey)) return res.status(401).json({ error: "unauthorized" });

  res.json({ config: show.config, updatedAt: show.updatedAt });
});

app.put("/api/shows/:code/admin", async (req, res) => {
  store.cleanupSessions();

  const code = String(req.params.code || "");
  const show = store.getShow(code);
  if (!show) return res.status(404).json({ error: "not_found" });

  const key = req.header("x-admin-key") || "";
  if (!key || !safeEqual(key, show.adminKey)) return res.status(401).json({ error: "unauthorized" });

  const config = req.body?.config;
  if (!isValidConfig(config)) return res.status(400).json({ error: "invalid_config" });

  store.updateShow(code, (prev) => ({
    ...prev,
    config,
    updatedAt: Date.now()
  }));

  res.json({ ok: true });
});

app.post("/api/shows/:code/session", async (req, res) => {
  store.cleanupSessions();

  const code = String(req.params.code || "");
  const show = store.getShow(code);
  if (!show) return res.status(404).json({ error: "not_found" });

  const sessionId = makeSessionId();
  store.createSession(code, sessionId);

  res.json({ sessionId });
});

app.post("/api/shows/:code/reveal", async (req, res) => {
  store.cleanupSessions();

  const code = String(req.params.code || "");
  const show = store.getShow(code);
  if (!show) return res.status(404).json({ error: "not_found" });

  const sessionId = String(req.body?.sessionId || "");
  const resultIndex = Number(req.body?.resultIndex);
  if (!sessionId || !Number.isFinite(resultIndex)) return res.status(400).json({ error: "invalid_request" });

  const sess = store.getSession(code, sessionId);
  if (!sess) return res.status(400).json({ error: "session_invalid" });
  if (sess.used) return res.status(400).json({ error: "session_used" });

  const createdAt = Number(sess.createdAt || 0);
  if (!createdAt || Date.now() - createdAt > 20 * 60 * 1000) {
    return res.status(400).json({ error: "session_expired" });
  }

  const pred = (show.config.predictions || []).find((p) => Number(p.id) === resultIndex);
  if (!pred) return res.status(404).json({ error: "prediction_not_found" });

  store.markSessionUsed(code, sessionId, resultIndex);

  res.json({
    predictionText: String(pred.text || ""),
    predictionImageDataUrl: String(pred.imageDataUrl || "")
  });
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