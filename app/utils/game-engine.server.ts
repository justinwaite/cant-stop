// Server-side game engine for Can't Stop
import type { GameState, GamePhase } from '~/types';
import { generateGameCode } from '~/utils/game-code';

// Utility to get the current player's ID
function getCurrentPlayerId(state: GameState): string {
  return state.playerOrder[state.turnIndex];
}

// Helper: Check if there is at least one valid pair
function getAllPairings(dice: number[]): [number, number][][] {
  // Returns all 3 unique ways to pair 4 dice into two pairs
  return [
    // (0,1)-(2,3)
    [
      [dice[0], dice[1]],
      [dice[2], dice[3]],
    ],
    // (0,2)-(1,3)
    [
      [dice[0], dice[2]],
      [dice[1], dice[3]],
    ],
    // (0,3)-(1,2)
    [
      [dice[0], dice[3]],
      [dice[1], dice[2]],
    ],
  ];
}

function hasValidPair(state: GameState, dice: number[]): boolean {
  const neutralCols = Object.keys(state.neutralPieces).map(Number);
  const numNeutrals = neutralCols.length;
  const maxNeutrals = 3;

  // Helper: can we use this sum as a neutral piece?
  function canUseSum(sum: number): boolean {
    if (neutralCols.includes(sum)) {
      // Check if the neutral piece can be advanced (not at the top)
      const currentSlot = state.neutralPieces[sum];
      const topSlot = getTopSlotForColumn(sum);
      return currentSlot < topSlot - 1; // Can advance if not at the top
    }
    if (numNeutrals < maxNeutrals && !state.lockedColumns[sum]) return true;
    return false;
  }

  for (const pairing of getAllPairings(dice)) {
    const [pair1, pair2] = pairing;
    const sum1 = sumPair(pair1);
    const sum2 = sumPair(pair2);
    if (canUseSum(sum1) || canUseSum(sum2)) {
      return true;
    }
  }
  return false;
}

// Roll 4 dice and check for bust
export function rollDice(state: GameState, playerId: string): GameState {
  // Only allow if it's the current player's turn and phase is 'rolling'
  if (getCurrentPlayerId(state) !== playerId || state.phase !== 'rolling') {
    return state;
  }
  // Generate 4 dice
  const dice = Array.from(
    { length: 4 },
    () => Math.floor(Math.random() * 6) + 1,
  );
  // Check for valid pairs
  if (!hasValidPair(state, dice)) {
    // Bust! Advance turn
    return advanceTurn(state);
  }
  // Success: at least one valid pair
  return {
    ...state,
    dice,
    phase: 'pairing',
    message: undefined,
  };
}

// Utility: Given a pair, return its sum
function sumPair(pair: [number, number]): number {
  return pair[0] + pair[1];
}

// Helper: Check if a pair is valid for the current game state
function isValidPair(state: GameState, pair: [number, number]): boolean {
  const sum = sumPair(pair);
  const neutralCols = Object.keys(state.neutralPieces).map(Number);

  // If we have a neutral piece on this column, check if we can advance it
  if (neutralCols.includes(sum)) {
    const currentSlot = state.neutralPieces[sum];
    const topSlot = getTopSlotForColumn(sum);
    return currentSlot < topSlot - 1; // Can advance if not at the top
  }

  // If we have fewer than 3 neutral pieces and the column isn't locked, we can start a new one
  if (
    Object.keys(state.neutralPieces).length < 3 &&
    !state.lockedColumns[sum]
  ) {
    // Check if player already has a permanent piece in this column
    const existingPieces = state.pieces[sum] || [];
    const playerPieces = existingPieces.filter(
      (p) => p.playerId === getCurrentPlayerId(state),
    );

    // Find the next available slot (above the highest permanent piece)
    const highestPlayerSlot =
      playerPieces.length > 0
        ? Math.max(...playerPieces.map((p) => p.slot))
        : -1;
    const nextSlot = highestPlayerSlot + 1;

    // Check if this slot is within the column's height
    const topSlot = getTopSlotForColumn(sum);
    return nextSlot < topSlot;
  }

  return false;
}

