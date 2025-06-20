import path from 'node:path';
import * as fs from 'node:fs/promises';
import type { GameState } from '~/types';

export function getBoardStateFile(gameId: string): string {
  return path.resolve(process.cwd(), 'boards', `${gameId}.json`);
}

export async function readBoardState(gameId: string): Promise<GameState> {
  try {
    const stateFile = getBoardStateFile(gameId);
    const data = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      pieces: {},
      whitePieces: [],
      playerColors: {},
      lockedColumns: {},
      lastRoll: null,
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
