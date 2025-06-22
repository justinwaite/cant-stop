import { useState } from 'react';
import { useNavigate } from 'react-router';
import { generateGameCode, isValidGameCode } from '~/utils/game-code';

export function GameHome() {
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleCreateGame() {
    const newGameCode = generateGameCode();
    navigate(`/game/${newGameCode}`);
  }

  function handleJoinGame() {
    const trimmedCode = gameCode.trim().toUpperCase();

    if (!trimmedCode) {
      setError('Please enter a game code');
      return;
    }

    if (!isValidGameCode(trimmedCode)) {
      setError('Game code must be 5 letters (A-Z)');
      return;
    }

    setError('');
    navigate(`/game/${trimmedCode}`);
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleJoinGame();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(180deg, #E85E37 0%, #F08B4C 100%)',
      }}
    >
      <div
        className="max-w-md w-full rounded-lg shadow-lg p-8"
        style={{ background: '#FBF0E3' }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <img
              src="/icon.svg"
              alt="Peak Pursuit logo"
              style={{
                width: 144,
                height: 144,
                borderRadius: 24,
                background: '#FFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                border: '2px solid #E2BFA3',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          {/* Create Game */}
          <div>
            <button
              onClick={handleCreateGame}
              className="w-full font-bold py-3 px-4 rounded-lg transition-colors"
              style={{
                background: '#E85E37',
                color: '#FBF0E3',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = '#DF4A2B')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = '#E85E37')}
            >
              Create New Game
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div
                className="w-full border-t"
                style={{ borderColor: '#E2BFA3' }}
              />
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className="px-2"
                style={{
                  background: '#FBF0E3',
                  color: '#842616',
                  opacity: 0.7,
                }}
              >
                or join existing game
              </span>
            </div>
          </div>

          {/* Join Game */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="gameCode"
                className="block text-sm font-medium mb-2"
                style={{ color: '#842616' }}
              >
                Game Code
              </label>
              <input
                id="gameCode"
                type="text"
                value={gameCode}
                onChange={(e) => {
                  setGameCode(e.target.value.toUpperCase());
                  setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter 5-letter code"
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                style={{
                  border: '1px solid #F5E4D5',
                  background: '#FFF',
                  color: '#842616',
                  fontWeight: 500,
                }}
                maxLength={5}
              />
            </div>

            {error && (
              <p style={{ color: '#DF4A2B' }} className="text-sm">
                {error}
              </p>
            )}

            <button
              onClick={handleJoinGame}
              className="w-full font-bold py-3 px-4 rounded-lg transition-colors"
              style={{
                background: '#842616',
                color: '#FBF0E3',
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = '#DF4A2B')
              }
              onMouseOut={(e) => (e.currentTarget.style.background = '#842616')}
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