// Player chooses pairs from dice
export function choosePairs(
  state: GameState,
  playerId: string,
  pairs: [[number | null, number | null], [number | null, number | null]],
): GameState {
  if (getCurrentPlayerId(state) !== playerId || state.phase !== 'pairing') {
    return state;
  }

  const dice = state.dice;
  if (!dice) return state;

  // Filter out pairs that are not fully filled
  const validPairs = pairs.filter(
    (pair) => pair[0] !== null && pair[1] !== null,
  ) as [number, number][];
  if (validPairs.length === 0) return state;

  // Check if player is only submitting one pair
  if (validPairs.length === 1) {
    // Find the remaining dice that weren't used
    const usedDice = validPairs[0];
    const diceCopy = [...dice];

    // Remove the used dice from the copy
    const idx1 = diceCopy.indexOf(usedDice[0]);
    if (idx1 !== -1) diceCopy.splice(idx1, 1);
    const idx2 = diceCopy.indexOf(usedDice[1]);
    if (idx2 !== -1) diceCopy.splice(idx2, 1);

    const remainingDice = diceCopy;

    // Check if the remaining dice form a valid pair
    if (remainingDice.length === 2) {
      const remainingPair: [number, number] = [
        remainingDice[0],
        remainingDice[1],
      ];

      // Create a temporary state that includes the pending changes from the submitted pair
      const tempState = {
        ...state,
        neutralPieces: { ...state.neutralPieces }, // Deep copy of neutralPieces
      };
      const submittedSum = sumPair(usedDice);

      // Simulate applying the submitted pair to the temporary state (without actually changing the real state)
      if (tempState.neutralPieces[submittedSum] !== undefined) {
        // Check if advancing this piece would go out of bounds
        const currentSlot = tempState.neutralPieces[submittedSum];
        const topSlot = getTopSlotForColumn(submittedSum);
        if (currentSlot >= topSlot - 1) {
          return {
            ...state,
            message:
              'Invalid move: cannot advance piece beyond the top of the column.',
          };
        }
        tempState.neutralPieces[submittedSum] += 1;
      } else {
        // Check if player already has a permanent piece in this column
        const existingPieces = tempState.pieces[submittedSum] || [];
        const playerPieces = existingPieces.filter(
          (p) => p.playerId === playerId,
        );

        // Find the next available slot (above the highest permanent piece)
        const highestPlayerSlot =
          playerPieces.length > 0
            ? Math.max(...playerPieces.map((p) => p.slot))
            : -1;
        const nextSlot = highestPlayerSlot + 1;

        // Check if this slot is within the column's height
        const topSlot = getTopSlotForColumn(submittedSum);
        if (
          Object.keys(tempState.neutralPieces).length < 3 &&
          !tempState.lockedColumns[submittedSum] &&
          nextSlot < topSlot
        ) {
          tempState.neutralPieces[submittedSum] = nextSlot;
        }
      }

      // Now check if the remaining pair is valid in the updated state
      if (isValidPair(tempState, remainingPair)) {
        // Player must use both pairs since the remaining pair is valid
        return {
          ...state,
          message:
            'You must use both pairs since the remaining dice form a valid pair.',
        };
      }
    }
  }

  const allDice = validPairs.flat();
  if (allDice.length !== validPairs.length * 2) return state;
  const diceCopy = [...dice];
  for (const d of allDice) {
    const idx = diceCopy.indexOf(d);
    if (idx === -1) return state;
    diceCopy.splice(idx, 1);
  }
  if (diceCopy.length !== 4 - allDice.length) return state;

  let newNeutralPieces = { ...state.neutralPieces };
  for (const pair of validPairs) {
    const sum = sumPair(pair);
    if (newNeutralPieces[sum] !== undefined) {
      // Check if advancing this piece would go out of bounds
      const currentSlot = newNeutralPieces[sum];
      const topSlot = getTopSlotForColumn(sum);
      if (currentSlot >= topSlot - 1) {
        return {
          ...state,
          message:
            'Invalid move: cannot advance piece beyond the top of the column.',
        };
      }
      newNeutralPieces[sum] += 1;
    } else {
      // Check if player already has a permanent piece in this column
      const existingPieces = state.pieces[sum] || [];
      const playerPieces = existingPieces.filter(
        (p) => p.playerId === playerId,
      );

      // Find the next available slot (above the highest permanent piece)
      const highestPlayerSlot =
        playerPieces.length > 0
          ? Math.max(...playerPieces.map((p) => p.slot))
          : -1;
      const nextSlot = highestPlayerSlot + 1;

      // Check if this slot is within the column's height
      const topSlot = getTopSlotForColumn(sum);
      if (
        Object.keys(newNeutralPieces).length < 3 &&
        !state.lockedColumns[sum] &&
        nextSlot < topSlot
      ) {
        newNeutralPieces[sum] = nextSlot;
      } else {
        return {
          ...state,
          message: 'Invalid move: cannot place a neutral piece in that column.',
        };
      }
    }
  }

  // Clear message on successful action
  return {
    ...state,
    neutralPieces: newNeutralPieces,
    phase: 'rolling',
    dice: null,
    message: undefined,
  };
}

