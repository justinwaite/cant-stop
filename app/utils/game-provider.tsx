import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { GameAction, GameActionResponse, GameState } from '~/types';

type GameContextData = {
  gameId: string;
  gameState: GameState;
  showBustPopup: boolean;
  act: (action: GameAction) => Promise<void>;
};

const GameContext = createContext<GameContextData | undefined>(undefined);

type GameStateProviderProps = PropsWithChildren & {
  gameId: string;
  initialGameState: GameState;
};

export function GameProvider({
  children,
  gameId,
  initialGameState,
}: GameStateProviderProps) {
  const [gameState, setGameState] = useState(initialGameState);
  const [showBustPopup, setShowBustPopup] = useState(false);

  // SSE: Listen for board state updates
  useEffect(() => {
    if (!gameId) return;
    const evtSource = new EventSource(`/game/${gameId}/stream`);
    evtSource.onmessage = (event) => {
      if (!event.data) return;
      try {
        const state = JSON.parse(event.data);
        if (state) {
          setGameState(state);
        }
      } catch {}
    };
    return () => evtSource.close();
  }, [gameId]);

  const act = useCallback(
    async function act(action: GameAction) {
      const response = await fetch(`/game/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });

      const result = (await response.json()) as GameActionResponse;
      setGameState(result.state);
      if (result.bust) {
        setShowBustPopup(true);
        setTimeout(() => setShowBustPopup(false), 2000);
      }
    },
    [gameId],
  );

  const value = useMemo(
    () => ({
      gameId,
      gameState,
      act,
      showBustPopup,
    }),
    [gameId, gameState, act, showBustPopup],
  );

  return <GameContext value={value}>{children}</GameContext>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
