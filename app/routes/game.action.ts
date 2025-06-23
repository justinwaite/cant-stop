import type { ActionFunctionArgs } from 'react-router';
import {
  broadcastBoardState,
  readBoardState,
} from '~/utils/board-state.server';
import {
  createUpdateSessionHeaders,
  getPlayerSession,
} from '~/utils/session.server';
import { isValidGameCode } from '~/utils/game-code';
import type { GameAction, GameState } from '~/types';
import {
  rollDice,
  choosePairs,
  hold,
  startGame,
  updatePlayerInfo,
  addPlayer,
  removePlayer,
} from '~/utils/game-engine.server';

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

  const action = (await request.json()) as GameAction;
  const prevState = await readBoardState(gameId);
  let newState: GameState = prevState;
  let bust = false;

  switch (action.intent) {
    case 'rollDice': {
      newState = rollDice(prevState, playerSession.pid);
      bust = newState.turnIndex !== prevState.turnIndex;
      break;
    }
    case 'choosePairs':
      newState = choosePairs(
        prevState,
        playerSession.pid,
        action.parameters.pairs,
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
        action.parameters.color,
        action.parameters.name,
      );
      break;
    case 'quitGame':
      newState = removePlayer(prevState, playerSession.pid);
      break;
    case 'addPlayer':
      newState = addPlayer(
        prevState,
        action.parameters.playerId,
        action.parameters.color,
        action.parameters.name,
      );
      break;
    case 'removePlayer':
      newState = removePlayer(prevState, action.parameters.playerId);
      break;
    case 'chat': {
      const player = prevState.players[playerSession.pid];
      if (!player || typeof action.parameters.message !== 'string') break;
      const newChat = {
        id: `${playerSession.pid}-${Date.now()}`,
        playerId: playerSession.pid,
        name: player.name,
        color: player.color,
        message: action.parameters.message,
        timestamp: action.parameters.timestamp || Date.now(),
      };
      newState = {
        ...prevState,
        chats: [...(prevState.chats || []), newChat].slice(-100),
      };
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
    headers: {
      'Content-Type': 'application/json',
      ...(action.intent === 'addPlayer' || action.intent === 'updatePlayerInfo'
        ? await createUpdateSessionHeaders(request, {
            previousName: action.parameters.name,
            previousColor: action.parameters.color,
          })
        : {}),
    },
  });
}
