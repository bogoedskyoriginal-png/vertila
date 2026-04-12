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

  const [tab, setTab] = useState<"list" | "add">("list");
  const [newCode, setNewCode] = useState("");
  const [search, setSearch] = useState("");

  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ code: string; createdAt: number; updatedAt: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      <div className="masterRoot">
        <div className="masterWrap" style={{ maxWidth: 560 }}>
          <div className="masterTitle">Триггер</div>
          <div className="masterCard">
            <div className="masterSectionTitle">Вход</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input
                value={masterUser}
                onChange={(e) => setMasterUser(e.target.value)}
                placeholder="Логин"
                className="masterInput"
                style={{ flex: "1 1 200px" }}
              />
              <input
                value={masterPass}
                onChange={(e) => setMasterPass(e.target.value)}
                placeholder="Пароль"
                type="password"
                className="masterInput"
                style={{ flex: "1 1 200px" }}
              />
            </div>
            <div style={{ height: 12 }} />
            <button
              className="masterBtn masterBtnPrimary"
              onClick={() => {
                persistCreds();
              }}
            >
              Войти
            </button>
            {error && <div className="masterError">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  async function createWithCode(code: string | null) {
    if (!auth) return;
    setBusy(true);
    setError(null);
    setCreatedCode(null);
    try {
      const body = code ? { code } : {};
      const res = await apiSend<MasterCreateUserResponse>("/api/master/users", "POST", body, auth);
      setCreatedCode(res.code);
      setNewCode("");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "create_failed";
      setError(msg === "API 401" ? "Неверный логин/пароль мастер‑админки." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="masterRoot">
      <div className="masterTopBar">
        <div className="masterWrap masterTopInner">
          <div className="masterTitle" style={{ margin: 0 }}>
            Управление пользователями Триггера
          </div>
          <div className="masterPill">Сессия активна</div>
        </div>
      </div>

      <div className="masterWrap">
        <div className="masterCard masterCardWide">
          <div className="masterTabs">
            <button
              type="button"
              className={tab === "list" ? "masterTabBtn masterTabBtnActive" : "masterTabBtn"}
              onClick={() => setTab("list")}
            >
              Список пользователей
            </button>
            <button
              type="button"
              className={tab === "add" ? "masterTabBtn masterTabBtnActive" : "masterTabBtn"}
              onClick={() => setTab("add")}
            >
              Добавить пользователя
            </button>
          </div>

          <div className="masterDivider" />

          {tab === "list" ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по ID"
                  className="masterInput"
                />
                <button
                  className="masterBtn masterBtnPrimary"
                  disabled={busy}
                  onClick={() => {
                    void refresh();
                  }}
                >
                  Обновить
                </button>
              </div>
              {error && <div className="masterError">{error}</div>}
              <div className="masterDivider" style={{ marginTop: 14 }} />
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                <input
                  value={newCode}
                  onChange={(e) => setNewCode(normalizeCodeInput(e.target.value))}
                  placeholder="Введите ID для создания ссылок"
                  maxLength={10}
                  className="masterInput"
                  style={{ fontFamily: "ui-monospace" }}
                />

                <div className="masterRow2">
                  <button
                    className="masterBtn"
                    disabled={busy}
                    onClick={() => {
                      void createWithCode(null);
                    }}
                  >
                    Сгенерировать
                  </button>
                  <button
                    className="masterBtn masterBtnPrimary"
                    disabled={busy || !newCode.trim()}
                    onClick={() => {
                      void createWithCode(newCode.trim().toUpperCase());
                    }}
                  >
                    Создать
                  </button>
                </div>
              </div>

              {links && (
                <div style={{ marginTop: 14 }}>
                  <div className="masterDivider" />
                  <div className="masterSectionTitle" style={{ marginTop: 12 }}>
                    Ссылки
                  </div>
                  <div className="masterLinkRow">
                    <div className="masterLinkText">{links.spectator}</div>
                    <button
                      className="masterBtn masterBtnSmall"
                      onClick={() => navigator.clipboard.writeText(links.spectator)}
                    >
                      Копировать
                    </button>
                  </div>
                  <div className="masterLinkRow">
                    <div className="masterLinkText">{links.magician}</div>
                    <button
                      className="masterBtn masterBtnSmall"
                      onClick={() => navigator.clipboard.writeText(links.magician)}
                    >
                      Копировать
                    </button>
                  </div>
                </div>
              )}

              <div className="masterCount" style={{ marginTop: 14 }}>
                Пользователей: {users.length}
              </div>

              {error && <div className="masterError">{error}</div>}

              <div className="masterDivider" style={{ marginTop: 14 }} />
            </>
          )}

          <div className="masterUsers">
            {filtered.length === 0 ? (
              <div className="masterEmpty">Пока пусто.</div>
            ) : (
              filtered.map((u) => {
                const spectatorUrl = `${base}/${encodeURIComponent(u.code)}`;
                const magicianUrl = `${base}/${encodeURIComponent(u.code)}/admin`;
                return (
                  <div key={u.code} className="masterUserRow">
                    <div className="masterUserMain">
                      <div className="masterUserId">{u.code}</div>
                      <div className="masterUserLinks">
                        <div className="masterUserLink">{spectatorUrl}</div>
                        <div className="masterUserLink">{magicianUrl}</div>
                      </div>
                    </div>
                    <div className="masterUserActions">
                      <button
                        className="masterBtn masterBtnSmall"
                        onClick={async () => {
                          if (!confirm(`Удалить пользователя ${u.code}?`)) return;
                          setBusy(true);
                          setError(null);
                          try {
                            await apiSend(`/api/master/users/${encodeURIComponent(u.code)}`, "DELETE", undefined, auth);
                            await refresh();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "delete_failed");
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Удалить
                      </button>
                      <button className="masterBtn masterBtnSmall" onClick={() => navigator.clipboard.writeText(spectatorUrl)}>
                        Копировать
                      </button>
                      <button className="masterBtn masterBtnSmall" onClick={() => navigator.clipboard.writeText(magicianUrl)}>
                        Копировать
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
