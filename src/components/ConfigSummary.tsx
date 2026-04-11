import type { AppConfig } from "../types/config";

export function ConfigSummary({ config }: { config: AppConfig }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview spectator config summary</div>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 12,
          lineHeight: 1.35
        }}
      >
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  );
}
