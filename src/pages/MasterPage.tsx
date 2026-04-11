import { useEffect, useMemo, useState } from "react";
import { apiSend } from "../utils/api";
import type { CreateShowResponse } from "../types/api";
import { DEFAULT_CONFIG } from "../utils/defaultConfig";

const LS_MASTER = "magic-master-token-v1";

export function MasterPage() {
  const [masterToken, setMasterToken] = useState("");
  const [created, setCreated] = useState<CreateShowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LS_MASTER);
    if (saved) setMasterToken(saved);
  }, []);

  useEffect(() => {
    if (masterToken) localStorage.setItem(LS_MASTER, masterToken);
  }, [masterToken]);

  const links = useMemo(() => {
    if (!created) return null;
    const base = window.location.origin;
    return {
      magicianAdmin: `${base}/admin/${encodeURIComponent(created.showId)}?key=${encodeURIComponent(created.adminKey)}`,
      spectator: `${base}/draw/${encodeURIComponent(created.showId)}`
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
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>MASTER_TOKEN</div>
          <input
            value={masterToken}
            onChange={(e) => setMasterToken(e.target.value)}
            placeholder="введите master token"
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
                    { "x-master-token": masterToken }
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

          <div style={{ fontSize: 12, opacity: 0.75 }}>Magician admin (private)</div>
          <div style={{ wordBreak: "break-all", marginBottom: 10 }}>{links?.magicianAdmin || "—"}</div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>Spectator</div>
          <div style={{ wordBreak: "break-all" }}>{links?.spectator || "—"}</div>

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
              onClick={() => links && window.open(links.spectator, "_blank")}
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
              Open spectator
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 12 }}>
            Дальше: открой magician admin link и настрой предсказания/маппинг. Эти настройки применятся к spectator link.
          </div>
        </div>
      </div>
    </div>
  );
}