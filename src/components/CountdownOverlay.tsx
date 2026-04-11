type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  value?: number;
};

export function CountdownOverlay({ visible, title, subtitle, value }: Props) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50
      }}
    >
      <div className="card" style={{ padding: 18, width: "min(420px, 100%)" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{title}</div>
        {subtitle && <div className="hint">{subtitle}</div>}
        {typeof value === "number" && (
          <div style={{ fontSize: 40, fontWeight: 800, marginTop: 10, textAlign: "center" }}>{value}</div>
        )}
      </div>
    </div>
  );
}
