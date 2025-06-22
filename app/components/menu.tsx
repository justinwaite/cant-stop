import { useState } from 'react';
import { usePlayerSession } from '~/utils/use-player-session';

interface MenuProps {
  onChangeColor: () => void;
  onQuitGame: () => void;
  gameId: string;
  players: Record<string, { color: string; name: string }>;
}

export function Menu({
  onChangeColor,
  onQuitGame,
  gameId,
  players,
}: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const { pid } = usePlayerSession();

  async function handleRemovePlayer(playerId: string) {
    if (!gameId) return;
    if (!window.confirm('Remove this player from the game?')) return;
    await fetch(`/game/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'removePlayer',
        parameters: { playerId },
      }),
    });
  }

  function handleCopyGameUrl() {
    const gameUrl = `${window.location.origin}/game/${gameId}`;
    navigator.clipboard.writeText(gameUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setIsOpen(false);
  }

  function handleExitGame() {
    if (!window.confirm('Are you sure you want to quit the game?')) return;
    setIsOpen(false);
    onQuitGame();
  }

  return (
    <>
      {/* Menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 bg-white dark:bg-black border-2 border-gray-700 dark:border-white text-gray-700 dark:text-white rounded-lg p-2 cursor-pointer shadow-lg dark:shadow-white/20 flex items-center justify-center w-10 h-10"
        aria-label="Menu"
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
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40"
          />

          {/* Menu content */}
          <div className="fixed top-18 left-4 z-50 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-black/50 min-w-40 overflow-hidden">
            <button
              onClick={handleCopyGameUrl}
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? 'Copied!' : 'Copy Game URL'}
            </button>
            <button
              onClick={() => setShowPlayers(true)}
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
              </svg>
              Player List
            </button>
            <button
              onClick={() => {
                onChangeColor();
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="13.5" cy="6.5" r=".5" />
                <circle cx="17.5" cy="10.5" r=".5" />
                <circle cx="8.5" cy="7.5" r=".5" />
                <circle cx="6.5" cy="12.5" r=".5" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
              Change Color
            </button>
            <button
              onClick={handleExitGame}
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-600"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Quit Game
            </button>
          </div>
        </>
      )}

      {/* Player List Modal */}
      {showPlayers && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setShowPlayers(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700 p-6 min-w-[260px] min-h-[120px] flex flex-col items-center max-w-sm w-full"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <div className="font-bold text-lg mb-4">Players</div>
            <ul className="w-full">
              {Object.entries(players).length === 0 && (
                <li className="text-gray-500 text-center">No players yet</li>
              )}
              {Object.entries(players).map(([playerId, player]) => (
                <li
                  key={playerId}
                  className="flex items-center gap-3 mb-2 justify-between"
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: player.color,
                      border: '2px solid #bbb',
                    }}
                  />
                  <span className="font-mono text-base text-gray-800 dark:text-gray-100 flex-1 ml-2">
                    {player.name}
                  </span>
                  {playerId !== pid && (
                    <button
                      onClick={() => handleRemovePlayer(playerId)}
                      className="px-2 py-1 rounded bg-red-500 text-white text-xs font-bold hover:bg-red-700 transition-colors ml-auto"
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowPlayers(false)}
              className="mt-4 px-4 py-1.5 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </>
      )}
    </>
  );
}
