import type { DrawingTool } from "../hooks/useDrawingCanvas";

type Props = {
  colors: string[];
  selectedColor: string;
  tool: DrawingTool;
  onSelectColor: (color: string) => void;
  onSelectTool: (tool: DrawingTool) => void;
  onClear: () => void;
};

export function Toolbar({ colors, selectedColor, tool, onSelectColor, onSelectTool, onClear }: Props) {
  return (
    <div className="card" style={{ padding: 10, borderRadius: 16, marginBottom: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button className={tool === "pen" ? "btn btnPrimary" : "btn"} onClick={() => onSelectTool("pen")}>
            Маркер
          </button>
          <button className={tool === "eraser" ? "btn btnPrimary" : "btn"} onClick={() => onSelectTool("eraser")}>
            Ластик
          </button>
          <button className="btn" onClick={onClear}>
            Очистить
          </button>
        </div>

        <div className="row" style={{ gap: 8, padding: 4 }}>
          {colors.map((c) => {
            const active = tool === "pen" && selectedColor.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                className="btn"
                onClick={() => {
                  onSelectTool("pen");
                  onSelectColor(c);
                }}
                aria-label={`color ${c}`}
                style={{
                  minHeight: 40,
                  minWidth: 40,
                  padding: 0,
                  borderRadius: 999,
                  borderColor: active ? "#111827" : "#e5e7eb",
                  opacity: tool === "eraser" ? 0.65 : 1
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: c,
                    border: c.toLowerCase() === "#ffffff" ? "1px solid #e5e7eb" : "1px solid rgba(0,0,0,0.12)"
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

