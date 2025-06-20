import type { ActionFunctionArgs } from 'react-router';
import { broadcastBoardState } from './game.stream';
import { readBoardState } from '~/utils/board-state.server';
import { getPlayerSession } from '~/utils/session.server';
import { isValidGameCode } from '~/utils/game-code';
import type { GameState, BoardActionRequest } from '~/types';

function rollFourDice() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { gameId } = params;

  if (!gameId || !isValidGameCode(gameId)) {
    return new Response(JSON.stringify({ error: 'Invalid game code' }), {
      status: 400,
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

  const reqBody = await request.json();

  // Handle dice roll action
  if (reqBody.rollDice) {
    const prevState = await readBoardState(gameId);
    const newState: GameState = {
      ...prevState,
      lastRoll: rollFourDice(),
    };
    await broadcastBoardState(gameId, newState);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Otherwise, handle as a board update
  const { pieces, whitePieces, players, lockedColumns } =
    reqBody as BoardActionRequest;

  // Defensive: always start from the latest state
  const prevState = await readBoardState(gameId);
  const newLocked = { ...prevState.lockedColumns, ...lockedColumns };
  const newPieces: Record<string, string[]> = { ...pieces };

  // For each column, if the top slot contains any color, lock the column and clear all colored pieces from it
  for (let colIdx = 0; colIdx < 11; ++colIdx) {
    const topKey = `${colIdx}-0`;
    if (
      Array.isArray(newPieces[topKey]) &&
      newPieces[topKey].length > 0 &&
      !newLocked[colIdx]
    ) {
      // Lock the column and record which player locked it
      newLocked[colIdx] = playerSession.pid;
      // Remove all colored pieces from this column
      for (let i = 0; i < 11 + 2 - Math.abs(6 - colIdx) * 2; ++i) {
        // columnSlots[colIdx]
        const k = `${colIdx}-${i}`;
        delete newPieces[k];
      }
    }
  }

  // Merge players: keep existing ones and add/update from request
  const mergedPlayers = {
    ...prevState.players,
    ...players,
  };

  const newState = {
    pieces: newPieces,
    whitePieces,
    players: mergedPlayers,
    lockedColumns: newLocked,
    lastRoll: prevState.lastRoll,
  } satisfies GameState;

  await broadcastBoardState(gameId, newState);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
