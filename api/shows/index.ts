import type { VercelRequest, VercelResponse } from "@vercel/node";
import { badRequest, json, serverMisconfigured } from "../_lib/response";
import { getJson, hasKvConfigured, setJson } from "../_lib/storage";
import { makeAdminKey, makeShowId } from "../_lib/ids";
import type { AppConfig, StoredShow } from "../_lib/types";

function isValidConfig(value: unknown): value is AppConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AppConfig>;
  return v.version === 1 && (v.mode === 4 || v.mode === 8) && Array.isArray(v.predictions);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!hasKvConfigured()) {
    return serverMisconfigured(res, "Vercel KV is not configured. Create KV store and attach it to the project.");
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const config = req.body?.config as unknown;
  if (!isValidConfig(config)) {
    return badRequest(res, "invalid_config");
  }

  // generate unique id
  let id = makeShowId();
  for (let i = 0; i < 5; i++) {
    const existing = await getJson<StoredShow>(`show:${id}`);
    if (!existing) break;
    id = makeShowId();
  }

  const show: StoredShow = {
    id,
    adminKey: makeAdminKey(),
    config,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await setJson(`show:${id}`, show);

  return json(res, 200, {
    showId: id,
    adminKey: show.adminKey
  });
}