import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useRouteLoaderData } from 'react-router';
import './app.css';
import type { BoardActionRequest, GameState } from './types';
import { usePlayerSession } from '~/utils/use-player-session';
import { ActionBar } from './components/action-bar';
import { ColorPicker } from './components/color-picker';
import { Menu } from './components/menu';
import { DiceModal } from './components/dice-modal';
import { DiceBar } from './components/dice-bar';

// Number of slots per column for Can't Stop (columns 2-12)
const columnSlots = [
  3, // 2
  5, // 3
  7, // 4
  9, // 5
  11, // 6
  13, // 7
  11, // 8
  9, // 9
  7, // 10
  5, // 11
  3, // 12
];

const slotSize = 32;
const slotGap = 8;
const maxSlots = Math.max(...columnSlots);
const boardHeight = maxSlots * (slotSize + slotGap) - slotGap;

const playerColors = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#fbbf24', // yellow
  '#9333ea', // purple
  '#ea580c', // orange
];

// Helper to get a unique key for each slot
function slotKey(colIdx: number, slotIdx: number) {
  return `${colIdx}-${slotIdx}`;
}

export function Board() {
  const { pid } = usePlayerSession();
  const { gameId } = useParams<{ gameId: string }>();
  const routeData = useRouteLoaderData('routes/game') as {
    gameId: string;
    gameState: any;
  };

  // Store placed pieces as a mapping slotKey -> array of playerIds
  const [pieces, setPieces] = useState<Record<string, string[]>>({});
  // Store placed white pieces as a set of slot keys
  const [whitePieces, setWhitePieces] = useState<Set<string>>(new Set());
  // Store players from game state
  const [players, setPlayers] = useState<
    Record<string, { color: string; name: string }>
  >({});
  // Track if initial data has been loaded from SSE
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Real-time sync: prevent echo
  const isLocalChange = useRef(false);

  // Track locked columns
  const [lockedColumns, setLockedColumns] = useState<Record<number, string>>(
    {},
  );

  // Store last dice roll from game state
  const [lastRoll, setLastRoll] = useState<number[] | null>(null);

  // Get current player's color from game state
  const playerColor = players[pid]?.color || null;

  // Track game started status
  const [started, setStarted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Helper function to get color from player ID
  function getColorFromPlayerId(playerId: string): string {
    return players[playerId]?.color || '#ccc'; // fallback color
  }

  function handleCopy(gameUrl: string) {
    if (!gameUrl) return;
    navigator.clipboard.writeText(gameUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // SSE: Listen for board state updates
  useEffect(() => {
    if (!gameId) return;
    const evtSource = new EventSource(`/game/${gameId}/stream`);
    evtSource.onmessage = (event) => {
      if (!event.data) return;
      try {
        const state: BoardActionRequest = JSON.parse(event.data);
        if (state) {
          setPieces(state.pieces || {});
          setWhitePieces(new Set(state.whitePieces || []));
          setLockedColumns(state.lockedColumns || {});
          setPlayers(state.players || {});
          setLastRoll(state.lastRoll ?? null);
          setStarted(!!state.started);
          setHasLoadedInitialData(true);
        }
      } catch {}
    };
    return () => evtSource.close();
  }, [gameId]);

  // POST new board state to server using fetch
  function syncBoardState(
    newPieces: Record<string, string[]>,
    newWhite: Set<string>,
    newLocked: Record<number, string> = lockedColumns,
  ) {
    if (typeof window === 'undefined' || !gameId) return;
    isLocalChange.current = true;
    fetch(`/game/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pieces: newPieces,
        whitePieces: Array.from(newWhite),
        lockedColumns: newLocked,
      }),
    }).finally(() => {
      setTimeout(() => {
        isLocalChange.current = false;
      }, 100);
    });
  }

  // Function to select a color and name
  function selectColor(color: string, name: string) {
    if (!gameId) return;
    fetch('/api/pick-color', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color, name, gameId }),
    });
  }

  function handleSlotClick(colIdx: number, slotIdx: number) {
    if (!playerColor) return;
    if (lockedColumns[colIdx]) return; // Prevent play in locked columns
    const key = slotKey(colIdx, slotIdx);
    // Only allow neutral (white) piece placement
    // Prevent multiple neutral pieces in the same column
    for (let i = 0; i < columnSlots[colIdx]; ++i) {
      const k = slotKey(colIdx, i);
      if (whitePieces.has(k)) {
        // If this is the same slot, allow removal
        if (!(k === key && whitePieces.has(key))) {
          return;
        }
      }
    }
    // Guard: only allow placing a neutral piece above the player's colored piece in this column
    let highestPlayerPiece = -1;
    for (let i = 0; i < columnSlots[colIdx]; ++i) {
      const k = slotKey(colIdx, i);
      if (Array.isArray(pieces[k]) && pieces[k].includes(pid)) {
        highestPlayerPiece = i;
        break; // colored pieces are always at the highest slot
      }
    }
    if (highestPlayerPiece !== -1 && slotIdx >= highestPlayerPiece) {
      // Can't place at or below your own colored piece
      return;
    }
    // Compute the next state, but do not update local state
    const next = new Set(whitePieces);
    if (next.has(key)) {
      next.delete(key);
    } else {
      if (next.size >= 3) return; // Only 3 white pieces
      next.add(key);
    }
    syncBoardState(pieces, next);
  }

  // Action handlers
  function handleBust() {
    syncBoardState(pieces, new Set(), {});
  }

  function handleHold() {
    if (!playerColor) return;
    // Copy pieces and whitePieces
    const newPieces: Record<string, string[]> = { ...pieces };
    // For each white piece, remove player's colored piece from the column, then add to this slot
    whitePieces.forEach((key) => {
      const [colIdxStr, slotIdxStr] = key.split('-');
      const colIdx = parseInt(colIdxStr, 10);
      // Remove player's colored piece from this column
      for (let i = 0; i < columnSlots[colIdx]; ++i) {
        const k = slotKey(colIdx, i);
        if (Array.isArray(newPieces[k])) {
          newPieces[k] = newPieces[k].filter((c) => c !== pid);
          if (newPieces[k].length === 0) delete newPieces[k];
        }
      }
      // Add player's colored piece to this slot
      newPieces[key] = Array.isArray(newPieces[key])
        ? [...newPieces[key].filter((c) => c !== pid), pid]
        : [pid];
    });
    // Clear all white pieces
    syncBoardState(newPieces, new Set());
  }

  function handleChangeColor() {
    selectColor('', '');
  }

  // Roll dice and update shared state
  function handleRollDice() {
    if (!gameId) return;
    fetch(`/game/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollDice: true }),
    });
  }

  async function handleStartGame() {
    if (!gameId) return;
    await fetch(`/game/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        started: true,
        pieces,
        whitePieces: Array.from(whitePieces),
        players,
        lockedColumns,
      }),
    });
  }

  if (!gameId) {
    return <div>Loading...</div>;
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
              {Object.values(players).length === 0 && (
                <li className="text-gray-500 text-center">No players yet</li>
              )}
              {Object.values(players).map((player, i) => (
                <li key={i} className="flex items-center gap-3 mb-2">
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
            onClick={handleStartGame}
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

  // Show color/name picker if not set up
  if (hasLoadedInitialData && !playerColor) {
    return (
      <ColorPicker
        onSelect={selectColor}
        takenColors={Object.values(players).map((p) => p.color)}
      />
    );
  }

  return (
    <>
      {/* Menu */}
      <Menu
        onChangeColor={handleChangeColor}
        gameId={gameId}
        players={players}
      />
      {/* Game ID display */}
      <div
        className="fixed top-4 left-20 z-40 px-3 py-1 rounded-lg bg-white/90 dark:bg-gray-900/90 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-mono font-bold text-lg shadow"
        style={{ letterSpacing: '0.15em', minWidth: 90, textAlign: 'center' }}
      >
        {gameId}
      </div>
      {/* Dice Bar */}
      <DiceBar roll={lastRoll} />
      {/* Board scroll area */}
      <div
        style={{
          position: 'relative',
          width: '100vw',
          maxWidth: '100vw',
          overflowX: 'auto',
          padding: '48px 16px 0 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: slotSize + slotGap, // horizontal gap matches vertical
            marginTop: 80,
            height: boardHeight,
            minWidth: 1100, // ensure board is wide enough for all columns
            margin: '0 auto',
          }}
        >
          {columnSlots.map((slots, colIdx) => {
            const emptySpace = maxSlots - slots;
            const marginTop = (emptySpace / 2) * (slotSize + slotGap);
            const marginBottom = emptySpace * (slotSize + slotGap) - marginTop;
            return (
              <div
                key={colIdx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: slotGap,
                  marginTop,
                  marginBottom,
                }}
              >
                {[...Array(slots)].map((_, slotIdx) => {
                  const isTop = slotIdx === 0;
                  const key = slotKey(colIdx, slotIdx);
                  const hasPiece = pieces[key];
                  const hasWhite = whitePieces.has(key);
                  return (
                    <div
                      key={slotIdx}
                      onClick={() => handleSlotClick(colIdx, slotIdx)}
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
                        cursor: playerColor ? 'pointer' : 'not-allowed',
                        position: 'relative',
                      }}
                    >
                      {isTop ? colIdx + 2 : null}
                      {Array.isArray(hasPiece) &&
                        hasPiece.map((playerId, i) => (
                          <div
                            key={playerId}
                            style={{
                              position: 'absolute',
                              top: 4 + i * 8,
                              left: 4,
                              width: 24,
                              height: 24,
                              background: getColorFromPlayerId(playerId),
                              borderRadius: 6,
                              zIndex: 1,
                            }}
                          />
                        ))}
                      {hasWhite && (
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
                      {lockedColumns[colIdx] && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: getColorFromPlayerId(
                              lockedColumns[colIdx],
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

      {/* Action Bar */}
      <ActionBar
        playerColor={playerColor}
        pieces={pieces}
        whitePieces={whitePieces}
        onBust={handleBust}
        onHold={handleHold}
        onRollDice={handleRollDice}
      />
    </>
  );
}
