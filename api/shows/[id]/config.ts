import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, notFound, serverMisconfigured } from "../../_lib/response";
import { getJson, hasKvConfigured } from "../../_lib/storage";
import type { PublicConfig, StoredShow } from "../../_lib/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!hasKvConfigured()) {
    return serverMisconfigured(res, "Vercel KV is not configured.");
  }

  if (req.method !== "GET") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const id = String(req.query.id || "");
  if (!id) return notFound(res);

  const show = await getJson<StoredShow>(`show:${id}`);
  if (!show) return notFound(res);

  const config = show.config;
  const publicConfig: PublicConfig = {
    ...config,
    predictions: config.predictions.map((p) => ({ id: p.id, label: p.label }))
  };

  return json(res, 200, { config: publicConfig, updatedAt: show.updatedAt });
}