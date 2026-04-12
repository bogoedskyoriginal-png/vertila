import type { DrawingTool } from "../hooks/useDrawingCanvas";
import { PaletteToolbar } from "./PaletteToolbar";

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
      <PaletteToolbar
        colors={colors}
        selectedColor={selectedColor}
        tool={tool}
        onSelectColor={onSelectColor}
        onSelectTool={onSelectTool}
      />

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
