export const MAX_BODY_BYTES = 8 * 1024;

const REQUEST_KEYS = [
  "aiColor",
  "difficulty",
  "fen",
  "recentMoves",
  "requestId",
] as const;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const SAFE_SAN_PATTERN = /^(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$/;
const CANONICAL_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export type Difficulty = "easy" | "medium" | "hard";
export type ChessColor = "w" | "b";

export type AiMoveRequest = {
  requestId: string;
  fen: string;
  difficulty: Difficulty;
  aiColor: ChessColor;
  recentMoves: string[];
};

export class InvalidAiMoveRequestError extends Error {
  constructor() {
    super("Invalid AI move request");
    this.name = "InvalidAiMoveRequestError";
  }
}

function invalidRequest(): never {
  throw new InvalidAiMoveRequestError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactRequestKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return (
    keys.length === REQUEST_KEYS.length &&
    keys.every((key, index) => key === REQUEST_KEYS[index])
  );
}

function hasValidContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type");
  return contentType?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

function validateDeclaredBodyLength(request: Request): void {
  const value = request.headers.get("content-length");
  if (value === null) return;
  if (!/^\d+$/.test(value) || Number(value) > MAX_BODY_BYTES) invalidRequest();
}

async function readBoundedUtf8Body(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) invalidRequest();

  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        await reader.cancel();
        invalidRequest();
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof InvalidAiMoveRequestError) throw error;
    invalidRequest();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    invalidRequest();
  }
}

function validateParsedRequest(value: unknown): AiMoveRequest {
  if (!isRecord(value) || !hasExactRequestKeys(value)) invalidRequest();

  const { requestId, fen, difficulty, aiColor, recentMoves } = value;

  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    invalidRequest();
  }
  if (
    typeof fen !== "string" ||
    fen.length < 1 ||
    fen.length > 120 ||
    !/^[\x20-\x7E]+$/.test(fen)
  ) {
    invalidRequest();
  }
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    invalidRequest();
  }
  if (aiColor !== "w" && aiColor !== "b") invalidRequest();
  if (
    !Array.isArray(recentMoves) ||
    recentMoves.length > 8 ||
    !recentMoves.every(
      (move) =>
        typeof move === "string" &&
        move.length <= 16 &&
        SAFE_SAN_PATTERN.test(move),
    )
  ) {
    invalidRequest();
  }

  return { requestId, fen, difficulty, aiColor, recentMoves };
}

export async function parseAiMoveRequest(request: Request): Promise<AiMoveRequest> {
  if (!hasValidContentType(request)) invalidRequest();
  const contentEncoding = request.headers
    .get("content-encoding")
    ?.trim()
    .toLowerCase();
  if (contentEncoding && contentEncoding !== "identity") invalidRequest();
  validateDeclaredBodyLength(request);

  const body = await readBoundedUtf8Body(request);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    invalidRequest();
  }

  return validateParsedRequest(parsed);
}

export function parseLegalMoveCandidate(
  rawCandidate: string,
  legalMoves: ReadonlySet<string>,
): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawCandidate.trim()) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(parsed) || Object.keys(parsed).length !== 1) return null;
  if (!Object.prototype.hasOwnProperty.call(parsed, "move")) return null;
  if (typeof parsed.move !== "string") return null;

  const move = parsed.move.trim().toLowerCase();
  if (!CANONICAL_MOVE_PATTERN.test(move)) return null;

  const exactShape = /^\{\s*"move"\s*:\s*" *([a-h][1-8][a-h][1-8][qrbn]?) *"\s*\}$/i;
  const match = exactShape.exec(rawCandidate.trim());
  if (match?.[1]?.toLowerCase() !== move) return null;

  return legalMoves.has(move) ? move : null;
}
