import type { VercelRequest, VercelResponse } from "@vercel/node";
import { badRequest, json, notFound, serverMisconfigured } from "../../_lib/response";
import { delKey, getJson, hasKvConfigured, setJson } from "../../_lib/storage";
import type { PredictionId, StoredShow } from "../../_lib/types";

function toPredictionId(v: unknown): PredictionId | null {
  const n = Number(v);
  if ([1, 2, 3, 4, 5, 6, 7, 8].includes(n)) return n as PredictionId;
  return null;
}

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

  const sessionId = String(req.body?.sessionId || "");
  const resultIndex = toPredictionId(req.body?.resultIndex);
  if (!sessionId || !resultIndex) return badRequest(res, "invalid_request");

  const sessionKey = `session:${id}:${sessionId}`;
  const session = await getJson<{ used: boolean }>(sessionKey);
  if (!session || session.used) return badRequest(res, "session_invalid_or_used");

  const item = show.config.predictions.find((p) => p.id === resultIndex);
  if (!item) return notFound(res);

  // mark used and keep short TTL
  await setJson(sessionKey, { used: true, usedAt: Date.now(), resultIndex }, { exSeconds: 60 * 5 });

  // optionally delete immediately to be stricter:
  // await delKey(sessionKey);

  return json(res, 200, {
    predictionText: item.text ?? "",
    predictionImageDataUrl: item.imageDataUrl ?? ""
  });
}