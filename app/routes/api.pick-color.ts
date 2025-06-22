import type { ActionFunctionArgs } from 'react-router';
import {
  broadcastBoardState,
  readBoardState,
} from '~/utils/board-state.server';
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

  const { color, name, gameId, removePlayerId } = await request.json();

  if (!gameId || !isValidGameCode(gameId)) {
    return new Response(JSON.stringify({ error: 'Invalid game code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Remove player logic (handle this before color validation)
  if (removePlayerId) {
    const currentState = await readBoardState(gameId);
    const newPlayers = { ...currentState.players };
    delete newPlayers[removePlayerId];

    // Remove player from turn order
    const newPlayerOrder = currentState.playerOrder.filter(
      (id) => id !== removePlayerId,
    );

    // If no players left, return empty state
    if (Object.keys(newPlayers).length === 0) {
      const emptyState: GameState = {
        ...currentState,
        players: {},
        playerOrder: [],
        turnIndex: 0,
        started: false,
        phase: 'rolling',
        dice: null,
        neutralPieces: {},
        winner: undefined,
        message: undefined,
      };
      await broadcastBoardState(gameId, emptyState);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Adjust turn index if the removed player was current or before current
    let newTurnIndex = currentState.turnIndex;
    if (newPlayerOrder.length > 0) {
      // If the removed player was the current player or before them in turn order
      const removedPlayerIndex =
        currentState.playerOrder.indexOf(removePlayerId);
      if (removedPlayerIndex <= currentState.turnIndex) {
        // Adjust turn index to point to the next valid player
        newTurnIndex = Math.max(0, currentState.turnIndex - 1);
        // Make sure we don't go out of bounds
        if (newTurnIndex >= newPlayerOrder.length) {
          newTurnIndex = 0;
        }
      }
    }

    // Clear neutral pieces if the removed player had any
    const newNeutralPieces = { ...currentState.neutralPieces };

    // Remove the player's permanent pieces from the board
    const newPieces = { ...currentState.pieces };
    for (const [columnStr, pieces] of Object.entries(newPieces)) {
      const column = Number(columnStr);
      newPieces[column] = pieces.filter((p) => p.playerId !== removePlayerId);
    }

    // Remove empty columns from pieces
    for (const [columnStr, pieces] of Object.entries(newPieces)) {
      const column = Number(columnStr);
      if (pieces.length === 0) {
        delete newPieces[column];
      }
    }

    const newState: GameState = {
      ...currentState,
      players: newPlayers,
      playerOrder: newPlayerOrder,
      turnIndex: newTurnIndex,
      neutralPieces: newNeutralPieces,
      pieces: newPieces,
      message: undefined,
    };
    await broadcastBoardState(gameId, newState);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
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
  let newPlayerOrder = [...(currentState.playerOrder || [])];

  if (color === '') {
    // Clear the player's entry
    delete newPlayers[playerSession.pid];
    // Remove from turn order if present
    newPlayerOrder = newPlayerOrder.filter((id) => id !== playerSession.pid);
  } else {
    // Set the player's color and name
    newPlayers[playerSession.pid] = { color, name };
    // Add to turn order if not already present
    if (!newPlayerOrder.includes(playerSession.pid)) {
      newPlayerOrder.push(playerSession.pid);
    }
  }

  const newState: GameState = {
    ...currentState,
    players: newPlayers,
    playerOrder: newPlayerOrder,
  };

  await broadcastBoardState(gameId, newState);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
