import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, notFound, serverMisconfigured } from "../../_lib/response";
import { getJson, hasKvConfigured, setJson } from "../../_lib/storage";
import { makeSessionId } from "../../_lib/ids";
import type { StoredShow } from "../../_lib/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!hasKvConfigured()) {
    return serverMisconfigured(res, "Vercel KV is not configured.");
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const id = String(req.query.id || "");
  if (!id) return notFound(res);

  const show = await getJson<StoredShow>(`show:${id}`);
  if (!show) return notFound(res);

  const sessionId = makeSessionId();
  await setJson(`session:${id}:${sessionId}`, { used: false, createdAt: Date.now() }, { exSeconds: 60 * 20 });

  return json(res, 200, { sessionId });
}