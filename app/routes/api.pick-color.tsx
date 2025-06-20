import type { ActionFunctionArgs } from 'react-router';
import { broadcastBoardState } from './board.stream';
import { readBoardState } from '~/utils/board-state.server';
import { getPlayerSession } from '~/utils/session.server';
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

  const { color } = await request.json();
  if (color === undefined || typeof color !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid color' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Read current state and update player colors
  const currentState = await readBoardState();
  const newPlayerColors = { ...currentState.playerColors };

  if (color === '') {
    // Clear the player's color
    delete newPlayerColors[playerSession.pid];
  } else {
    // Set the player's color
    newPlayerColors[playerSession.pid] = color;
  }

  const newState: GameState = {
    ...currentState,
    playerColors: newPlayerColors,
  };

  await broadcastBoardState(newState);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