// Helper: Get the top slot for a column (Can't Stop columns are 2-12)
function getTopSlotForColumn(col: number): number {
  // Standard Can't Stop board: columns 2-12, with varying heights
  const columnHeights: Record<number, number> = {
    2: 3,
    3: 5,
    4: 7,
    5: 9,
    6: 11,
    7: 13,
    8: 11,
    9: 9,
    10: 7,
    11: 5,
    12: 3,
  };
  return columnHeights[col] ?? 0;
}

export function hold(state: GameState, playerId: string): GameState {
  // Only allow if it's the current player's turn and phase is 'rolling'
  if (getCurrentPlayerId(state) !== playerId || state.phase !== 'rolling') {
    return state;
  }

  // No neutral pieces to commit
  if (Object.keys(state.neutralPieces).length === 0) {
    return state;
  }

  // Copy pieces and lockedColumns
  const newPieces: GameState['pieces'] = { ...state.pieces };
  const newLockedColumns = { ...state.lockedColumns };

  // For each neutral piece, commit it to the player's permanent pieces
  for (const [colStr, slot] of Object.entries(state.neutralPieces)) {
    const col = Number(colStr);
    // Add to permanent pieces (slot is 0-based)
    if (!newPieces[col]) newPieces[col] = [];
    newPieces[col] = [
      ...newPieces[col].filter((p) => p.playerId !== playerId),
      { playerId, slot },
    ];

    // If this is the top slot, lock the column
    const topSlot = getTopSlotForColumn(col); // topSlot is 1-based
    if (slot === topSlot - 1) {
      newLockedColumns[col] = playerId;
    }
  }

  // Win detection: if player has 3 or more locked columns, they win
  const lockedCount = Object.values(newLockedColumns).filter(
    (pid) => pid === playerId,
  ).length;
  const winner = lockedCount >= 3 ? playerId : undefined;

  // If the player won, do not advance the turn
  if (winner) {
    // If nextGame is not set, generate a new game code
    const nextGame = state.nextGame || generateGameCode();
    return {
      ...state,
      pieces: newPieces,
      lockedColumns: newLockedColumns,
      neutralPieces: {},
      winner,
      nextGame,
      message: undefined,
    };
  }

  // Otherwise, advance the turn
  return advanceTurn({
    ...state,
    pieces: newPieces,
    lockedColumns: newLockedColumns,
    neutralPieces: {},
  });
}

