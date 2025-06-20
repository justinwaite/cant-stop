import { useState } from 'react';

function rollFourDice() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
}

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
      {dotPositions[value].map((pos, i) => (
        <span
          key={i}
          className={`absolute w-2 h-2 rounded-full bg-gray-700 dark:bg-gray-200 ${positions[pos as keyof typeof positions]}`}
        />
      ))}
    </div>
  );
}

interface DiceModalProps {
  open: boolean;
  onClose: () => void;
}

export function DiceModal({ open, onClose }: DiceModalProps) {
  const [dice, setDice] = useState<number[]>([]);

  function handleRoll() {
    setDice(rollFourDice());
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 min-w-[320px] flex flex-col items-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Roll Dice
        </h2>
        <div className="flex gap-4 mb-6">
          {dice.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg"
                />
              ))
            : dice.map((value, i) => <Die key={i} value={value} />)}
        </div>
        <button
          onClick={handleRoll}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg text-lg transition-colors"
        >
          Roll
        </button>
      </div>
    </div>
  );
}
