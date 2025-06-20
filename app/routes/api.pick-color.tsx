import type { ActionFunctionArgs } from 'react-router';
import { broadcastBoardState } from '~/routes/game.stream';
import { readBoardState } from '~/utils/board-state.server';
import { getPlayerSession } from '~/utils/session.server';
import { isValidGameCode } from '~/utils/game-code';
import type { GameState } from '~/types';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const playerSession = await getPlayerSession(request);
  if (!playerSession) {
    return new Response(JSON.stringify({ error: 'No player session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { color, name, gameId } = await request.json();

  if (!gameId || !isValidGameCode(gameId)) {
    return new Response(JSON.stringify({ error: 'Invalid game code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (color === undefined || typeof color !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid color' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Read current state and update players
  const currentState = await readBoardState(gameId);
  const newPlayers = { ...currentState.players };

  if (color === '') {
    // Clear the player's entry
    delete newPlayers[playerSession.pid];
  } else {
    // Set the player's color and name
    newPlayers[playerSession.pid] = { color, name };
  }

  const newState: GameState = {
    ...currentState,
    players: newPlayers,
  };

  await broadcastBoardState(gameId, newState);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
