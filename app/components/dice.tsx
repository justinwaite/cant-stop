// Pip positions for each die face (1-based index)
const pips = [
  [],
  [[1, 1]],
  [
    [0, 0],
    [2, 2],
  ],
  [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
];

// Dice component for rendering a die face with pips
export function Dice({
  value,
  size = 40,
  color = '#DF4A2B',
  border = '#E2BFA3',
}: {
  value: number;
  size?: number;
  color?: string;
  border?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: 'rgba(255,255,255,0.95)',
        border: `2px solid ${border}`,
        borderRadius: 8,
        display: 'grid',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateColumns: 'repeat(3, 1fr)',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(132,38,22,0.07)',
      }}
    >
      {pips[value].map(([row, col], i) => (
        <div
          key={i}
          style={{
            gridRow: row + 1,
            gridColumn: col + 1,
            width: size / 6,
            height: size / 6,
            background: color,
            borderRadius: '50%',
            margin: 'auto',
          }}
        />
      ))}
    </div>
  );
}
