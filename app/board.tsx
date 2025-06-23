import type { GameState } from './types';
import { columnSlotCounts } from './utils/constants';

const slotSize = 32;
const slotGap = 8;
const maxSlots = 13;
const boardHeight = maxSlots * (slotSize + slotGap) - slotGap;

type BoardProps = {
  gameState: GameState;
};
export function Board({ gameState }: BoardProps) {
  const { pieces, lockedColumns, neutralPieces } = gameState;

  const columns = Array.from({ length: 11 }, (_, i) => i + 2); // [2, 3, ..., 12]

  // Helper to get color from player ID
  function getColorFromPlayerId(playerId: string): string {
    return (gameState as GameState).players[playerId]?.color || '#ccc';
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: '100dvh',
        background: 'linear-gradient(180deg, #E85E37 0%, #F08B4C 100%)',
      }}
    >
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
                    const permPieces = (pieces[col] || []).filter(
                      (p) => p.slot === slotIdx, // 0-based slot
                    );
                    // Neutral piece for this column/slot
                    const hasNeutral = neutralPieces[col] === slotIdx;
                    // Locked column
                    const isLocked = !!lockedColumns[col];
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
                                lockedColumns[col],
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
    </div>
  );
}
