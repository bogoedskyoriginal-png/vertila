import type { DrawingTool } from "../hooks/useDrawingCanvas";

type Props = {
  colors: string[];
  selectedColor: string;
  tool: DrawingTool;
  onSelectColor: (color: string) => void;
  onSelectTool: (tool: DrawingTool) => void;
};

function BrushIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M7 13.5c1.7-2.2 3.8-4.6 6.3-7.1l2.3-2.3a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-2.3 2.3c-2.5 2.5-4.9 4.6-7.1 6.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 13.5c-.9 1.2-1.5 2.3-1.8 3.3-.3 1.1-.9 1.9-1.7 2.4 1.7.2 3.1-.2 4.1-1.2.7-.7 1.1-1.5 1.2-2.4.1-.8.5-1.5 1.1-2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {/* Filled eraser (uses currentColor -> black when inactive, white when active) */}
      <path
        d="M8.2 15.6 14.6 9.2a2.4 2.4 0 0 1 3.4 0l.9.9a2.4 2.4 0 0 1 0 3.4l-4.7 4.7H8.8L6.5 16a2 2 0 0 1 0-2.8l1.7-1.6Z"
        fill="currentColor"
      />
      <path d="M14 18.2h7" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function PaletteToolbar({ colors, selectedColor, tool, onSelectColor, onSelectTool }: Props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className={tool === "pen" ? "toolBtn toolBtnActive" : "toolBtn"}
          aria-label="brush"
          onClick={() => onSelectTool("pen")}
        >
          <BrushIcon />
        </button>
        <button
          type="button"
          className={tool === "eraser" ? "toolBtn toolBtnActive" : "toolBtn"}
          aria-label="eraser"
          onClick={() => onSelectTool("eraser")}
        >
          <EraserIcon />
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }} aria-label="colors">
        {colors.map((c) => {
          const active = tool === "pen" && selectedColor.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              className={active ? "colorDot colorDotActive" : "colorDot"}
              onClick={() => {
                onSelectTool("pen");
                onSelectColor(c);
              }}
              aria-label={`color ${c}`}
              style={{ ["--dot" as any]: c }}
            />
          );
        })}
      </div>
    </div>
  );
}
