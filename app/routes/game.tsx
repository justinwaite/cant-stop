import type { LoaderFunctionArgs } from 'react-router';
import { Board } from '~/board';
import { readBoardState } from '~/utils/board-state.server';
import { isValidGameCode } from '~/utils/game-code';

export async function loader({ params }: LoaderFunctionArgs) {
  const { gameId } = params;

  if (!gameId || !isValidGameCode(gameId)) {
    throw new Response('Invalid game code', { status: 400 });
  }

  // Initialize the game state if it doesn't exist
  const gameState = await readBoardState(gameId);

  return { gameId, gameState };
}

export default function Game() {
  return <Board />;
}
