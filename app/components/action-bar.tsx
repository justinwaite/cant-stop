import { useState } from 'react';

interface ActionBarProps {
  playerColor: string | null;
  pieces: Record<string, string[]>;
  whitePieces: Set<string>;
  onBust?: () => void;
  onHold?: () => void;
  onRollDice?: () => void;
}

export function ActionBar({
  playerColor,
  pieces,
  whitePieces,
  onBust,
  onHold,
  onRollDice,
}: ActionBarProps) {
  return (
    <div className="fixed left-0 bottom-0 w-screen z-40 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-black/20 py-3 pb-5 flex flex-col items-center gap-2">
      <div className="flex justify-center mt-1 gap-2">
        <button
          onClick={onBust}
          disabled={!onBust}
          className="px-3.5 py-1.5 rounded-lg border-2 border-red-500 bg-white dark:bg-gray-800 text-red-500 dark:text-red-400 font-bold cursor-pointer text-sm shadow-md dark:shadow-black/10 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
        >
          Bust
        </button>
        <button
          onClick={onHold}
          disabled={!playerColor || !onHold}
          className={`px-3.5 py-1.5 rounded-lg border-2 font-bold text-sm shadow-md transition-colors ${
            playerColor
              ? 'border-green-500 bg-white dark:bg-gray-800 text-green-500 dark:text-green-400 cursor-pointer hover:bg-green-50 dark:hover:bg-gray-700'
              : 'border-gray-400 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
          }`}
        >
          Hold
        </button>
        <button
          onClick={onRollDice}
          disabled={!onRollDice}
          className="px-3.5 py-1.5 rounded-lg border-2 border-blue-500 bg-white dark:bg-gray-800 text-blue-500 dark:text-blue-400 font-bold cursor-pointer text-sm shadow-md dark:shadow-black/10 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <circle cx="15.5" cy="8.5" r="1.5" />
            <circle cx="8.5" cy="15.5" r="1.5" />
            <circle cx="15.5" cy="15.5" r="1.5" />
          </svg>
          Roll Dice
        </button>
      </div>
    </div>
  );
}
