import type { UiConfig } from "../types/config";

type Props = {
  ui: UiConfig;
  onChange: (next: UiConfig) => void;
};

function CheckboxRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="row" style={{ justifyContent: "space-between" }}>
      <div>{label}</div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function AdminUiSettingsForm({ ui, onChange }: Props) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>UI spectator page</div>
      <div className="col" style={{ gap: 10 }}>
        <CheckboxRow
          label="showEnableSensorsButton"
          checked={ui.showEnableSensorsButton}
          onChange={(v) => onChange({ ...ui, showEnableSensorsButton: v })}
        />
        <CheckboxRow
          label="showClearCanvasButton"
          checked={ui.showClearCanvasButton}
          onChange={(v) => onChange({ ...ui, showClearCanvasButton: v })}
        />
        <CheckboxRow
          label="showResetHiddenStateButton"
          checked={ui.showResetHiddenStateButton}
          onChange={(v) => onChange({ ...ui, showResetHiddenStateButton: v })}
        />
        <div className="divider" />
        <CheckboxRow
          label="enableDebugMode"
          checked={ui.enableDebugMode}
          onChange={(v) => onChange({ ...ui, enableDebugMode: v })}
        />
        <div className="hint">
          Debug UI показывается только на <span className="kbd">/draw</span> при включенном флаге.
        </div>
      </div>
    </div>
  );
}
