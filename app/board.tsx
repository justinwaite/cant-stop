import { useState, useEffect, useRef } from 'react';
import './app.css';
import type { BoardActionRequest } from './types';
import {usePlayerSession} from "~/utils/use-player-session";

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
  '#3490eb', // blue
  '#e3342f', // red
  '#38c172', // green
  '#fbbf24', // yellow
  '#a78bfa', // purple
  '#f97316', // orange
];

// Helper to get a unique key for each slot
function slotKey(colIdx: number, slotIdx: number) {
  return `${colIdx}-${slotIdx}`;
}

// Cookie helpers
function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; expires=${expires}; path=/`;
}

function getCookie(name: string) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

export function Board() {
  const {pid} = usePlayerSession();

  // Store placed pieces as a mapping slotKey -> array of colors
  const [pieces, setPieces] = useState<Record<string, string[]>>({});
  // Store placed white pieces as a set of slot keys
  const [whitePieces, setWhitePieces] = useState<Set<string>>(new Set());
  // Store the selected player color
  const [playerColor, setPlayerColor] = useState<string | null>(null);
  // Track if color has been loaded from cookie
  const [hasLoaded, setHasLoaded] = useState(false);
  // Track which piece type is being placed
  const [pieceType, setPieceType] = useState<'color' | 'white'>('color');

  // Real-time sync: prevent echo
  const isLocalChange = useRef(false);

  // Track locked columns
  const [lockedColumns, setLockedColumns] = useState<Set<number>>(new Set());

  // Ref for the scroll container
  const scrollRef = useRef<HTMLDivElement>(null);
  // Store scrollLeft before update
  const scrollLeftRef = useRef<number>(0);

  // On mount, check for color and playerId cookies (client only)
  useEffect(() => {
    // Color
    const savedColor = getCookie('cantstop_color');
    if (savedColor) setPlayerColor(savedColor);
    setHasLoaded(true);
  }, []);

  // When playerColor changes, save to cookie (client only)
  useEffect(() => {
    if (playerColor) setCookie('cantstop_color', playerColor);
  }, [playerColor]);

  // SSE: Listen for board state updates
  useEffect(() => {
    const evtSource = new EventSource('/board/stream');
    evtSource.onmessage = (event) => {
      if (!event.data) return;
      try {
        // Save scroll position before state update
        if (scrollRef.current) {
          scrollLeftRef.current = scrollRef.current.scrollLeft;
        }
        const state: BoardActionRequest = JSON.parse(event.data);
        if (state) {
          setPieces(state.pieces || {});
          setWhitePieces(new Set(state.whitePieces || []));
          setLockedColumns(new Set(state.lockedColumns || []));
        }
      } catch {}
    };
    return () => evtSource.close();
  }, []);

  // Restore scroll position after board updates
  useEffect(() => {
    if (scrollRef.current && scrollLeftRef.current > 0) {
      scrollRef.current.scrollLeft = scrollLeftRef.current;
    }
  }, [pieces, whitePieces, lockedColumns]);

  // POST new board state to server using fetch
  function syncBoardState(
    newPieces: Record<string, string[]>,
    newWhite: Set<string>,
    newLocked: Set<number> = lockedColumns,
  ) {
    if (typeof window === 'undefined') return;
    isLocalChange.current = true;
    fetch('/board/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pieces: newPieces,
        whitePieces: Array.from(newWhite),
        playerColors:
          playerColor
            ? { [pid]: playerColor }
            : {},
        lockedColumns: Array.from(newLocked),
      }),
    }).finally(() => {
      setTimeout(() => {
        isLocalChange.current = false;
      }, 100);
    });
  }

  function handleSlotClick(colIdx: number, slotIdx: number) {
    if (!playerColor && pieceType === 'color') return;
    if (lockedColumns.has(colIdx)) return; // Prevent play in locked columns
    const key = slotKey(colIdx, slotIdx);
    if (pieceType === 'color') {
      // Prevent multiple of the same player's color in a column
      for (let i = 0; i < columnSlots[colIdx]; ++i) {
        const k = slotKey(colIdx, i);
        if (Array.isArray(pieces[k]) && pieces[k].includes(playerColor!)) {
          // If this is the same slot, allow removal
          if (!(k === key && pieces[k].includes(playerColor!))) {
            return;
          }
        }
      }
      // If this is the top slot and the player is about to add their piece, confirm first
      const arr = Array.isArray(pieces[key]) ? [...pieces[key]] : [];
      const idx = arr.indexOf(playerColor!);
      const isPlacingOnTop = slotIdx === 0 && idx === -1;
      if (isPlacingOnTop) {
        const confirmed = window.confirm(
          'Are you sure you want to place your piece on the top row? This will lock the column and return all pieces in this column to their owners.',
        );
        if (!confirmed) return;
      }
      // Compute the next state, but do not update local state
      const next = { ...pieces };
      if (idx !== -1) {
        arr.splice(idx, 1);
      } else {
        // Only allow 11 pieces for this player
        const myCount = Object.values(next)
          .flat()
          .filter((c) => c === playerColor).length;
        if (myCount >= 11) return;
        arr.push(playerColor!);
      }
      if (arr.length > 0) {
        next[key] = arr;
      } else {
        delete next[key];
      }
      syncBoardState(next, whitePieces);
    } else {
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
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Restore pieceType from localStorage on mount
    const stored = localStorage.getItem('cantstop_pieceType');
    if (stored === 'color' || stored === 'white') {
      setPieceType(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('cantstop_pieceType', pieceType);
  }, [pieceType]);

  return (
    <>
      {/* Change color button */}
      <button
        onClick={() => setPlayerColor(null)}
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          zIndex: 101,
          background: '#fff',
          border: '2px solid #bbb',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          color: '#222',
        }}
      >
        Change Color
      </button>
      {/* Board scroll area */}
      <div
        ref={scrollRef}
        style={{
          position: 'relative',
          width: '100vw',
          maxWidth: '100vw',
          overflowX: 'auto',
          padding: '0 16px',
        }}
      >
        {/* Color selection modal */}
        {hasLoaded && !playerColor && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <div
              style={{
                background: '#fff',
                padding: 32,
                borderRadius: 16,
                boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
              }}
            >
              <div
                style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}
              >
                Pick your color
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {playerColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setPlayerColor(color)}
                    style={{
                      width: 40,
                      height: 40,
                      background: color,
                      border: '2px solid #bbb',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                    aria-label={`Pick color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
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
                        cursor:
                          playerColor || pieceType === 'white'
                            ? 'pointer'
                            : 'not-allowed',
                        position: 'relative',
                      }}
                    >
                      {isTop ? colIdx + 2 : null}
                      {Array.isArray(hasPiece) &&
                        hasPiece.map((color, i) => (
                          <div
                            key={color}
                            style={{
                              position: 'absolute',
                              top: 4 + i * 8,
                              left: 4,
                              width: 24,
                              height: 24,
                              background: color,
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
                      {lockedColumns.has(colIdx) && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(128,128,128,0.4)',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            fontWeight: 'bold',
                          }}
                        >
                          🔒
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {/* Piece type toggle and bust button - fixed to bottom */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          bottom: 0,
          width: '100vw',
          zIndex: 100,
          background: 'rgba(255,255,255,0.95)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          padding: '12px 0 20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button
            onClick={() => setPieceType('color')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border:
                pieceType === 'color' ? '2px solid #3490eb' : '2px solid #bbb',
              background: pieceType === 'color' ? '#e6f0fa' : '#fff',
              fontWeight: pieceType === 'color' ? 'bold' : undefined,
              cursor: 'pointer',
              color: '#222',
              fontSize: 15,
            }}
          >
            My Color
          </button>
          <button
            onClick={() => setPieceType('white')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border:
                pieceType === 'white' ? '2px solid #bbb' : '2px solid #eee',
              background: pieceType === 'white' ? '#f8f8f8' : '#fff',
              fontWeight: pieceType === 'white' ? 'bold' : undefined,
              cursor: 'pointer',
              color: '#222',
              fontSize: 15,
            }}
          >
            White
          </button>
        </div>
        <div
          style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}
        >
          <button
            onClick={() => syncBoardState(pieces, new Set())}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '2px solid #e3342f',
              background: '#fff',
              color: '#e3342f',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: 15,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            Bust
          </button>
        </div>
      </div>
    </>
  );
}
