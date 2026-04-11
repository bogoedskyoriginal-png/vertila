import type { VercelResponse } from "@vercel/node";

export function json(res: VercelResponse, status: number, data: unknown) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function badRequest(res: VercelResponse, message: string) {
  json(res, 400, { error: message });
}

export function unauthorized(res: VercelResponse) {
  json(res, 401, { error: "unauthorized" });
}

export function notFound(res: VercelResponse) {
  json(res, 404, { error: "not_found" });
}

export function serverMisconfigured(res: VercelResponse, message: string) {
  json(res, 501, { error: message });
}