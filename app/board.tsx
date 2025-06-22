import { useState, useEffect, useRef } from 'react';
import { useParams, useRouteLoaderData, useNavigate } from 'react-router';
import './app.css';
import type { GameState } from './types';
import { usePlayerSession } from '~/utils/use-player-session';
import { ColorPicker } from './components/color-picker';
import { Menu } from './components/menu';

const slotSize = 32;
const slotGap = 8;
const maxSlots = 13;
const boardHeight = maxSlots * (slotSize + slotGap) - slotGap;

// Dice component for rendering a die face with pips
function Dice({
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

export function Board() {
  const { pid } = usePlayerSession();
  const { gameId } = useParams<{ gameId: string }>();
  const routeData = useRouteLoaderData('routes/game') as {
    gameId: string;
    gameState: GameState;
  };
  const navigate = useNavigate();

  // Store the latest game state from the server
  const [gameState, setGameState] = useState<GameState | null>(
    routeData?.gameState || null,
  );
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [copied, setCopied] = useState(false);

  // Local state for drag-and-drop pairing
  type DieObj = { value: number; idx: number };
  const [pair1, setPair1] = useState<DieObj[]>([]);
  const [pair2, setPair2] = useState<DieObj[]>([]);
  const [draggedDie, setDraggedDie] = useState<DieObj | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  const [showBustPopup, setShowBustPopup] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const [chatScrollLocked, setChatScrollLocked] = useState(false);

  // SSE: Listen for board state updates
  useEffect(() => {
    if (!gameId) return;
    const evtSource = new EventSource(`/game/${gameId}/stream`);
    evtSource.onmessage = (event) => {
      if (!event.data) return;
      try {
        const state: GameState = JSON.parse(event.data);
        if (state) {
          setGameState(state);
          setHasLoadedInitialData(true);
        }
      } catch {}
    };
    return () => evtSource.close();
  }, [gameId]);

  // Intent-sending functions
  async function sendIntent(
    intent:
      | 'rollDice'
      | 'hold'
      | 'choosePairs'
      | 'startGame'
      | 'updatePlayerInfo'
      | 'quitGame'
      | 'addPlayer'
      | 'startNextGame'
      | 'chat',
    parameters?: any,
  ) {
    const response = await fetch(`/game/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, ...(parameters ? { parameters } : {}) }),
    });

    const result = await response.json();
    if (result.bust) {
      setShowBustPopup(true);
      setTimeout(() => setShowBustPopup(false), 2000);
    }
  }
  async function sendChoosePairs(pairs: [[number, number], [number, number]]) {
    await sendIntent('choosePairs', { pairs });
  }

  async function quitGame() {
    if (!gameId) return;
    await sendIntent('quitGame');
    // Navigate to home after quitting
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  // UI helpers
  function handleCopy(gameUrl: string) {
    if (!gameUrl) return;
    navigator.clipboard.writeText(gameUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Scroll chat to bottom unless user scrolled up
  useEffect(() => {
    if (showChat && chatPanelRef.current && !chatScrollLocked) {
      chatPanelRef.current.scrollTop = chatPanelRef.current.scrollHeight;
    }
  }, [showChat, gameState?.chats, chatScrollLocked]);

  // Responsive check
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 700;

  // Send chat message
  async function sendChat(message: string) {
    if (!gameId || !message.trim()) return;
    await fetch(`/game/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'chat',
        parameters: {
          message: message.trim(),
          timestamp: Date.now(),
        },
      }),
    });
  }

  // Render logic
  if (!gameId || !gameState) {
    return <div>Loading...</div>;
  }

  const {
    pieces,
    players,
    lockedColumns,
    playerOrder,
    turnIndex,
    started,
    phase,
    dice,
    neutralPieces,
    winner,
  } = gameState;
  const playerColor = players[pid]?.color || null;
  const currentTurnPlayerId = playerOrder[turnIndex];
  const isMyTurn = pid === currentTurnPlayerId;

  // Reset pairs when dice or phase changes (must be after dice/phase are defined)
  useEffect(() => {
    setPair1([]);
    setPair2([]);
    setDraggedDie(null);
    setIsTouchDragging(false);
  }, [dice, phase]);

  // Global touch event handling for mobile drag and drop
  useEffect(() => {
    if (!isTouchDragging) return;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      setTouchPosition({ x: touch.clientX, y: touch.clientY });
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!isTouchDragging || !draggedDie) return;

      e.preventDefault();
      const touch = e.changedTouches[0];

      // Check if touch ended over pair1 box
      const pair1Element = document.querySelector('[data-drop-zone="pair1"]');
      if (pair1Element) {
        const rect = pair1Element.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom &&
          !pair1.some((d) => d.idx === draggedDie.idx) &&
          pair1.length < 2 &&
          !pair2.some((d) => d.idx === draggedDie.idx)
        ) {
          setPair1([...pair1, draggedDie]);
        }
      }

      // Check if touch ended over pair2 box
      const pair2Element = document.querySelector('[data-drop-zone="pair2"]');
      if (pair2Element) {
        const rect = pair2Element.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom &&
          !pair2.some((d) => d.idx === draggedDie.idx) &&
          pair2.length < 2 &&
          !pair1.some((d) => d.idx === draggedDie.idx)
        ) {
          setPair2([...pair2, draggedDie]);
        }
      }

      // Check if touch ended over dice list area
      const diceListElement = document.querySelector(
        '[data-drop-zone="dice-list"]',
      );
      if (diceListElement) {
        const rect = diceListElement.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          // Remove from pair1 if it's there
          setPair1(pair1.filter((d) => d.idx !== draggedDie.idx));
          // Remove from pair2 if it's there
          setPair2(pair2.filter((d) => d.idx !== draggedDie.idx));
        }
      }

      setIsTouchDragging(false);
      setDraggedDie(null);
    };

    document.addEventListener('touchmove', handleGlobalTouchMove, {
      passive: false,
    });
    document.addEventListener('touchend', handleGlobalTouchEnd, {
      passive: false,
    });

    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isTouchDragging, draggedDie, pair1, pair2]);

  // Show color/name picker if not set up
  if (hasLoadedInitialData && !playerColor) {
    return (
      <ColorPicker
        onSelect={(color, name) => {
          if (!gameId) return;
          sendIntent('addPlayer', { playerId: pid, color, name });
        }}
        takenColors={Object.values(players).map((p) => p.color)}
      />
    );
  }

  // Show color picker for editing
  if (showColorPicker) {
    return (
      <ColorPicker
        onSelect={(color, name) => {
          if (!gameId) return;
          sendIntent('updatePlayerInfo', { color, name });
          setShowColorPicker(false);
        }}
        takenColors={Object.values(players)
          .filter((p) => p.color !== playerColor) // Exclude current player's color
          .map((p) => p.color)}
        initialColor={playerColor}
        initialName={players[pid]?.name || ''}
        isEditing={true}
      />
    );
  }

  // LOBBY: Show before game starts
  if (hasLoadedInitialData && !started && playerColor) {
    const gameUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/game/${gameId}`
        : '';
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{
          background: 'linear-gradient(180deg, #E85E37 0%, #F08B4C 100%)',
        }}
      >
        <div
          style={{
            background: '#FBF0E3',
            border: '2px solid #E85E37',
            borderRadius: 18,
            boxShadow: '0 4px 24px rgba(132,38,22,0.13)',
            color: '#842616',
            padding: 32,
            minWidth: 320,
            maxWidth: 400,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div className="w-full flex flex-col items-center mb-4">
            <div
              style={{
                color: '#842616',
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 4,
              }}
            >
              Game Link
            </div>
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={gameUrl}
                readOnly
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #E2BFA3',
                  background: '#FFF',
                  color: '#842616',
                  fontWeight: 500,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => handleCopy(gameUrl)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: '#E85E37',
                  color: '#FBF0E3',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = '#DF4A2B')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = '#E85E37')
                }
                type="button"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="mb-4 w-full">
            <div
              style={{
                color: '#842616',
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 8,
              }}
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
              {Object.entries(players).map(([playerId, player]) => (
                <li key={playerId} className="flex items-center gap-3 mb-2">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 22,
                      height: 22,
                      borderRadius: 8,
                      background: player.color,
                      border: '2px solid #E2BFA3',
                    }}
                  />
                  <span
                    style={{
                      color: '#842616',
                      fontWeight: 600,
                      fontSize: 16,
                      fontFamily: 'monospace',
                    }}
                  >
                    {player.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => sendIntent('startGame')}
            style={{
              marginTop: 8,
              padding: '10px 32px',
              borderRadius: 8,
              background:
                Object.values(players).length >= 2 && !started
                  ? '#E85E37'
                  : '#F5E4D5',
              color:
                Object.values(players).length >= 2 && !started
                  ? '#FBF0E3'
                  : '#B98A68',
              fontWeight: 700,
              fontSize: 18,
              border: 'none',
              cursor:
                Object.values(players).length >= 2 && !started
                  ? 'pointer'
                  : 'not-allowed',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => {
              if (Object.values(players).length >= 2 && !started)
                e.currentTarget.style.background = '#DF4A2B';
            }}
            onMouseOut={(e) => {
              if (Object.values(players).length >= 2 && !started)
                e.currentTarget.style.background = '#E85E37';
            }}
            disabled={Object.values(players).length < 2 || started}
          >
            Start Game
          </button>
          <div
            style={{
              marginTop: 8,
              color: '#B98A68',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Waiting for players... (min 2 to start)
          </div>
        </div>
      </div>
    );
  }

  // Board column slot counts for Peak Pursuit (columns 2-12)
  const columnSlotCounts = {
    2: 3,
    3: 5,
    4: 7,
    5: 9,
    6: 11,
    7: 13,
    8: 11,
    9: 9,
    10: 7,
    11: 5,
    12: 3,
  };
  const columns = Array.from({ length: 11 }, (_, i) => i + 2); // [2, 3, ..., 12]

  // Helper to get color from player ID
  function getColorFromPlayerId(playerId: string): string {
    return (gameState as GameState).players[playerId]?.color || '#ccc';
  }

  // TODO: Render the board, dice, and action bar based on gameState
  // Only show actions that are valid for the current player and phase

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        background: 'linear-gradient(180deg, #E85E37 0%, #F08B4C 100%)',
      }}
    >
      {/* Game ID display */}
      <div
        className="fixed top-4 left-20 z-40 px-3 py-1 rounded-lg shadow"
        style={{
          background: '#FBF0E3',
          border: '2px solid #E2BFA3',
          color: '#842616',
          letterSpacing: '0.15em',
          minWidth: 90,
          textAlign: 'center',
          fontWeight: 700,
        }}
      >
        {gameId}
      </div>

      {/* Menu button */}
      <div
        className="fixed top-4 left-4 flex flex-col items-center"
        style={{ zIndex: 40 }}
      >
        <div style={{ zIndex: 50 }}>
          <Menu
            onChangeColor={() => {
              setShowColorPicker(true);
            }}
            onQuitGame={quitGame}
            gameId={gameId}
            players={players}
          />
        </div>
        {/* Chat icon button */}
        <button
          onClick={() => setShowChat((v) => !v)}
          aria-label="Open chat"
          style={{
            marginTop: 56, // ensure it's well below the menu button
            width: 40,
            height: 40,
            borderRadius: 12,
            background: '#FBF0E3',
            border: '2px solid #E85E37',
            color: '#842616',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(132,38,22,0.10)',
            cursor: 'pointer',
            transition: 'background 0.2s, border 0.2s',
            zIndex: 40,
            position: 'relative',
          }}
        >
          {/* Simple chat bubble SVG */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E85E37"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Turn indicator (top right) */}
      {started && playerOrder.length > 0 && (
        <div
          className="fixed top-4 right-4 z-40 flex items-center gap-2 px-3 py-1 rounded-lg shadow"
          style={{
            background: '#FBF0E3',
            border: '2px solid #E2BFA3',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: 6,
              background: players[playerOrder[turnIndex]]?.color,
              border: '2px solid #bbb',
            }}
          />
          <span
            style={{ color: '#842616', fontWeight: 700 }}
            className="font-mono text-base"
          >
            {players[playerOrder[turnIndex]]?.name || '...'}
          </span>
          <span
            style={{ color: '#DF4A2B' }}
            className="text-xs font-semibold ml-1"
          >
            TURN
          </span>
        </div>
      )}

      {/* Message display for current player */}
      {isMyTurn && gameState.message && (
        <div
          className="fixed top-16 right-4 z-40 px-4 py-2 rounded-lg shadow max-w-xs"
          style={{
            background: '#F5E4D5',
            border: '2px solid #E2BFA3',
            color: '#842616',
            fontWeight: 500,
          }}
        >
          {gameState.message}
        </div>
      )}

      {/* Bust popup */}
      {showBustPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="px-8 py-6 rounded-lg shadow-lg text-4xl font-bold animate-pulse"
            style={{ background: '#DF4A2B', color: '#FBF0E3' }}
          >
            BUST!
          </div>
        </div>
      )}

      {/* Chat panel */}
      {showChat && (
        <div
          className={
            `fixed z-50 flex flex-col left-0 overflow-hidden ` +
            `bg-[#FBF0E3] border-r-2 border-[#E85E37] shadow-[4px_0_24px_rgba(132,38,22,0.13)] transition-all duration-200 ` +
            `w-full rounded-none ` +
            `sm:w-[340px] sm:h-[calc(100vh-64px-88px)] sm:top-[64px] sm:bottom-auto sm:rounded-tr-[18px] sm:rounded-br-[18px]`
          }
          style={{
            // Mobile: use dvh and safe-area-inset for height and padding
            top: 'env(safe-area-inset-top, 0px)',
            left: 'env(safe-area-inset-left, 0px)',
            right: 'env(safe-area-inset-right, 0px)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
            height:
              'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 88px)',
            // Desktop overrides
            ...(window.innerWidth >= 640
              ? {
                  top: 64,
                  left: 0,
                  right: 'auto',
                  bottom: 'auto',
                  height: 'calc(100vh - 64px - 88px)',
                }
              : {}),
          }}
        >
          {/* Header */}
          <div
            style={{
              padding:
                'max(16px, env(safe-area-inset-top, 0px)) 16px 16px 16px',
              borderBottom: '2px solid #E2BFA3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FBF0E3',
              borderTopLeftRadius: 18,
            }}
          >
            <span style={{ color: '#842616', fontWeight: 700, fontSize: 18 }}>
              Chat
            </span>
            <button
              onClick={() => setShowChat(false)}
              aria-label="Close chat"
              style={{
                background: 'none',
                border: 'none',
                color: '#E85E37',
                fontSize: 22,
                cursor: 'pointer',
                fontWeight: 700,
                borderRadius: 8,
                padding: 4,
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = '#F08B4C')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
            >
              &times;
            </button>
          </div>
          {/* Chat messages */}
          <div
            ref={chatPanelRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              background: '#FFF8F3',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
            onScroll={(e) => {
              const el = e.currentTarget;
              setChatScrollLocked(
                el.scrollHeight - el.scrollTop - el.clientHeight > 40,
              );
            }}
          >
            {(gameState.chats || []).map((chat, i) => (
              <div
                key={chat.id || i}
                style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    borderRadius: 8,
                    background: chat.color,
                    border: '2px solid #E2BFA3',
                    marginBottom: 2,
                  }}
                />
                <div
                  style={{
                    background: '#FBF0E3',
                    borderRadius: 10,
                    padding: '6px 12px',
                    boxShadow: '0 1px 4px rgba(132,38,22,0.07)',
                    flex: 1,
                    maxWidth: '100%',
                  }}
                >
                  <div
                    style={{ color: '#842616', fontWeight: 700, fontSize: 13 }}
                  >
                    {chat.name}
                  </div>
                  <div
                    style={{
                      color: '#842616',
                      fontSize: 15,
                      wordBreak: 'break-word',
                    }}
                  >
                    {chat.message}
                  </div>
                  <div style={{ color: '#B98A68', fontSize: 11, marginTop: 2 }}>
                    {new Date(chat.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Input */}
          <form
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 12,
              borderTop: '2px solid #E2BFA3',
              background: '#FBF0E3',
              borderBottomRightRadius: 18,
            }}
            onSubmit={async (e) => {
              e.preventDefault();
              const input = chatInputRef.current;
              if (input && input.value.trim()) {
                await sendChat(input.value);
                input.value = '';
                setTimeout(() => {
                  if (chatPanelRef.current)
                    chatPanelRef.current.scrollTop =
                      chatPanelRef.current.scrollHeight;
                }, 50);
              }
            }}
          >
            <input
              ref={chatInputRef}
              type="text"
              placeholder="Type a message..."
              maxLength={200}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #E2BFA3',
                background: '#FFF',
                color: '#842616',
                fontSize: 15,
                marginRight: 8,
              }}
              autoComplete="off"
              onFocus={() =>
                setTimeout(() => {
                  if (chatPanelRef.current && !chatScrollLocked)
                    chatPanelRef.current.scrollTop =
                      chatPanelRef.current.scrollHeight;
                }, 50)
              }
            />
            <button
              type="submit"
              style={{
                background: '#E85E37',
                color: '#FBF0E3',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 16,
                padding: '8px 18px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = '#DF4A2B')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = '#E85E37')}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Board scroll area - takes up available space */}
      <div className="flex-1 overflow-auto">
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '100vw',
            padding: '82px 16px 16px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: slotGap,
              marginTop: 80,
              height: boardHeight,
              minWidth: 1100,
              margin: '0 auto',
            }}
          >
            {columns.map((col) => {
              const slots =
                columnSlotCounts[col as keyof typeof columnSlotCounts];
              if (typeof slots !== 'number') {
                // Skip rendering this column if slot count is invalid
                return null;
              }
              const emptySpace = maxSlots - slots;
              const marginTop = (emptySpace / 2) * (slotSize + slotGap);
              const marginBottom =
                emptySpace * (slotSize + slotGap) - marginTop;
              return (
                <div
                  key={col}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: slotGap,
                    marginTop,
                    marginBottom,
                  }}
                >
                  {Array.from(
                    { length: slots },
                    (_, slotIdx) => slots - slotIdx - 1,
                  ).map((slotIdx) => {
                    const isTop = slotIdx === slots - 1;
                    // Permanent pieces for this column/slot
                    const permPieces = (gameState.pieces[col] || []).filter(
                      (p) => p.slot === slotIdx, // 0-based slot
                    );
                    // Neutral piece for this column/slot
                    const hasNeutral = gameState.neutralPieces[col] === slotIdx;
                    // Locked column
                    const isLocked = !!gameState.lockedColumns[col];
                    return (
                      <div
                        key={slotIdx}
                        style={{
                          width: slotSize,
                          height: slotSize,
                          background: '#F5E4D5',
                          border: '2px solid #E2BFA3',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: isTop ? 'bold' : undefined,
                          fontSize: isTop ? 18 : undefined,
                          color: '#842616',
                          position: 'relative',
                          marginBottom: 0,
                          boxShadow: isTop
                            ? '0 2px 8px rgba(132,38,22,0.07)'
                            : undefined,
                        }}
                      >
                        {isTop ? col : null}
                        {/* Permanent pieces - only show if column is not locked */}
                        {!isLocked &&
                          permPieces.map((piece, i) => (
                            <div
                              key={piece.playerId}
                              style={{
                                position: 'absolute',
                                top: 2 + i * 8,
                                left: 2,
                                width: 24,
                                height: 24,
                                background: getColorFromPlayerId(
                                  piece.playerId,
                                ),
                                borderRadius: 6,
                                zIndex: 1,
                                border: '1px solid #FBF0E3',
                              }}
                            />
                          ))}
                        {/* Neutral piece - only show if column is not locked */}
                        {!isLocked && hasNeutral && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: slotSize - 16,
                              height: slotSize - 16,
                              background: '#E2BFA3',
                              border: '2px solid #B98A68',
                              borderRadius: '50%',
                              zIndex: 2,
                            }}
                          />
                        )}
                        {/* Locked column overlay - full color, no opacity */}
                        {isLocked && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: getColorFromPlayerId(
                                gameState.lockedColumns[col],
                              ),
                              zIndex: 10,
                              borderRadius: 8,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Bar - pushed to bottom */}
      <div
        className="w-screen shadow-lg py-3 pb-5 flex flex-col items-center gap-2"
        style={{
          background: 'rgba(251, 240, 227, 0.80)', // #FBF0E3 with 80% opacity
          backdropFilter: 'blur(8px)',
          borderTop: '2px solid #E2BFA3',
          boxShadow: '0 -2px 16px rgba(132,38,22,0.07)',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Dice display for players whose turn it isn't */}
        {started && dice && !isMyTurn && (
          <div className="flex gap-2 mb-2">
            {dice.map((die, i) => (
              <Dice
                key={i}
                value={die}
                size={32}
                color="#DF4A2B"
                border="#E2BFA3"
              />
            ))}
          </div>
        )}

        {winner ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl font-bold" style={{ color: '#16a34a' }}>
              {gameState.players[winner]?.name || winner} wins!
            </div>
            {/* Next game logic */}
            {gameState.nextGame ? (
              <a
                href={`/game/${gameState.nextGame}`}
                className="mt-2 px-6 py-2 rounded font-bold text-lg transition-colors"
                style={{
                  background: '#E85E37',
                  color: '#FBF0E3',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = '#DF4A2B')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = '#E85E37')
                }
              >
                Play Again
              </a>
            ) : null}
          </div>
        ) : isMyTurn && phase === 'rolling' ? (
          <div className="flex gap-2">
            <button
              onClick={() => sendIntent('rollDice')}
              className="px-4 py-2 rounded font-bold text-lg transition-colors"
              style={{
                background: '#E85E37',
                color: '#FBF0E3',
              }}
              disabled={!isMyTurn || phase !== 'rolling'}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = '#DF4A2B')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = '#E85E37')}
            >
              Roll Dice
            </button>
            {/* Only allow Hold if player has at least one neutral piece */}
            {Object.keys(neutralPieces).length > 0 && (
              <button
                onClick={() => sendIntent('hold')}
                className="px-4 py-2 rounded font-bold text-lg transition-colors"
                style={{
                  background: '#842616',
                  color: '#FBF0E3',
                }}
                disabled={!isMyTurn || phase !== 'rolling'}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = '#DF4A2B')
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = '#842616')
                }
              >
                Hold
              </button>
            )}
          </div>
        ) : isMyTurn && phase === 'pairing' && dice ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-6 mb-2">
              {/* Dice to drag */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Dice list drop, draggedDie:', draggedDie);
                  if (draggedDie !== null) {
                    // Remove from pair1 if it's there
                    setPair1(pair1.filter((d) => d.idx !== draggedDie.idx));
                    // Remove from pair2 if it's there
                    setPair2(pair2.filter((d) => d.idx !== draggedDie.idx));
                  }
                  setDraggedDie(null);
                }}
                data-drop-zone="dice-list"
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: 8,
                  border: '2px dashed #E85E37',
                  background: 'rgba(251,240,227,0.85)',
                  borderRadius: 12,
                  minHeight: 48,
                  alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(132,38,22,0.07)',
                  transition: 'border 0.2s, background 0.2s',
                }}
              >
                {dice.map((die, i) => {
                  const dieObj = { value: die, idx: i };
                  const inPair =
                    pair1.some((d) => d.idx === i) ||
                    pair2.some((d) => d.idx === i);
                  return (
                    <div
                      key={i}
                      draggable={!inPair}
                      onDragStart={(e) => {
                        console.log('Drag start for die:', dieObj);
                        setDraggedDie(dieObj);
                      }}
                      onDragEnd={() => setDraggedDie(null)}
                      onTouchStart={(e) => {
                        if (!inPair) {
                          e.preventDefault();
                          setDraggedDie(dieObj);
                          setIsTouchDragging(true);
                          const touch = e.touches[0];
                          setTouchPosition({
                            x: touch.clientX,
                            y: touch.clientY,
                          });
                        }
                      }}
                      style={{
                        opacity: inPair ? 0.3 : 1,
                        cursor: inPair ? 'not-allowed' : 'grab',
                        touchAction: inPair ? 'auto' : 'none',
                        position:
                          isTouchDragging && draggedDie && draggedDie.idx === i
                            ? 'fixed'
                            : 'static',
                        left:
                          isTouchDragging && draggedDie && draggedDie.idx === i
                            ? touchPosition.x - 20
                            : 'auto',
                        top:
                          isTouchDragging && draggedDie && draggedDie.idx === i
                            ? touchPosition.y - 20
                            : 'auto',
                        zIndex:
                          isTouchDragging && draggedDie && draggedDie.idx === i
                            ? 1000
                            : 'auto',
                      }}
                    >
                      <Dice value={die} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-8">
              {/* Pair 1 box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Pair1 drop, draggedDie:', draggedDie);
                  if (
                    draggedDie !== null &&
                    !pair1.some((d) => d.idx === draggedDie.idx) &&
                    pair1.length < 2 &&
                    !pair2.some((d) => d.idx === draggedDie.idx)
                  ) {
                    setPair1([...pair1, draggedDie]);
                  }
                  setDraggedDie(null);
                }}
                data-drop-zone="pair1"
                style={{
                  width: 100,
                  height: 60,
                  border: '2px dashed #E85E37',
                  borderRadius: 12,
                  background: 'rgba(251,240,227,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginRight: 8,
                  boxShadow: '0 2px 8px rgba(132,38,22,0.07)',
                  transition: 'border 0.2s, background 0.2s',
                }}
              >
                {pair1.map((die, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => setDraggedDie(die)}
                    onDragEnd={() => setDraggedDie(null)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedDie(die);
                      setIsTouchDragging(true);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      // Let the global touch handler deal with the drop
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      background: '#fff',
                      border: '2px dashed #E85E37',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 'bold',
                      cursor: 'grab',
                      touchAction: 'none',
                    }}
                  >
                    <Dice value={die.value} size={32} />
                  </div>
                ))}
              </div>
              {/* Pair 2 box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Pair2 drop, draggedDie:', draggedDie);
                  if (
                    draggedDie !== null &&
                    !pair2.some((d) => d.idx === draggedDie.idx) &&
                    pair2.length < 2 &&
                    !pair1.some((d) => d.idx === draggedDie.idx)
                  ) {
                    setPair2([...pair2, draggedDie]);
                  }
                  setDraggedDie(null);
                }}
                data-drop-zone="pair2"
                style={{
                  width: 100,
                  height: 60,
                  border: '2px dashed #E85E37',
                  borderRadius: 12,
                  background: 'rgba(251,240,227,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 2px 8px rgba(132,38,22,0.07)',
                  transition: 'border 0.2s, background 0.2s',
                }}
              >
                {pair2.map((die, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => setDraggedDie(die)}
                    onDragEnd={() => setDraggedDie(null)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDraggedDie(die);
                      setIsTouchDragging(true);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      // Let the global touch handler deal with the drop
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      background: '#fff',
                      border: '2px dashed #E85E37',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 'bold',
                      cursor: 'grab',
                      touchAction: 'none',
                    }}
                  >
                    <Dice value={die.value} size={32} />
                  </div>
                ))}
              </div>
            </div>
            <button
              className="mt-4 px-6 py-2 rounded font-bold text-lg transition-colors"
              style={{
                background:
                  (pair1.length !== 2 && pair2.length !== 2) ||
                  (pair1.length > 0 && pair1.length !== 2) ||
                  (pair2.length > 0 && pair2.length !== 2)
                    ? '#E2BFA3'
                    : '#E85E37',
                color:
                  (pair1.length !== 2 && pair2.length !== 2) ||
                  (pair1.length > 0 && pair1.length !== 2) ||
                  (pair2.length > 0 && pair2.length !== 2)
                    ? '#fff'
                    : '#FBF0E3',
                cursor:
                  (pair1.length !== 2 && pair2.length !== 2) ||
                  (pair1.length > 0 && pair1.length !== 2) ||
                  (pair2.length > 0 && pair2.length !== 2)
                    ? 'not-allowed'
                    : 'pointer',
              }}
              disabled={
                (pair1.length !== 2 && pair2.length !== 2) ||
                (pair1.length > 0 && pair1.length !== 2) ||
                (pair2.length > 0 && pair2.length !== 2)
              }
              onMouseOver={(e) => {
                if (
                  !(
                    (pair1.length !== 2 && pair2.length !== 2) ||
                    (pair1.length > 0 && pair1.length !== 2) ||
                    (pair2.length > 0 && pair2.length !== 2)
                  )
                ) {
                  e.currentTarget.style.background = '#DF4A2B';
                }
              }}
              onMouseOut={(e) => {
                if (
                  !(
                    (pair1.length !== 2 && pair2.length !== 2) ||
                    (pair1.length > 0 && pair1.length !== 2) ||
                    (pair2.length > 0 && pair2.length !== 2)
                  )
                ) {
                  e.currentTarget.style.background = '#E85E37';
                }
              }}
              onClick={() => {
                const pairsToSend: [
                  [number | null, number | null],
                  [number | null, number | null],
                ] = [
                  pair1.length === 2
                    ? [pair1[0].value, pair1[1].value]
                    : [null, null],
                  pair2.length === 2
                    ? [pair2[0].value, pair2[1].value]
                    : [null, null],
                ];
                sendChoosePairs(pairsToSend as any);
              }}
            >
              Submit Pairs
            </button>
          </div>
        ) : (
          <div style={{ color: '#B98A68', fontSize: 18, fontWeight: 500 }}>
            Waiting for your turn...
          </div>
        )}
      </div>
    </div>
  );
}
