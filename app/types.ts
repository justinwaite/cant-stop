export type GameState = {
  pieces: Record<string, Array<string>>; // slotKey -> array of playerIds
  whitePieces: Array<string>;
  playerColors: Record<string, string>; // playerId -> color
  lockedColumns: Record<number, string>; // columnIndex -> playerId who locked it
  lastRoll?: number[] | null; // last dice roll (4 dice)
};

export type BoardActionRequest = {
  pieces: Record<string, string[]>; // slotKey -> array of playerIds
  whitePieces: string[]; // white piece slot keys
  playerColors: Record<string, string>; // playerId -> color
  lockedColumns?: Record<number, string>; // columnIndex -> playerId who locked it
  lastRoll?: number[] | null; // last dice roll (4 dice)
};
