export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as T;
}

export async function apiSend<T>(
  path: string,
  method: "POST" | "PUT",
  body: unknown,
  headers?: Record<string, string>
) {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let msg = `API ${res.status}`;
    try {
      const data = (await res.json()) as any;
      if (data?.error) msg = String(data.error);
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}