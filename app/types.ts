export type GameState = {
  pieces: Record<string, Array<string>>;
  whitePieces: Array<string>;
  playerColors: Record<string, string>;
  lockedColumns: Array<number>;
};

export type BoardActionRequest = {
  pieces: Record<string, string[]>; // slotKey -> array of playerColors
  whitePieces: string[]; // white piece slot keys
  playerColors: Record<string, string>; // playerId -> color
  lockedColumns?: number[]; // locked column indices (0-based)
};
