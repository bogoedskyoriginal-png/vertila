import { useEffect, useMemo, useState } from "react";
import { apiSend } from "../utils/api";
import type { CreateShowResponse } from "../types/api";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";

const LS_MASTER_USER = "magic-master-user-v1";
const LS_MASTER_PASS = "magic-master-pass-v1";

function basicAuthHeader(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`);
  return `Basic ${token}`;
}

export function MasterPage() {
  const [masterUser, setMasterUser] = useState("");
  const [masterPass, setMasterPass] = useState("");
  const [created, setCreated] = useState<CreateShowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const links = useMemo(() => {
    if (!created) return null;
    const base = window.location.origin;
        const code = (created.showCode ?? created.showId ?? "").toString();
    return {
      showCode: code,
      adminKey: created.adminKey,
      magicianAdmin: `${base}/${encodeURIComponent(code)}/admin`,
      spectator: `${base}/${encodeURIComponent(code)}`
    };
  }, [created]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050507",
        color: "#fff",
        padding: 18,
        boxSizing: "border-box"
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Master Admin</div>

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
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Login</div>
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
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Password</div>
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

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button
              onClick={async () => {
                setError(null);
                setCreated(null);
                try {
                  const res = await apiSend<CreateShowResponse>(
                    "/api/master/shows",
                    "POST",
                    { config: DEFAULT_CONFIG },
                    { Authorization: basicAuthHeader(masterUser, masterPass) }
                  );
                  setCreated(res);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "create_failed");
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "#ffffff",
                color: "#050507",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              Generate links
            </button>
          </div>

          {error && <div style={{ marginTop: 10, color: "#ffb4b4", fontSize: 12 }}>{error}</div>}

          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
            По умолчанию (если не задано в env): <span style={{ fontFamily: "ui-monospace" }}>master / master123</span>
          </div>
        </div>

        <div
          style={{
            background: "#0b0b10",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 14
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Links</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>Show code</div>
          <div style={{ fontFamily: "ui-monospace", marginBottom: 10 }}>{links?.showCode || "—"}</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>Magician admin (private)</div>
          <div style={{ wordBreak: "break-all", marginBottom: 10 }}>{links?.magicianAdmin || "—"}</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>Spectator</div>
          <div style={{ wordBreak: "break-all", marginBottom: 10 }}>{links?.spectator || "—"}</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>Admin key (для входа в /admin)</div>
          <div style={{ wordBreak: "break-all", fontFamily: "ui-monospace" }}>{links?.adminKey || "—"}</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button
              disabled={!links}
              onClick={() => links && navigator.clipboard.writeText(links.magicianAdmin)}
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
              Copy magician link
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
            <button
              disabled={!links}
              onClick={() => links && navigator.clipboard.writeText(links.adminKey)}
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
              Copy admin key
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 12 }}>
            Важно: если шоу не создано через Master — по коду ничего не откроется.
          </div>
        </div>
      </div>
    </div>
  );
}