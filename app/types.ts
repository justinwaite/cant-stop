export type GameState = {
  pieces: Record<string, Array<string>>; // slotKey -> array of playerIds
  whitePieces: Array<string>;
  players: Record<string, { color: string; name: string }>; // playerId -> { color, name }
  lockedColumns: Record<number, string>; // columnIndex -> playerId who locked it
  lastRoll?: number[] | null; // last dice roll (4 dice)
  started?: boolean; // whether the game has started
};

export type BoardActionRequest = {
  pieces: Record<string, string[]>; // slotKey -> array of playerIds
  whitePieces: string[]; // white piece slot keys
  players: Record<string, { color: string; name: string }>; // playerId -> { color, name }
  lockedColumns?: Record<number, string>; // columnIndex -> playerId who locked it
  lastRoll?: number[] | null; // last dice roll (4 dice)
  started?: boolean; // whether the game has started
};
