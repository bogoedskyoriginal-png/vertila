import crypto from "node:crypto";

export function makeShowId() {
  // 12 chars base64url-ish
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

export function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}