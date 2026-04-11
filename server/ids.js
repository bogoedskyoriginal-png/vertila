import crypto from "node:crypto";

export function makeShowId() {
  const bytes = crypto.randomBytes(9);
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
    .slice(0, 12);
}

export function makeAdminKey() {
  return crypto.randomUUID();
}

export function makeSessionId() {
  return crypto.randomUUID();
}

export function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}