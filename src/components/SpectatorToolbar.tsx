import type { DrawingTool } from "../hooks/useDrawingCanvas";

type Props = {
  colors: string[];
  selectedColor: string;
  tool: DrawingTool;
  onSelectColor: (color: string) => void;
  onSelectTool: (tool: DrawingTool) => void;
  onMop: () => void;
  charging: boolean;
  hasError: boolean;
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
      <path
        d="M7.5 14.5 14 8a2.2 2.2 0 0 1 3.1 0l1 1a2.2 2.2 0 0 1 0 3.1l-5.6 5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 14.5 5 17a2 2 0 0 0 0 2.8l.2.2h7.6l4.7-4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 20h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M14 3l7 7-2 2-7-7 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 21h10l7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 18l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SpectatorToolbar({
  colors,
  selectedColor,
  tool,
  onSelectColor,
  onSelectTool,
  onMop,
  charging,
  hasError
}: Props) {
  return (
    <div className="spectatorBar spectatorBarBottom" role="toolbar" aria-label="drawing tools">
      <div className="spectatorTools">
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

      <div className="spectatorColors" aria-label="colors">
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

      <button
        type="button"
        className={charging ? "toolBtn toolBtnPrimary toolBtnLoading" : "toolBtn toolBtnPrimary"}
        aria-label="clean and arm"
        onClick={onMop}
      >
        <MopIcon />
        {charging && <span className="spinnerRing" aria-hidden="true" />}
        {hasError && <span className="errorDot" aria-hidden="true" />}
      </button>
    </div>
  );
}
