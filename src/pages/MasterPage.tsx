import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "../utils/api";
import type { MasterCreateUserResponse, MasterListUsersResponse } from "../types/api";

const LS_MASTER_USER = "magic-master-user-v1";
const LS_MASTER_PASS = "magic-master-pass-v1";

function basicAuthHeader(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`);
  return `Basic ${token}`;
}

function normalizeCodeInput(v: string) {
  return v.trim().toUpperCase();
}

function safeGetLs(key: string) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetLs(key: string, value: string) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function MasterPage() {
  const [masterUser, setMasterUser] = useState(() => safeGetLs(LS_MASTER_USER) ?? "");
  const [masterPass, setMasterPass] = useState(() => safeGetLs(LS_MASTER_PASS) ?? "");
  const [newCode, setNewCode] = useState("");
  const [search, setSearch] = useState("");

  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ code: string; createdAt: number; updatedAt: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  const auth = useMemo(() => {
    if (!masterUser || !masterPass) return null;
    return { Authorization: basicAuthHeader(masterUser, masterPass) };
  }, [masterPass, masterUser]);

  const base = typeof window !== "undefined" ? window.location.origin : "";

  const links = useMemo(() => {
    if (!createdCode) return null;
    const code = encodeURIComponent(createdCode);
    return {
      code: createdCode,
      spectator: `${base}/${code}`,
      magician: `${base}/${code}/admin`
    };
  }, [base, createdCode]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return users;
    return users.filter((u) => u.code.includes(q));
  }, [search, users]);

  const persistCreds = useCallback(() => {
    if (masterUser) safeSetLs(LS_MASTER_USER, masterUser);
    if (masterPass) safeSetLs(LS_MASTER_PASS, masterPass);
  }, [masterPass, masterUser]);

  const refresh = useCallback(async () => {
    if (!auth) return;
    try {
      const data = await apiGet<MasterListUsersResponse>("/api/master/users", { headers: auth });
      setUsers(data.users);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "load_failed";
      setError(msg === "API 401" ? "Неверный логин/пароль мастер‑админки." : msg);
      setUsers([]);
    }
  }, [auth]);

  useEffect(() => {
    setError(null);
    setCreatedCode(null);
    setUsers([]);
    if (!auth) return;
    refresh().catch(() => undefined);
  }, [auth?.Authorization, refresh]);

  if (!auth) {
    return (
      <div style={{ minHeight: "100vh", background: "#050507", color: "#fff", padding: 18, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 0.2, marginBottom: 14 }}>Триггер</div>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 18,
              padding: 14,
              background: "rgba(0,0,0,0.22)"
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Вход</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input
                value={masterUser}
                onChange={(e) => setMasterUser(e.target.value)}
                placeholder="Логин"
                style={{
                  flex: "1 1 180px",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  outline: "none"
                }}
              />
              <input
                value={masterPass}
                onChange={(e) => setMasterPass(e.target.value)}
                placeholder="Пароль"
                type="password"
                style={{
                  flex: "1 1 180px",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  outline: "none"
                }}
              />
            </div>
            <div style={{ height: 12 }} />
            <button
              onClick={() => {
                persistCreds();
                // auth is derived from state; effect will refresh automatically
              }}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "#fff",
                color: "#050507",
                fontWeight: 900,
                cursor: "pointer",
                width: "100%"
              }}
            >
              Войти
            </button>
            {error && <div style={{ marginTop: 10, color: "#fecaca", fontWeight: 700 }}>{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050507", color: "#fff" }}>
      <div style={{ padding: 18, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 0.2 }}>Триггер</div>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.22)",
              padding: "8px 12px",
              borderRadius: 999,
              fontSize: 12,
              opacity: 0.95,
              alignSelf: "center"
            }}
          >
            Сессия активна
          </div>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 18,
                padding: 14,
                background: "rgba(0,0,0,0.22)"
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Добавить пользователя</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
                <div style={{ flex: "1 1 220px" }}>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>ID (2–10 символов) — опционально</div>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(normalizeCodeInput(e.target.value))}
                    placeholder="например: TY1"
                    maxLength={10}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(0,0,0,0.35)",
                      color: "#fff",
                      outline: "none",
                      fontFamily: "ui-monospace"
                    }}
                  />
                </div>

                <button
                  onClick={async () => {
                    setError(null);
                    setCreatedCode(null);
                    try {
                      const body = newCode ? { code: newCode } : {};
                      const res = await apiSend<MasterCreateUserResponse>("/api/master/users", "POST", body, auth);
                      setCreatedCode(res.code);
                      setNewCode("");
                      await refresh();
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : "create_failed";
                      setError(msg === "API 401" ? "Неверный логин/пароль мастер‑админки." : msg);
                    }
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "#fff",
                    color: "#050507",
                    fontWeight: 900,
                    cursor: "pointer"
                  }}
                >
                  Создать
                </button>
              </div>

              {links && (
                <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 14 }}>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Ссылки</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                    <div style={{ wordBreak: "break-all", opacity: 0.9 }}>{links.spectator}</div>
                    <button
                      onClick={() => navigator.clipboard.writeText(links.spectator)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.22)",
                        background: "transparent",
                        color: "#fff",
                        cursor: "pointer"
                      }}
                    >
                      Копировать
                    </button>
                  </div>
                  <div style={{ height: 8 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                    <div style={{ wordBreak: "break-all", opacity: 0.9 }}>{links.magician}</div>
                    <button
                      onClick={() => navigator.clipboard.writeText(links.magician)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.22)",
                        background: "transparent",
                        color: "#fff",
                        cursor: "pointer"
                      }}
                    >
                      Копировать
                    </button>
                  </div>
                </div>
              )}

              {error && <div style={{ marginTop: 10, color: "#fecaca", fontWeight: 700 }}>{error}</div>}
            </div>

            <div
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 18,
                padding: 14,
                background: "rgba(0,0,0,0.22)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>Пользователи</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Всего: {users.length}</div>
              </div>

              <div style={{ height: 12 }} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по ID"
                  style={{
                    flex: "1 1 260px",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(0,0,0,0.35)",
                    color: "#fff",
                    outline: "none"
                  }}
                />
                <button
                  onClick={() => refresh().catch(() => undefined)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "#fff",
                    color: "#050507",
                    fontWeight: 900,
                    cursor: "pointer",
                    minWidth: 160
                  }}
                >
                  Обновить
                </button>
              </div>

              <div style={{ height: 14 }} />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 14 }}>
                {filtered.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Пока пусто.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    {filtered.map((u) => (
                      <div key={u.code} style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ fontFamily: "ui-monospace", fontWeight: 900, fontSize: 18 }}>{u.code}</div>
                          <button
                            onClick={async () => {
                              if (!confirm(`Удалить пользователя ${u.code}?`)) return;
                              setError(null);
                              try {
                                await apiSend(`/api/master/users/${encodeURIComponent(u.code)}`, "DELETE", undefined, auth);
                                await refresh();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : "delete_failed");
                              }
                            }}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.22)",
                              background: "transparent",
                              color: "#fff",
                              cursor: "pointer"
                            }}
                          >
                            Удалить
                          </button>
                        </div>

                        <div style={{ height: 10 }} />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                          <div style={{ wordBreak: "break-all", opacity: 0.9 }}>{`${base}/${encodeURIComponent(u.code)}`}</div>
                          <button
                            onClick={() => navigator.clipboard.writeText(`${base}/${encodeURIComponent(u.code)}`)}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.22)",
                              background: "transparent",
                              color: "#fff",
                              cursor: "pointer"
                            }}
                          >
                            Копировать
                          </button>
                        </div>

                        <div style={{ height: 8 }} />

                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                          <div style={{ wordBreak: "break-all", opacity: 0.9 }}>{`${base}/${encodeURIComponent(u.code)}/admin`}</div>
                          <button
                            onClick={() => navigator.clipboard.writeText(`${base}/${encodeURIComponent(u.code)}/admin`)}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.22)",
                              background: "transparent",
                              color: "#fff",
                              cursor: "pointer"
                            }}
                          >
                            Копировать
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

