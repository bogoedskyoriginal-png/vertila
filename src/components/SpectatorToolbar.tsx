import type { DrawingTool } from "../hooks/useDrawingCanvas";
import { PaletteToolbar } from "./PaletteToolbar";

type Props = {
  colors: string[];
  selectedColor: string;
  tool: DrawingTool;
  onSelectColor: (color: string) => void;
  onSelectTool: (tool: DrawingTool) => void;
  charging: boolean;
  priming: boolean;
  onClear: () => void;
};

function PrimingIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        position: "relative"
      }}
    >
      <span className="spinnerRing" aria-hidden="true" style={{ inset: 2, borderColor: "rgba(17, 24, 39, 0.12)" }} />
    </div>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M7 6h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 6l.7-2h4.6L15 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 6l1 15h6l1-15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 10v7M13.5 10v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
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
  charging,
  priming,
  onClear
}: Props) {
  return (
    <div className="spectatorBarDock" role="toolbar" aria-label="drawing tools">
      <div className="spectatorBar">
        <PaletteToolbar
          colors={colors}
          selectedColor={selectedColor}
          tool={tool}
          onSelectColor={onSelectColor}
          onSelectTool={onSelectTool}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className="toolBtn" aria-label="clear canvas" onClick={onClear}>
            <ClearIcon />
          </button>
          <PrimingIndicator active={priming || charging} />
        </div>
      </div>
    </div>
  );
}
