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
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 p-2 cursor-pointer"
        style={{
          background: '#FBF0E3',
          border: '2px solid #E85E37',
          color: '#842616',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(132,38,22,0.10)',
          transition: 'background 0.2s, border 0.2s',
        }}
        aria-label="Menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#842616"
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
          <div
            className="fixed top-18 left-4 z-50 min-w-40 overflow-hidden"
            style={{
              background: 'rgba(251,240,227,0.97)',
              border: '2px solid #E85E37',
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(132,38,22,0.13)',
              color: '#842616',
              fontWeight: 500,
            }}
          >
            <button
              onClick={handleCopyGameUrl}
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm flex items-center gap-2 border-b"
              style={{
                borderColor: '#E2BFA3',
                color: '#842616',
                background: 'none',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = 'rgba(240,139,76,0.20)')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#842616"
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
              onClick={() => {
                setShowPlayers(true);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm flex items-center gap-2 border-b"
              style={{
                borderColor: '#E2BFA3',
                color: '#842616',
                background: 'none',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = 'rgba(240,139,76,0.20)')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#842616"
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
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm flex items-center gap-2"
              style={{
                color: '#842616',
                background: 'none',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = 'rgba(240,139,76,0.20)')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#842616"
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
              className="w-full px-4 py-3 bg-none border-none text-left cursor-pointer text-sm flex items-center gap-2 border-t"
              style={{
                borderColor: '#E2BFA3',
                color: '#842616',
                background: 'none',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = 'rgba(240,139,76,0.20)')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#842616"
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
            className="fixed top-1/2 left-1/2 z-50 flex flex-col items-center max-w-sm w-full"
            style={{
              background: '#FBF0E3',
              border: '2px solid #E85E37',
              borderRadius: 18,
              boxShadow: '0 4px 24px rgba(132,38,22,0.13)',
              color: '#842616',
              padding: 32,
              minWidth: 260,
              minHeight: 120,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="font-bold text-lg mb-4"
              style={{ color: '#842616' }}
            >
              Players
            </div>
            <ul className="w-full">
              {Object.entries(players).length === 0 && (
                <li
                  style={{
                    color: '#B98A68',
                    textAlign: 'center',
                    fontWeight: 500,
                  }}
                >
                  No players yet
                </li>
              )}
              {Object.entries(players).map(([playerId, player]) => {
                const isCurrent = playerId === pid;
                return (
                  <li
                    key={playerId}
                    style={{
                      color: '#842616',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 8,
                      justifyContent: 'flex-start',
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 18,
                        height: 18,
                        borderRadius: 8,
                        background: player.color,
                        border: '2px solid #bbb',
                      }}
                    />
                    <span style={{ color: '#842616', fontWeight: 500 }}>
                      {player.name}
                    </span>
                    {!isCurrent && <span style={{ flex: 1 }} />}
                    {!isCurrent && (
                      <button
                        onClick={() => handleRemovePlayer(playerId)}
                        style={{
                          color: '#DF4A2B',
                          background: '#FBF0E3',
                          border: '2px solid #E85E37',
                          borderRadius: 8,
                          padding: '2px 14px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 14,
                          boxShadow: '0 1px 4px rgba(132,38,22,0.07)',
                          transition:
                            'background 0.2s, border 0.2s, color 0.2s',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#F08B4C';
                          e.currentTarget.style.border = '2px solid #DF4A2B';
                          e.currentTarget.style.color = '#842616';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#FBF0E3';
                          e.currentTarget.style.border = '2px solid #E85E37';
                          e.currentTarget.style.color = '#DF4A2B';
                        }}
                        title="Remove player"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <button
              onClick={() => setShowPlayers(false)}
              style={{
                marginTop: 16,
                padding: '8px 24px',
                borderRadius: 8,
                background: '#E85E37',
                border: 'none',
                color: '#FBF0E3',
                fontWeight: 700,
                fontSize: 16,
                boxShadow: '0 1px 4px rgba(132,38,22,0.07)',
                transition: 'background 0.2s',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#DF4A2B';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#E85E37';
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </>
  );
}
