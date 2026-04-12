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
    <div style={{ minHeight: "100vh", background: "#050507", color: "#fff", padding: 18, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Мастер‑админка</div>

        <div
          style={{
            background: "#0b0b10",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px" }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Логин</div>
              <input
                value={masterUser}
                onChange={(e) => setMasterUser(e.target.value)}
                placeholder="master"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "#06060a",
                  color: "#fff",
                  outline: "none"
                }}
              />
            </div>
            <div style={{ flex: "1 1 220px" }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Пароль</div>
              <input
                value={masterPass}
                onChange={(e) => setMasterPass(e.target.value)}
                placeholder="master123"
                type="password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "#06060a",
                  color: "#fff",
                  outline: "none"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "end" }}>
            <div style={{ flex: "1 1 220px" }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>ID (5 символов) — опционально</div>
              <input
                value={newCode}
                onChange={(e) => setNewCode(normalizeCodeInput(e.target.value))}
                placeholder="например: 12345"
                maxLength={5}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "#06060a",
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
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "#ffffff",
                color: "#050507",
                fontWeight: 900,
                cursor: auth ? "pointer" : "not-allowed",
                opacity: auth ? 1 : 0.6
              }}
            >
              Создать пользователя
            </button>

            <button
              disabled={!auth}
              onClick={() => auth && refresh().catch((e) => setError(e instanceof Error ? e.message : "load_failed"))}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: "#fff",
                cursor: auth ? "pointer" : "not-allowed",
                opacity: auth ? 1 : 0.6
              }}
            >
              Обновить список
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
            По умолчанию (если не задано в env): <span style={{ fontFamily: "ui-monospace" }}>master / master123</span>
          </div>

          {error && <div style={{ marginTop: 10, color: "#ffb4b4", fontSize: 12 }}>{error}</div>}
        </div>

        <div
          style={{
            background: "#0b0b10",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Ссылки</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>ID</div>
          <div style={{ fontFamily: "ui-monospace", marginBottom: 10 }}>{links?.code || "—"}</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>Админка фокусника</div>
          <div style={{ wordBreak: "break-all", marginBottom: 10 }}>{links?.magician || "—"}</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>Ссылка зрителя</div>
          <div style={{ wordBreak: "break-all", marginBottom: 10 }}>{links?.spectator || "—"}</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button
              disabled={!links}
              onClick={() => links && navigator.clipboard.writeText(links.magician)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: "#fff",
                cursor: links ? "pointer" : "not-allowed",
                opacity: links ? 1 : 0.5
              }}
            >
              Copy admin link
            </button>
            <button
              disabled={!links}
              onClick={() => links && navigator.clipboard.writeText(links.spectator)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: "#fff",
                cursor: links ? "pointer" : "not-allowed",
                opacity: links ? 1 : 0.5
              }}
            >
              Copy spectator link
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 12 }}>
            Важно: если пользователя (ID) не создали здесь — по ссылке ничего не откроется.
          </div>
        </div>

        <div style={{ background: "#0b0b10", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>Пользователи</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Всего: {users.length}</div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {users.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>Пока пусто.</div>
            ) : (
              users.map((u) => (
                <div
                  key={u.code}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap"
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ fontFamily: "ui-monospace", fontWeight: 900 }}>{u.code}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      обновлён: {new Date(u.updatedAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${base}/${encodeURIComponent(u.code)}/admin`)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "transparent",
                        color: "#fff",
                        cursor: "pointer"
                      }}
                    >
                      Copy admin
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${base}/${encodeURIComponent(u.code)}`)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "transparent",
                        color: "#fff",
                        cursor: "pointer"
                      }}
                    >
                      Copy spectator
                    </button>
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
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(185,28,28,0.18)",
                        color: "#fff",
                        cursor: "pointer"
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
