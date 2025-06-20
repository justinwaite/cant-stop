function dotPositionsFor(value: number) {
  const dotPositions = [
    [],
    ['center'],
    ['top-left', 'bottom-right'],
    ['top-left', 'center', 'bottom-right'],
    ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    [
      'top-left',
      'top-right',
      'center-left',
      'center-right',
      'bottom-left',
      'bottom-right',
    ],
  ];
  return dotPositions[value] || [];
}

function Die({ value }: { value: number }) {
  const positions = {
    'top-left': 'top-1 left-1',
    'top-right': 'top-1 right-1',
    'bottom-left': 'bottom-1 left-1',
    'bottom-right': 'bottom-1 right-1',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'center-left': 'top-1/2 left-1 -translate-y-1/2',
    'center-right': 'top-1/2 right-1 -translate-y-1/2',
  };
  return (
    <div className="w-12 h-12 bg-white dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 rounded-lg flex items-center justify-center relative shadow-md">
      {dotPositionsFor(value).map((pos, i) => (
        <span
          key={i}
          className={`absolute w-2 h-2 rounded-full bg-gray-700 dark:bg-gray-200 ${positions[pos as keyof typeof positions]}`}
        />
      ))}
    </div>
  );
}

export function DiceBar({ roll }: { roll: number[] | null }) {
  return (
    <div className="fixed left-0 bottom-20 w-screen z-40 flex justify-center gap-4 pb-2 pointer-events-none">
      {roll && roll.length === 4 ? (
        roll.map((value, i) => <Die key={i} value={value} />)
      ) : (
        <span className="text-gray-400 dark:text-gray-500 italic text-lg">
          No roll yet
        </span>
      )}
    </div>
  );
}
