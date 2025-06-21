import {controllers, readBoardState} from '~/utils/board-state.server';
import { isValidGameCode } from '~/utils/game-code';
import type { Route } from './+types/game.stream';

export async function loader({ request, params }: Route.LoaderArgs) {
  if (request.method !== 'GET') {
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

  let thisController: ReadableStreamDefaultController | null = null;
  const boardState = await readBoardState(gameId);
  const stream = new ReadableStream({
    start(controller) {
      thisController = controller;
      controller.enqueue(`data: ${JSON.stringify(boardState)}\n\n`);

      if (!controllers[gameId]) {
        controllers[gameId] = [];
      }
      controllers[gameId].push(controller);

      console.log(
        `[SSE] Client connected to game ${gameId}. Active controllers:`,
        controllers[gameId].length,
      );
    },
    cancel() {
      if (thisController && controllers[gameId]) {
        controllers[gameId] = controllers[gameId].filter(
          (c) => c !== thisController,
        );
        console.log(
          `[SSE] Client disconnected from game ${gameId}. Active controllers:`,
          controllers[gameId]?.length || 0,
        );
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

