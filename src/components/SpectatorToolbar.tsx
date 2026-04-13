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

function TinyIndicator({ active, error }: { active: boolean; error: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        border: "1px solid rgba(17, 24, 39, 0.12)",
        background: "#fff",
        display: "grid",
        placeItems: "center",
        position: "relative"
      }}
    >
      {active ? <span className="spinnerRing" aria-hidden="true" style={{ inset: -4 }} /> : <span style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(17,24,39,0.18)" }} />}
      {error && <span className="errorDot" aria-hidden="true" />}
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

        <TinyIndicator active={priming} error={hasError} />
      </div>
    </div>
  );
}
