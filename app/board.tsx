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
  // Store player colors from game state
  const [playerColorsState, setPlayerColorsState] = useState<
    Record<string, string>
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
  const playerColor = playerColorsState[pid] || null;

  // Helper function to get color from player ID
  function getColorFromPlayerId(playerId: string): string {
    return playerColorsState[playerId] || '#ccc'; // fallback color
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
          setPlayerColorsState(state.playerColors || {});
          setLastRoll(state.lastRoll ?? null);
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
        playerColors: {}, // Player colors are handled separately
        lockedColumns: newLocked,
      }),
    }).finally(() => {
      setTimeout(() => {
        isLocalChange.current = false;
      }, 100);
    });
  }

  // Function to select a color
  function selectColor(color: string) {
    if (!gameId) return;
    fetch('/api/pick-color', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color, gameId }),
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
    selectColor('');
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

  if (!gameId) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {/* Menu */}
      <Menu onChangeColor={handleChangeColor} gameId={gameId} />
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
        {/* Color selection modal */}
        {hasLoadedInitialData && !playerColor && (
          <ColorPicker
            onSelectColor={selectColor}
            takenColors={Object.values(playerColorsState)}
          />
        )}
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
