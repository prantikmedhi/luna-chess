import { Chess, validateFen } from "chess.js";

import {
  AzureUnavailableError,
  selectLegalMoveFromProvider,
} from "../../../lib/ai/azure";
import {
  parseAiMoveRequest,
  type AiMoveRequest,
} from "../../../lib/ai/schema";

export const runtime = "nodejs";

const activeRequests = new Set<string>();

const ERROR_RESPONSES = {
  invalidRequest: {
    status: 400,
    body: {
      error: "INVALID_REQUEST",
      message: "The game position could not be processed.",
    },
  },
  moveNotAllowed: {
    status: 409,
    body: {
      error: "MOVE_NOT_ALLOWED",
      message: "Luna cannot move in this position.",
    },
  },
  requestInProgress: {
    status: 409,
    body: {
      error: "REQUEST_IN_PROGRESS",
      message: "An AI move is already in progress.",
    },
  },
  unavailable: {
    status: 503,
    body: {
      error: "AI_UNAVAILABLE",
      message: "AI is temporarily unavailable. Please try again.",
    },
  },
} as const;

type Outcome =
  | "invalid_fen"
  | "move_not_allowed"
  | "provider_unavailable"
  | "success";

function errorResponse(
  error: (typeof ERROR_RESPONSES)[keyof typeof ERROR_RESPONSES],
): Response {
  return Response.json(error.body, {
    status: error.status,
    headers: { "cache-control": "no-store" },
  });
}

function generateLegalMoves(request: AiMoveRequest): string[] | null {
  if (!validateFen(request.fen).ok) return null;

  let chess: Chess;
  try {
    chess = new Chess(request.fen);
  } catch {
    return null;
  }

  if (chess.isGameOver() || chess.turn() !== request.aiColor) return [];

  return chess.moves({ verbose: true }).map((move) =>
    `${move.from}${move.to}${move.promotion ?? ""}`.toLowerCase(),
  );
}

function logOutcome(metadata: {
  requestId: string;
  durationMs: number;
  difficulty: AiMoveRequest["difficulty"];
  attempts: number;
  fallback: boolean;
  outcome: Outcome;
}): void {
  console.info(JSON.stringify({ event: "ai_move", ...metadata }));
}

export async function POST(request: Request): Promise<Response> {
  let parsedRequest: AiMoveRequest;
  try {
    parsedRequest = await parseAiMoveRequest(request);
  } catch {
    return errorResponse(ERROR_RESPONSES.invalidRequest);
  }

  if (activeRequests.has(parsedRequest.requestId)) {
    return errorResponse(ERROR_RESPONSES.requestInProgress);
  }

  activeRequests.add(parsedRequest.requestId);
  const startedAt = Date.now();
  let attempts = 0;
  let fallback = false;
  let outcome: Outcome = "provider_unavailable";

  try {
    const legalMoves = generateLegalMoves(parsedRequest);
    if (legalMoves === null) {
      outcome = "invalid_fen";
      return errorResponse(ERROR_RESPONSES.invalidRequest);
    }
    if (legalMoves.length === 0) {
      outcome = "move_not_allowed";
      return errorResponse(ERROR_RESPONSES.moveNotAllowed);
    }

    const selection = await selectLegalMoveFromProvider({
      fen: parsedRequest.fen,
      sideToMove: parsedRequest.aiColor,
      difficulty: parsedRequest.difficulty,
      legalMoves,
      recentMoves: parsedRequest.recentMoves,
    });

    attempts = selection.attempts;
    fallback = selection.fallback;
    outcome = "success";

    return Response.json(
      { move: selection.move, fallback: selection.fallback },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AzureUnavailableError) attempts = error.attempts;
    outcome = "provider_unavailable";
    return errorResponse(ERROR_RESPONSES.unavailable);
  } finally {
    activeRequests.delete(parsedRequest.requestId);
    logOutcome({
      requestId: parsedRequest.requestId,
      durationMs: Date.now() - startedAt,
      difficulty: parsedRequest.difficulty,
      attempts,
      fallback,
      outcome,
    });
  }
}
