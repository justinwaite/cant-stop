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
  chats: Array<{
    id: string;
    playerId: string;
    name: string;
    color: string;
    message: string;
    timestamp: number;
  }>;
}

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
    pairs: Array<[number, number]>;
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
interface ChatAction {
  intent: 'chat';
  parameters: {
    message: string;
    timestamp: number;
  };
}

export type GameAction =
  | RollDiceAction
  | HoldAction
  | StartGameAction
  | ChoosePairsAction
  | UpdatePlayerInfoAction
  | QuitGameAction
  | AddPlayerAction
  | RemovePlayerAction
  | ChatAction;

export type GameActionResponse = {
  bust: boolean;
  state: GameState;
};
