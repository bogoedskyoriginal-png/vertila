import { kv } from "@vercel/kv";

export function hasKvConfigured() {
  return Boolean(
    process.env.KV_REST_API_URL &&
      process.env.KV_REST_API_TOKEN &&
      process.env.KV_REST_API_READ_ONLY_TOKEN
  );
}

export async function getJson<T>(key: string): Promise<T | null> {
  return (await kv.get(key)) as T | null;
}

export async function setJson(key: string, value: unknown, opts?: { exSeconds?: number }) {
  if (opts?.exSeconds) {
    await kv.set(key, value, { ex: opts.exSeconds });
    return;
  }
  await kv.set(key, value);
}

export async function delKey(key: string) {
  await kv.del(key);
}