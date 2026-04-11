import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPool, ensureSchema } from "./db.js";
import { makeAdminKey, makeSessionId, makeShowId, safeEqual } from "./ids.js";
import { isValidConfig } from "./validate.js";
import { DEFAULT_CONFIG } from "./defaultConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));

let pool;

function requireMaster(req, res) {
  const token = process.env.MASTER_TOKEN;
  if (!token) {
    res.status(501).json({ error: "MASTER_TOKEN is not configured" });
    return false;
  }
  const got = req.header("x-master-token") || "";
  if (!got || !safeEqual(got, token)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

async function loadShow(id) {
  const r = await pool.query("select id, admin_key, config, updated_at from shows where id=$1", [id]);
  return r.rows[0] || null;
}

function publicConfig(config) {
  return {
    ...config,
    predictions: (config.predictions || []).map((p) => ({ id: p.id, label: p.label }))
  };
}

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/master/shows", async (req, res) => {
  if (!requireMaster(req, res)) return;

  const config = req.body?.config;
  const finalConfig = isValidConfig(config) ? config : DEFAULT_CONFIG;

  let id = makeShowId();
  for (let i = 0; i < 5; i++) {
    const exists = await pool.query("select 1 from shows where id=$1", [id]);
    if (exists.rowCount === 0) break;
    id = makeShowId();
  }

  const adminKey = makeAdminKey();
  await pool.query("insert into shows(id, admin_key, config) values ($1,$2,$3)", [id, adminKey, finalConfig]);

  res.json({ showId: id, adminKey });
});

app.get("/api/shows/:id/config", async (req, res) => {
  const id = String(req.params.id || "");
  const show = await loadShow(id);
  if (!show) return res.status(404).json({ error: "not_found" });
  res.json({ config: publicConfig(show.config), updatedAt: show.updated_at });
});

app.get("/api/shows/:id/admin", async (req, res) => {
  const id = String(req.params.id || "");
  const show = await loadShow(id);
  if (!show) return res.status(404).json({ error: "not_found" });

  const key = req.header("x-admin-key") || "";
  if (!key || !safeEqual(key, show.admin_key)) return res.status(401).json({ error: "unauthorized" });

  res.json({ config: show.config, updatedAt: show.updated_at });
});

app.put("/api/shows/:id/admin", async (req, res) => {
  const id = String(req.params.id || "");
  const show = await loadShow(id);
  if (!show) return res.status(404).json({ error: "not_found" });

  const key = req.header("x-admin-key") || "";
  if (!key || !safeEqual(key, show.admin_key)) return res.status(401).json({ error: "unauthorized" });

  const config = req.body?.config;
  if (!isValidConfig(config)) return res.status(400).json({ error: "invalid_config" });

  await pool.query("update shows set config=$2, updated_at=now() where id=$1", [id, config]);
  res.json({ ok: true });
});

app.post("/api/shows/:id/session", async (req, res) => {
  const id = String(req.params.id || "");
  const show = await loadShow(id);
  if (!show) return res.status(404).json({ error: "not_found" });

  const sessionId = makeSessionId();
  await pool.query("insert into sessions(show_id, session_id, used) values ($1,$2,false)", [id, sessionId]);
  res.json({ sessionId });
});

app.post("/api/shows/:id/reveal", async (req, res) => {
  const id = String(req.params.id || "");
  const show = await loadShow(id);
  if (!show) return res.status(404).json({ error: "not_found" });

  const sessionId = String(req.body?.sessionId || "");
  const resultIndex = Number(req.body?.resultIndex);
  if (!sessionId || !Number.isFinite(resultIndex)) return res.status(400).json({ error: "invalid_request" });

  const sess = await pool.query("select used, created_at from sessions where show_id=$1 and session_id=$2", [id, sessionId]);
  if (sess.rowCount === 0) return res.status(400).json({ error: "session_invalid" });
  if (sess.rows[0].used) return res.status(400).json({ error: "session_used" });

  const createdAt = new Date(sess.rows[0].created_at);
  if (Date.now() - createdAt.getTime() > 20 * 60 * 1000) {
    return res.status(400).json({ error: "session_expired" });
  }

  const pred = (show.config.predictions || []).find((p) => Number(p.id) === resultIndex);
  if (!pred) return res.status(404).json({ error: "prediction_not_found" });

  await pool.query(
    "update sessions set used=true, used_at=now(), result_index=$3 where show_id=$1 and session_id=$2",
    [id, sessionId, resultIndex]
  );

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

async function start() {
  pool = getPool();
  await ensureSchema(pool);

  const port = Number(process.env.PORT || 8787);
  app.listen(port, () => {
    console.log(`server listening on :${port}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});