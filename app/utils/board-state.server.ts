import path from 'node:path';
import * as fs from 'node:fs/promises';
import type { GameState } from '~/types';

export let controllers: Record<string, ReadableStreamDefaultController[]> = {};

export function getBoardStateFile(gameId: string): string {
  return path.resolve(process.cwd(), 'boards', `${gameId}.json`);
}

export async function readBoardState(gameId: string): Promise<GameState> {
  try {
    const stateFile = getBoardStateFile(gameId);
    const data = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(data);
  } catch {
    // Return a valid empty GameState
    return {
      pieces: {},
      players: {},
      lockedColumns: {},
      playerOrder: [],
      turnIndex: 0,
      started: false,
      phase: 'rolling',
      dice: null,
      neutralPieces: {},
      winner: undefined,
    };
  }
}

export async function writeBoardState(gameId: string, state: any) {
  const stateFile = getBoardStateFile(gameId);

  // Ensure the boards directory exists
  const boardsDir = path.dirname(stateFile);
  try {
    await fs.access(boardsDir);
  } catch {
    await fs.mkdir(boardsDir, { recursive: true });
  }

  await fs.writeFile(stateFile, JSON.stringify(state), 'utf8');
}

// Helper to broadcast to all clients for a specific game
export async function broadcastBoardState(gameId: string, newState: any) {
  await writeBoardState(gameId, newState);

  if (controllers[gameId]) {
    for (const controller of controllers[gameId]) {
      try {
        controller.enqueue(`data: ${JSON.stringify(newState)}\n\n`);
      } catch (e) {
        // Ignore errors from closed controllers
      }
    }
  }
}
