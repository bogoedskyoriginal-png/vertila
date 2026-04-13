import type { DrawingTool } from "../hooks/useDrawingCanvas";
import { PaletteToolbar } from "./PaletteToolbar";

type Props = {
  colors: string[];
  selectedColor: string;
  tool: DrawingTool;
  onSelectColor: (color: string) => void;
  onSelectTool: (tool: DrawingTool) => void;
  charging: boolean;
  hasError: boolean;
  priming: boolean;
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

export function SpectatorToolbar({
  colors,
  selectedColor,
  tool,
  onSelectColor,
  onSelectTool,
  charging,
  hasError,
  priming
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

        <PrimingIndicator active={priming} />
      </div>
    </div>
  );
}
