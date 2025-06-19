import type { LoaderFunctionArgs } from "react-router";
import { promises as fs } from "fs";
import path from "path";

const stateFile = path.resolve(process.cwd(), "board-state.json");
let controllers: ReadableStreamDefaultController[] = [];

async function readBoardState() {
  try {
    const data = await fs.readFile(stateFile, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed.lockedColumns) parsed.lockedColumns = [];
    return parsed;
  } catch {
    return { pieces: {}, whitePieces: [], playerColors: {}, lockedColumns: [] };
  }
}

async function writeBoardState(state: any) {
  await fs.writeFile(stateFile, JSON.stringify(state), "utf8");
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let thisController: ReadableStreamDefaultController | null = null;
  const boardState = await readBoardState();
  const stream = new ReadableStream({
    start(controller) {
      thisController = controller;
      controller.enqueue(`data: ${JSON.stringify(boardState)}\n\n`);
      controllers.push(controller);
      console.log(
        "[SSE] Client connected. Active controllers:",
        controllers.length
      );
    },
    cancel() {
      if (thisController) {
        controllers = controllers.filter((c) => c !== thisController);
        console.log(
          "[SSE] Client disconnected. Active controllers:",
          controllers.length
        );
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Helper to broadcast to all clients
export async function broadcastBoardState(newState: any) {
  await writeBoardState(newState);
  for (const controller of controllers) {
    try {
      controller.enqueue(`data: ${JSON.stringify(newState)}\n\n`);
    } catch (e) {
      // Ignore errors from closed controllers
    }
  }
}
