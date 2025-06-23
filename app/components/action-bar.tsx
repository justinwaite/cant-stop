import { Dice } from './dice';
import { usePlayerSession } from '~/utils/use-player-session';
import { useEffect, useState } from 'react';
import { useGameContext } from '~/utils/game-provider';

type DieObj = { value: number; idx: number };

export function ActionBar() {
  const { act, gameState } = useGameContext();
  const [pair1, setPair1] = useState<DieObj[]>([]);
  const [pair2, setPair2] = useState<DieObj[]>([]);
  const [draggedDie, setDraggedDie] = useState<DieObj | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });

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

  const { pid } = usePlayerSession();
  const {
    players,
    playerOrder,
    turnIndex,
    phase,
    dice,
    winner,
    nextGame,
    neutralPieces,
  } = gameState;

  const currentTurnPlayerId = playerOrder[turnIndex];
  const isMyTurn = pid === currentTurnPlayerId;

  // Reset pairs when dice or phase changes (must be after dice/phase are defined)
  useEffect(() => {
    setPair1([]);
    setPair2([]);
    setDraggedDie(null);
    setIsTouchDragging(false);
  }, [dice, phase]);

  return (
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
      {dice && !isMyTurn && (
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
            {players[winner]?.name || winner} wins!
          </div>
          {/* Next game logic */}
          {nextGame ? (
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
              onMouseOut={(e) => (e.currentTarget.style.background = '#E85E37')}
            >
              Play Again
            </a>
          ) : null}
        </div>
      ) : isMyTurn && phase === 'rolling' ? (
        <div className="flex gap-2">
          <button
            onClick={() => act({ intent: 'rollDice' })}
            className="px-4 py-2 rounded font-bold text-lg transition-colors"
            style={{
              background: '#E85E37',
              color: '#FBF0E3',
            }}
            disabled={!isMyTurn || phase !== 'rolling'}
            onMouseOver={(e) => (e.currentTarget.style.background = '#DF4A2B')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#E85E37')}
          >
            Roll Dice
          </button>
          {/* Only allow Hold if player has at least one neutral piece */}
          {Object.keys(neutralPieces).length > 0 && (
            <button
              onClick={() => act({ intent: 'hold' })}
              className="px-4 py-2 rounded font-bold text-lg transition-colors"
              style={{
                background: '#842616',
                color: '#FBF0E3',
              }}
              disabled={!isMyTurn || phase !== 'rolling'}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = '#DF4A2B')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = '#842616')}
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
                    onDragStart={() => {
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
              const pairsToSend: Array<[number, number]> = [];
              if (pair1.length === 2) {
                pairsToSend.push([pair1[0].value, pair1[1].value]);
              }
              if (pair2.length === 2) {
                pairsToSend.push([pair2[0].value, pair2[1].value]);
              }

              act({
                intent: 'choosePairs',
                parameters: { pairs: pairsToSend },
              });
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
  );
}
