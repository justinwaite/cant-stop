export type GamePhase = 'rolling' | 'pairing';

export interface GameState {
  // Board and player info
  pieces: Record<number, Array<{ playerId: string; slot: number }>>; // column -> array of { playerId, slot }
  players: Record<string, { color: string; name: string }>;
  lockedColumns: Record<number, string>; // number -> playerId who won it
  playerOrder: string[];
  turnIndex: number;
  started: boolean;

  // Engine/gameplay info
  phase: GamePhase;
  dice: number[] | null;
  neutralPieces: Record<string, number>; // number (column) -> slot index
  winner?: string;
  message?: string; // Message to show to the current player
  nextGame?: string; // ID of the next game if created
  nextGameCreator?: string; // Player ID of who created the next game
}
