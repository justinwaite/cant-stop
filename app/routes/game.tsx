import { Board } from '~/board';
import { ActionBar } from '~/components/action-bar';
import { IconButton } from '~/components/icon-button';
import { Menu } from '~/components/menu';
import { readBoardState } from '~/utils/board-state.server';
import { isValidGameCode } from '~/utils/game-code';
import type { Route } from './+types/game';
import { usePlayerSession } from '~/utils/use-player-session';
import { useState } from 'react';
import { ColorPicker } from '~/components/color-picker';
import { Lobby } from '~/components/lobby';
import { TurnIndicator } from '~/components/turn-indicator';
import { ChatPanel } from '~/components/chat-panel';
import { GameProvider, useGameContext } from '~/utils/game-provider';
import { BustPopup } from '~/components/bust-popup';

export async function loader({ params }: Route.LoaderArgs) {
  const { gameId } = params;

  if (!isValidGameCode(gameId)) {
    throw new Response('Invalid game code', { status: 400 });
  }

  const gameState = await readBoardState(gameId);

  return { gameId, gameState };
}

export default function GameRoute({
  loaderData: { gameId, gameState: initialGameState },
}: Route.ComponentProps) {
  return (
    <GameProvider gameId={gameId} initialGameState={initialGameState}>
      <Game />
    </GameProvider>
  );
}

function Game() {
  const { pid, previousName, previousColor } = usePlayerSession();
  const { gameState, act, showBustPopup } = useGameContext();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const { players, playerOrder, turnIndex, started, message } = gameState;
  const playerColor = players[pid]?.color || null;
  const currentTurnPlayerId = playerOrder[turnIndex];
  const isMyTurn = pid === currentTurnPlayerId;

  // Show color/name picker if not set up
  if (!playerColor) {
    return (
      <ColorPicker
        initialName={previousName || undefined}
        initialColor={previousColor || undefined}
        onSelect={(color, name) => {
          act({
            intent: 'addPlayer',
            parameters: { playerId: pid, color, name },
          });
        }}
        takenColors={Object.values(players).map((p) => p.color)}
      />
    );
  }

  // Show color picker for editing
  if (showColorPicker) {
    return (
      <ColorPicker
        onSelect={(color, name) => {
          act({ intent: 'updatePlayerInfo', parameters: { color, name } });
          setShowColorPicker(false);
        }}
        takenColors={Object.values(players)
          .filter((p) => p.color !== playerColor) // Exclude current player's color
          .map((p) => p.color)}
        initialColor={playerColor}
        initialName={players[pid]?.name || ''}
        isEditing={true}
      />
    );
  }

  // LOBBY: Show before game starts
  if (!started) {
    return <Lobby />;
  }

  return (
    <div
      className="flex flex-col overflow-hidden h-[100dvh] w-full"
      style={{
        background: 'linear-gradient(180deg, #E85E37 0%, #F08B4C 100%)',
      }}
    >
      <div className="fixed top-4 inset-x-4 flex justify-between z-50 gap-2 items-start">
        <div className="flex flex-col items-center gap-2">
          {/* Menu button */}
          <Menu
            onChangeColor={() => {
              setShowColorPicker(true);
            }}
          />

          {/* Chat icon button */}
          <IconButton
            onClick={() => setShowChat((v) => !v)}
            aria-label="Open chat"
          >
            {/* Simple chat bubble SVG */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#E85E37"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </IconButton>
        </div>

        {/* Turn indicator (top right) */}
        {started && playerOrder.length > 0 && (
          <TurnIndicator
            players={players}
            playerOrder={playerOrder}
            turnIndex={turnIndex}
          />
        )}
      </div>

      {/* Message display for current player */}
      {isMyTurn && message && (
        <div
          className="fixed top-16 right-4 z-40 px-4 py-2 rounded-lg shadow max-w-xs"
          style={{
            background: '#F5E4D5',
            border: '2px solid #E2BFA3',
            color: '#842616',
            fontWeight: 500,
          }}
        >
          {gameState.message}
        </div>
      )}

      {/* Bust popup */}
      {showBustPopup && <BustPopup />}

      {/* Chat panel */}
      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}

      {/* Game board */}
      <Board gameState={gameState} />

      {/* Action bar at the bottom */}
      <ActionBar />
    </div>
  );
}
