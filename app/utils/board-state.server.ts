import path from 'node:path';
import * as fs from 'node:fs/promises';
import type { GameState } from '~/types';

const stateFile = path.resolve(process.cwd(), 'board-state.json');

export async function readBoardState(): Promise<GameState> {
  try {
    const data = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      pieces: {},
      whitePieces: [],
      playerColors: {},
      lockedColumns: [],
    };
  }
}

export async function writeBoardState(state: any) {
  await fs.writeFile(stateFile, JSON.stringify(state), 'utf8');
}
