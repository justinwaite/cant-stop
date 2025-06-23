import { useGameContext } from '~/utils/game-provider';
import { useHandleCopy } from '~/utils/use-handle-copy';

export function Lobby() {
  const { copied, handleCopy } = useHandleCopy();
  const {
    act,
    gameId,
    gameState: { players, started },
  } = useGameContext();

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
              onMouseOut={(e) => (e.currentTarget.style.background = '#E85E37')}
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
          onClick={() => act({ intent: 'startGame' })}
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
