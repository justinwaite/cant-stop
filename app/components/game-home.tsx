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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-black/20 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Can't Stop
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create a new game or join an existing one
          </p>
        </div>

        <div className="space-y-6">
          {/* Create Game */}
          <div>
            <button
              onClick={handleCreateGame}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Create New Game
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or join existing game
              </span>
            </div>
          </div>

          {/* Join Game */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="gameCode"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={5}
              />
            </div>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleJoinGame}
              className="w-full bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
