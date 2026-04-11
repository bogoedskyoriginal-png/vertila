type Props = {
  showEnableSensorsButton: boolean;
  showClearCanvasButton: boolean;
  showResetHiddenStateButton: boolean;
  enableButtonLabel?: string;
  onEnableSensors?: () => void;
  onClearCanvas?: () => void;
  onResetHiddenState?: () => void;
  disabledEnable?: boolean;
  colors?: string[];
  selectedColor?: string;
  onSelectColor?: (color: string) => void;
};

export function Toolbar({
  showEnableSensorsButton,
  showClearCanvasButton,
  showResetHiddenStateButton,
  enableButtonLabel = "Включить датчики",
  onEnableSensors,
  onClearCanvas,
  onResetHiddenState,
  disabledEnable,
  colors,
  selectedColor,
  onSelectColor
}: Props) {
  return (
    <div
      className="card"
      style={{
        padding: 10,
        borderRadius: 16,
        marginBottom: 10
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {showEnableSensorsButton && (
            <button className="btn btnPrimary" onClick={onEnableSensors} disabled={disabledEnable}>
              {enableButtonLabel}
            </button>
          )}
          {showClearCanvasButton && (
            <button className="btn" onClick={onClearCanvas}>
              Очистить
            </button>
          )}
          {showResetHiddenStateButton && (
            <button className="btn btnDanger" onClick={onResetHiddenState}>
              Сброс
            </button>
          )}
        </div>

        {colors && colors.length >= 3 && (
          <div className="row" style={{ gap: 8, padding: 4 }}>
            {colors.map((c) => {
              const active = selectedColor?.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  className="btn"
                  onClick={() => onSelectColor?.(c)}
                  aria-label={`color ${c}`}
                  style={{
                    minHeight: 40,
                    minWidth: 40,
                    padding: 0,
                    borderRadius: 999,
                    borderColor: active ? "#111827" : "#e5e7eb"
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
        )}
      </div>
    </div>
  );
}
