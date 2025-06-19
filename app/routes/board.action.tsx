import type { ActionFunctionArgs } from "react-router";
import { broadcastBoardState } from "./board.stream";
import { promises as fs } from "fs";
import path from "path";

const stateFile = path.resolve(process.cwd(), "board-state.json");

async function readBoardState() {
  try {
    const data = await fs.readFile(stateFile, "utf8");
    return JSON.parse(data);
  } catch {
    return { pieces: {}, whitePieces: [], playerColors: {}, lockedColumns: [] };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { pieces, whitePieces, playerColors, lockedColumns } =
    await request.json();
  // Defensive: always start from the latest state
  const prevState = await readBoardState();
  const newLocked = new Set(lockedColumns || prevState.lockedColumns || []);
  const newPieces: Record<string, string[]> = { ...pieces };

  // For each column, if the top slot contains any color, lock the column and clear all colored pieces from it
  for (let colIdx = 0; colIdx < 11; ++colIdx) {
    const topKey = `${colIdx}-0`;
    if (
      Array.isArray(newPieces[topKey]) &&
      newPieces[topKey].length > 0 &&
      !newLocked.has(colIdx)
    ) {
      newLocked.add(colIdx);
      // Remove all colored pieces from this column
      for (let i = 0; i < 11 + 2 - Math.abs(6 - colIdx) * 2; ++i) {
        // columnSlots[colIdx]
        const k = `${colIdx}-${i}`;
        delete newPieces[k];
      }
    }
  }

  const newState = {
    pieces: newPieces,
    whitePieces,
    playerColors,
    lockedColumns: Array.from(newLocked),
  };
  await broadcastBoardState(newState);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
