interface ColorPickerProps {
  onSelectColor: (color: string) => void;
}

const playerColors = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#fbbf24', // yellow
  '#9333ea', // purple
  '#ea580c', // orange
];

export function ColorPicker({ onSelectColor }: ColorPickerProps) {
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
          {playerColors.map((color) => (
            <button
              key={color}
              onClick={() => onSelectColor(color)}
              style={{
                width: 40,
                height: 40,
                background: color,
                border: '2px solid #bbb',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              aria-label={`Pick color ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
