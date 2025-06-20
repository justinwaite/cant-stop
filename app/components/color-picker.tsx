interface ColorPickerProps {
  onSelectColor: (color: string) => void;
  takenColors?: string[];
}

const playerColors = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#fbbf24', // yellow
  '#9333ea', // purple
  '#ea580c', // orange
];

export function ColorPicker({
  onSelectColor,
  takenColors = [],
}: ColorPickerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}>
          Pick your color
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {playerColors.map((color) => {
            const taken = takenColors.includes(color);
            return (
              <div
                style={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  display: 'inline-block',
                }}
              >
                <button
                  key={color}
                  onClick={() => !taken && onSelectColor(color)}
                  disabled={taken}
                  style={{
                    width: 40,
                    height: 40,
                    background: color,
                    border: '2px solid #bbb',
                    borderRadius: 8,
                    cursor: taken ? 'not-allowed' : 'pointer',
                    overflow: 'hidden',
                    ...(taken ? { background: `${color}66` } : {}),
                  }}
                  aria-label={`Pick color ${color}`}
                ></button>
                {taken && (
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 44 44"
                    style={{
                      position: 'absolute',
                      top: -2,
                      left: -2,
                      pointerEvents: 'none',
                    }}
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="44"
                      y2="44"
                      stroke="#000"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="1"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
