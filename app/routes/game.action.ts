import type { ActionFunctionArgs } from 'react-router';
import {
  broadcastBoardState,
  readBoardState,
} from '~/utils/board-state.server';
import { getPlayerSession } from '~/utils/session.server';
import { isValidGameCode } from '~/utils/game-code';
import type { GameState } from '~/types';
import {
  rollDice,
  choosePairs,
  hold,
  startGame,
  updatePlayerInfo,
  addPlayer,
  removePlayer,
  startNextGame,
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
interface UpdatePlayerInfoAction {
  intent: 'updatePlayerInfo';
  parameters: {
    color: string;
    name: string;
  };
}
interface QuitGameAction {
  intent: 'quitGame';
}
interface AddPlayerAction {
  intent: 'addPlayer';
  parameters: {
    playerId: string;
    color: string;
    name: string;
  };
}
interface RemovePlayerAction {
  intent: 'removePlayer';
  parameters: {
    playerId: string;
  };
}
interface StartNextGameAction {
  intent: 'startNextGame';
}
type GameActionRequest =
  | RollDiceAction
  | HoldAction
  | StartGameAction
  | ChoosePairsAction
  | UpdatePlayerInfoAction
  | QuitGameAction
  | AddPlayerAction
  | RemovePlayerAction
  | StartNextGameAction;

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
    case 'updatePlayerInfo':
      newState = updatePlayerInfo(
        prevState,
        playerSession.pid,
        reqBody.parameters.color,
        reqBody.parameters.name,
      );
      break;
    case 'quitGame':
      newState = removePlayer(prevState, playerSession.pid);
      break;
    case 'addPlayer':
      newState = addPlayer(
        prevState,
        reqBody.parameters.playerId,
        reqBody.parameters.color,
        reqBody.parameters.name,
      );
      break;
    case 'removePlayer':
      newState = removePlayer(prevState, reqBody.parameters.playerId);
      break;
    case 'startNextGame': {
      const result = startNextGame(prevState, playerSession.pid);
      newState = result.updatedState;
      break;
    }
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
