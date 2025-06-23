import type { GameState } from '~/types';

type TurnIndicatorProps = {
  players: GameState['players'];
  playerOrder: GameState['playerOrder'];
  turnIndex: GameState['turnIndex'];
};

export function TurnIndicator({
  players,
  playerOrder,
  turnIndex,
}: TurnIndicatorProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 rounded-xl shadow h-10"
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
      <span style={{ color: '#DF4A2B' }} className="text-xs font-semibold ml-1">
        TURN
      </span>
    </div>
  );
}
