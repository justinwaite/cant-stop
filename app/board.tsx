import { useState, useEffect } from 'react';
import { useParams, useRouteLoaderData } from 'react-router';
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
function Dice({ value, size = 40 }: { value: number; size?: number }) {
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
        background: '#fff',
        border: '2px solid #2563eb',
        borderRadius: 8,
        display: 'grid',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateColumns: 'repeat(3, 1fr)',
        position: 'relative',
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
            background: '#2563eb',
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
      | 'addPlayer',
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700 p-8 min-w-[320px] flex flex-col items-center md:min-w-lg">
          <div className="w-full flex flex-col items-center mb-4">
            <div className="font-semibold mb-1 text-lg">Game Link</div>
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={gameUrl}
                readOnly
                className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-mono text-sm"
                style={{ minWidth: 0 }}
              />
              <button
                onClick={() => handleCopy(gameUrl)}
                className="px-2 py-1 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-sm"
                type="button"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="mb-4 w-full">
            <div className="font-semibold mb-2 text-lg">Players</div>
            <ul className="w-full">
              {Object.entries(players).length === 0 && (
                <li className="text-gray-500 text-center">No players yet</li>
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
                      border: '2px solid #bbb',
                    }}
                  />
                  <span className="font-mono text-lg text-gray-800 dark:text-gray-100">
                    {player.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => sendIntent('startGame')}
            className="mt-2 px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={Object.values(players).length < 2 || started}
          >
            Start Game
          </button>
          <div className="mt-2 text-gray-500 text-sm">
            Waiting for players... (min 2 to start)
          </div>
        </div>
      </div>
    );
  }

  // Board column slot counts for Can't Stop (columns 2-12)
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
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Game ID display */}
      <div
        className="fixed top-4 left-20 z-40 px-3 py-1 rounded-lg bg-white/90 dark:bg-gray-900/90 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-mono font-bold text-lg shadow"
        style={{ letterSpacing: '0.15em', minWidth: 90, textAlign: 'center' }}
      >
        {gameId}
      </div>

      {/* Menu button */}
      <div className="fixed top-4 left-4 z-40">
        <Menu
          onChangeColor={() => {
            setShowColorPicker(true);
          }}
          onQuitGame={quitGame}
          gameId={gameId}
          players={players}
        />
      </div>

      {/* Turn indicator (top right) */}
      {started && playerOrder.length > 0 && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2 px-3 py-1 rounded-lg bg-white/90 dark:bg-gray-900/90 border border-gray-300 dark:border-gray-700 shadow">
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
          <span className="font-mono text-base text-gray-800 dark:text-gray-100 font-bold">
            {players[playerOrder[turnIndex]]?.name || '...'}
          </span>
          <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold ml-1">
            TURN
          </span>
        </div>
      )}

      {/* Message display for current player */}
      {isMyTurn && gameState.message && (
        <div className="fixed top-16 right-4 z-40 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/90 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 font-medium text-sm shadow max-w-xs">
          {gameState.message}
        </div>
      )}

      {/* Bust popup */}
      {showBustPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-red-600 text-white px-8 py-6 rounded-lg shadow-lg text-4xl font-bold animate-pulse">
            BUST!
          </div>
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
                          background: '#eee',
                          border: '2px solid #bbb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: isTop ? 'bold' : undefined,
                          fontSize: isTop ? 18 : undefined,
                          color: '#222',
                          position: 'relative',
                          marginBottom: 0,
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
                                top: 4 + i * 8,
                                left: 4,
                                width: 24,
                                height: 24,
                                background: getColorFromPlayerId(
                                  piece.playerId,
                                ),
                                borderRadius: 6,
                                zIndex: 1,
                              }}
                            />
                          ))}
                        {/* Neutral piece - only show if column is not locked */}
                        {!isLocked && hasNeutral && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              width: slotSize - 16,
                              height: slotSize - 16,
                              background: '#888',
                              border: '2px solid #bbb',
                              borderRadius: 6,
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
        className="w-screen bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-black/20 py-3 pb-5 flex flex-col items-center gap-2"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        {/* Dice display for players whose turn it isn't */}
        {started && dice && !isMyTurn && (
          <div className="flex gap-2 mb-2">
            {dice.map((die, i) => (
              <Dice key={i} value={die} size={32} />
            ))}
          </div>
        )}

        {winner ? (
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {gameState.players[winner]?.name || winner} wins!
          </div>
        ) : isMyTurn && phase === 'rolling' ? (
          <div className="flex gap-2">
            <button
              onClick={() => sendIntent('rollDice')}
              className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-lg"
              disabled={!isMyTurn || phase !== 'rolling'}
            >
              Roll Dice
            </button>
            {/* Only allow Hold if player has at least one neutral piece */}
            {Object.keys(neutralPieces).length > 0 && (
              <button
                onClick={() => sendIntent('hold')}
                className="px-4 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-700 transition-colors text-lg"
                disabled={!isMyTurn || phase !== 'rolling'}
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
                  border: '2px dashed #ccc',
                  borderRadius: 8,
                  minHeight: 48,
                  alignItems: 'center',
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
                  border: '2px dashed #2563eb',
                  borderRadius: 10,
                  background: '#f0f6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginRight: 8,
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
                      border: '2px solid #2563eb',
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
                  border: '2px dashed #2563eb',
                  borderRadius: 10,
                  background: '#f0f6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
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
                      border: '2px solid #2563eb',
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
              className="mt-4 px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={
                (pair1.length !== 2 && pair2.length !== 2) ||
                (pair1.length > 0 && pair1.length !== 2) ||
                (pair2.length > 0 && pair2.length !== 2)
              }
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
          <div className="text-gray-500 text-lg">Waiting for your turn...</div>
        )}
      </div>
    </div>
  );
}
