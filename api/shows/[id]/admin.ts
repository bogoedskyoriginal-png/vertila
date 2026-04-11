import type { VercelRequest, VercelResponse } from "@vercel/node";
import { badRequest, json, notFound, serverMisconfigured, unauthorized } from "../../_lib/response";
import { getJson, hasKvConfigured, setJson } from "../../_lib/storage";
import { safeEqual } from "../../_lib/ids";
import type { AppConfig, StoredShow } from "../../_lib/types";

function isValidConfig(value: unknown): value is AppConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AppConfig>;
  return v.version === 1 && (v.mode === 4 || v.mode === 8) && Array.isArray(v.predictions);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!hasKvConfigured()) {
    return serverMisconfigured(res, "Vercel KV is not configured.");
  }

  const id = String(req.query.id || "");
  if (!id) return notFound(res);

  const show = await getJson<StoredShow>(`show:${id}`);
  if (!show) return notFound(res);

  const adminKey = String(req.headers["x-admin-key"] || "");
  if (!adminKey || !safeEqual(adminKey, show.adminKey)) return unauthorized(res);

  if (req.method === "GET") {
    return json(res, 200, { config: show.config, updatedAt: show.updatedAt });
  }

  if (req.method === "PUT") {
    const config = req.body?.config as unknown;
    if (!isValidConfig(config)) return badRequest(res, "invalid_config");

    const next: StoredShow = {
      ...show,
      config,
      updatedAt: Date.now()
    };
    await setJson(`show:${id}`, next);
    return json(res, 200, { ok: true, updatedAt: next.updatedAt });
  }

  return json(res, 405, { error: "method_not_allowed" });
}