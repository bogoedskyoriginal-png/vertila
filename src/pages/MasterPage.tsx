import { useEffect, useMemo, useState } from "react";
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

export function MasterPage() {
  const [masterUser, setMasterUser] = useState("");
  const [masterPass, setMasterPass] = useState("");
  const [newCode, setNewCode] = useState("");
  const [view, setView] = useState<"list" | "add">("list");
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

  async function refresh() {
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
  }

  useEffect(() => {
    const savedUser = localStorage.getItem(LS_MASTER_USER);
    const savedPass = localStorage.getItem(LS_MASTER_PASS);
    if (savedUser) setMasterUser(savedUser);
    if (savedPass) setMasterPass(savedPass);
  }, []);

  useEffect(() => {
    if (masterUser) localStorage.setItem(LS_MASTER_USER, masterUser);
  }, [masterUser]);

  useEffect(() => {
    if (masterPass) localStorage.setItem(LS_MASTER_PASS, masterPass);
  }, [masterPass]);

  useEffect(() => {
    setError(null);
    setCreatedCode(null);
    setUsers([]);
    if (!auth) return;
    refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.Authorization]);

  return (
    <div style={{ minHeight: "100vh", background: "#050507", color: "#fff", padding: 0, boxSizing: "border-box" }}>
      <div style={{ padding: "18px 18px 0 18px", borderBottom: "1px solid rgba(255,255,255,0.14)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: 0.2 }}>Триггер</div>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.22)",
              padding: "8px 12px",
              borderRadius: 999,
              fontSize: 12,
              opacity: 0.95
            }}
          >
            Сессия активна
          </div>
        </div>
        <div style={{ height: 14 }} />
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 18,
              padding: 14,
              background: "radial-gradient(1200px 400px at 50% 0%, rgba(255,255,255,0.06), rgba(0,0,0,0))"
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                onClick={() => setView("list")}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.28)",
                  background: view === "list" ? "rgba(255,255,255,0.12)" : "transparent",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Список пользователей
              </button>
              <button
                onClick={() => setView("add")}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.28)",
                  background: view === "add" ? "rgba(255,255,255,0.12)" : "transparent",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Добавить пользователя
              </button>
            </div>

            <div style={{ height: 12 }} />

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

            {error && <div style={{ marginTop: 10, color: "#ffb4b4", fontSize: 12 }}>{error}</div>}
          </div>

          <div style={{ height: 14 }} />

          {view === "list" ? (
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 18,
                padding: 14,
                background: "rgba(0,0,0,0.22)"
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по ID"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  outline: "none",
                  marginBottom: 12
                }}
              />

              <button
                disabled={!auth}
                onClick={() => auth && refresh().catch(() => undefined)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "#fff",
                  color: "#050507",
                  fontWeight: 900,
                  cursor: auth ? "pointer" : "not-allowed",
                  opacity: auth ? 1 : 0.6
                }}
              >
                Обновить
              </button>

              <div style={{ height: 14 }} />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>Пользователи</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Всего: {users.length}</div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  {filtered.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Пока пусто.</div>
                  ) : (
                    filtered.map((u) => (
                      <div key={u.code} style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ fontFamily: "ui-monospace", fontWeight: 900, fontSize: 18 }}>{u.code}</div>
                          <button
                            onClick={async () => {
                              if (!auth) return;
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
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
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
                  disabled={!auth}
                  onClick={async () => {
                    if (!auth) return;
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
                    cursor: auth ? "pointer" : "not-allowed",
                    opacity: auth ? 1 : 0.6
                  }}
                >
                  Создать
                </button>
              </div>

              <div style={{ height: 14 }} />

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Ссылки</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>ID</div>
                <div style={{ fontFamily: "ui-monospace", marginBottom: 10 }}>{links?.code || "—"}</div>

                <div style={{ fontSize: 12, opacity: 0.75 }}>Ссылка зрителя</div>
                <div style={{ wordBreak: "break-all", marginBottom: 10 }}>{links?.spectator || "—"}</div>

                <div style={{ fontSize: 12, opacity: 0.75 }}>Админка фокусника</div>
                <div style={{ wordBreak: "break-all", marginBottom: 10 }}>{links?.magician || "—"}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
