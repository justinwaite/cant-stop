import type { ActionFunctionArgs } from 'react-router';
import { broadcastBoardState } from './game.stream';
import { readBoardState } from '~/utils/board-state.server';
import { getPlayerSession } from '~/utils/session.server';
import { isValidGameCode } from '~/utils/game-code';
import type { GameState } from '~/types';
import {
  rollDice,
  choosePairs,
  hold,
  startGame,
} from '~/utils/game-engine.server';

// Type for the request body as a discriminated union
interface RollDiceAction {
  intent: 'rollDice';
}
interface HoldAction {
  intent: 'hold';
}
interface StartGameAction {
  intent: 'startGame';
}
interface ChoosePairsAction {
  intent: 'choosePairs';
  parameters: {
    pairs: [[number, number], [number, number]];
  };
}
type GameActionRequest =
  | RollDiceAction
  | HoldAction
  | StartGameAction
  | ChoosePairsAction;

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

  const reqBody = (await request.json()) as GameActionRequest;
  const prevState = await readBoardState(gameId);
  let newState: GameState = prevState;
  let bust = false;

  switch (reqBody.intent) {
    case 'rollDice': {
      newState = rollDice(prevState, playerSession.pid);
      bust = newState.turnIndex !== prevState.turnIndex;
      break;
    }
    case 'choosePairs':
      newState = choosePairs(
        prevState,
        playerSession.pid,
        reqBody.parameters.pairs,
      );
      break;
    case 'hold':
      newState = hold(prevState, playerSession.pid);
      break;
    case 'startGame':
      newState = startGame(prevState);
      break;
    default:
      return new Response(JSON.stringify({ error: 'Unknown intent' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
  }

  await broadcastBoardState(gameId, newState);
  return new Response(JSON.stringify({ ok: true, state: newState, bust }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