// Utility: Advance to next player
export function advanceTurn(state: GameState): GameState {
  // Find the next player who is still in the game
  let nextTurnIndex = state.turnIndex;
  const numPlayers = state.playerOrder.length;
  for (let i = 1; i <= numPlayers; i++) {
    const candidate = (state.turnIndex + i) % numPlayers;
    const playerId = state.playerOrder[candidate];
    if (state.players[playerId]) {
      nextTurnIndex = candidate;
      break;
    }
  }
  return {
    ...state,
    turnIndex: nextTurnIndex,
    dice: null,
    neutralPieces: {},
    phase: 'rolling',
    message: undefined,
  };
}

export function startGame(state: GameState): GameState {
  if (state.started) return state;
  const playerOrder = Object.keys(state.players).sort(
    () => Math.random() - 0.5,
  );
  return {
    ...state,
    started: true,
    playerOrder,
    turnIndex: 0,
    phase: 'rolling',
    dice: null,
    neutralPieces: {},
    winner: undefined,
  };
}

export function updatePlayerInfo(
  state: GameState,
  playerId: string,
  color: string,
  name: string,
): GameState {
  // Check if the color is already taken by another player
  const colorTaken = Object.entries(state.players).some(
    ([pid, player]) => pid !== playerId && player.color === color,
  );

  if (colorTaken) {
    return {
      ...state,
      message: 'That color is already taken by another player.',
    };
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { color, name },
    },
    message: undefined,
  };
}

export function removePlayer(state: GameState, playerId: string): GameState {
  // Remove player from players list
  const newPlayers = { ...state.players };
  delete newPlayers[playerId];

  // Remove player from turn order
  const newPlayerOrder = state.playerOrder.filter((id) => id !== playerId);

  // If no players left, return empty state
  if (Object.keys(newPlayers).length === 0) {
    return {
      ...state,
      players: {},
      playerOrder: [],
      turnIndex: 0,
      started: false,
      phase: 'rolling',
      dice: null,
      neutralPieces: {},
      winner: undefined,
      message: undefined,
    };
  }

  // Adjust turn index if the removed player was current or before current
  let newTurnIndex = state.turnIndex;
  if (newPlayerOrder.length > 0) {
    const removedPlayerIndex = state.playerOrder.indexOf(playerId);
    if (removedPlayerIndex <= state.turnIndex) {
      newTurnIndex = Math.max(0, state.turnIndex - 1);
      if (newTurnIndex >= newPlayerOrder.length) {
        newTurnIndex = 0;
      }
    }
  }

  // Remove the player's permanent pieces from the board
  const newPieces = { ...state.pieces };
  for (const [columnStr, pieces] of Object.entries(newPieces)) {
    const column = Number(columnStr);
    newPieces[column] = pieces.filter((p) => p.playerId !== playerId);
  }
  for (const [columnStr, pieces] of Object.entries(newPieces)) {
    const column = Number(columnStr);
    if (pieces.length === 0) {
      delete newPieces[column];
    }
  }

  // If the removed player was the current player, clear neutral pieces
  const wasCurrentPlayer = state.playerOrder[state.turnIndex] === playerId;
  const newNeutralPieces = wasCurrentPlayer ? {} : { ...state.neutralPieces };

  return {
    ...state,
    players: newPlayers,
    playerOrder: newPlayerOrder,
    turnIndex: newTurnIndex,
    pieces: newPieces,
    neutralPieces: newNeutralPieces,
    message: undefined,
  };
}

export function addPlayer(
  state: GameState,
  playerId: string,
  color: string,
  name: string,
): GameState {
  // Don't add if already present
  if (state.players[playerId]) return state;
  const newPlayers = { ...state.players, [playerId]: { color, name } };
  let newPlayerOrder = [...state.playerOrder];
  if (!newPlayerOrder.includes(playerId)) {
    newPlayerOrder.push(playerId);
  }
  return {
    ...state,
    players: newPlayers,
    playerOrder: newPlayerOrder,
    message: undefined,
  };
}
