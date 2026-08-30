import {
  MAX_BODY_BYTES,
  parseLegalMoveCandidate,
  type ChessColor,
  type Difficulty,
} from "./schema";

const PROVIDER_TIMEOUT_MS = 20_000;
const MAX_PROVIDER_ATTEMPTS = 3;
const DEPLOYMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const API_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}(?:-preview)?$/;
const DEFAULT_API_VERSION = "2024-10-21";

const SYSTEM_PROMPT = `You are Luna, a chess move selector. Choose exactly one move for the supplied position. Never change the board or invent a move. The move must be one of the provided legalMoves strings. Return only strict JSON matching {"move":"e2e4"}. No markdown, explanation, or extra keys.`;

const DIFFICULTY_INSTRUCTIONS: Record<Difficulty, string> = {
  easy: "Choose a simple legal move. An intentionally imperfect choice is acceptable.",
  medium: "Choose a solid, sensible legal move.",
  hard: "Before answering, consider checks, captures, threats, king safety, and material. Output only the required JSON.",
};

export type AzureMoveInput = {
  fen: string;
  sideToMove: ChessColor;
  difficulty: Difficulty;
  legalMoves: readonly string[];
  recentMoves: readonly string[];
};

export type MoveSelection = {
  move: string;
  fallback: boolean;
  attempts: number;
};

export type CandidateProvider = (
  input: AzureMoveInput,
  previousInvalidCandidate: string | null,
  attempt: number,
) => Promise<string>;

type AzureConfig = {
  apiKey: string;
  deployment: string;
  usesV1Endpoint: boolean;
  url: URL;
};

export class AzureUnavailableError extends Error {
  readonly attempts: number;

  constructor(attempts: number) {
    super("Azure OpenAI is unavailable");
    this.name = "AzureUnavailableError";
    this.attempts = attempts;
  }
}

function loadAzureConfig(): AzureConfig {
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION?.trim() || DEFAULT_API_VERSION;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();

  if (
    !apiKey ||
    !endpoint ||
    !deployment ||
    !API_VERSION_PATTERN.test(apiVersion) ||
    !DEPLOYMENT_PATTERN.test(deployment)
  ) {
    throw new AzureUnavailableError(0);
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new AzureUnavailableError(0);
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new AzureUnavailableError(0);
  }

  const basePath = url.pathname.replace(/\/+$/, "");
  const usesV1Endpoint = basePath.endsWith("/openai/v1");
  url.pathname = usesV1Endpoint
    ? `${basePath}/chat/completions`
    : `${basePath}/openai/deployments/${deployment}/chat/completions`;
  if (!usesV1Endpoint) url.searchParams.set("api-version", apiVersion);

  return { apiKey, deployment, usesV1Endpoint, url };
}

function buildMessages(
  input: AzureMoveInput,
  previousInvalidCandidate: string | null,
): Array<{ role: "system" | "user"; content: string }> {
  const recentMoves =
    input.difficulty === "easy" ? input.recentMoves.slice(-2) : input.recentMoves;
  const context = {
    fen: input.fen,
    sideToMove: input.sideToMove,
    difficulty: input.difficulty,
    legalMoves: input.legalMoves,
    recentMoves,
  };

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT} ${DIFFICULTY_INSTRUCTIONS[input.difficulty]}`,
    },
    { role: "user", content: JSON.stringify(context) },
  ];

  if (previousInvalidCandidate !== null) {
    messages.push({
      role: "user",
      content: JSON.stringify({
        correction: "The previous response was invalid. Return exactly one legal move in the required JSON shape.",
        previousInvalidCandidate: previousInvalidCandidate.slice(0, 160),
        legalMoves: input.legalMoves,
        requiredShape: { move: "e2e4" },
      }),
    });
  }

  return messages;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBoundedProviderBody(response: Response): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_BODY_BYTES)
  ) {
    await response.body?.cancel();
    throw new Error("Invalid provider response");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Invalid provider response");

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("Invalid provider response");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function extractCandidate(responseBody: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseBody) as unknown;
  } catch {
    throw new Error("Invalid provider response");
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.choices)) {
    throw new Error("Invalid provider response");
  }
  const firstChoice: unknown = parsed.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new Error("Invalid provider response");
  }
  const content = firstChoice.message.content;
  if (typeof content !== "string") {
    throw new Error("Invalid provider response");
  }

  return content;
}

export async function requestAzureCandidate(
  input: AzureMoveInput,
  previousInvalidCandidate: string | null,
  attempt: number,
): Promise<string> {
  let config: AzureConfig;
  try {
    config = loadAzureConfig();
  } catch {
    throw new AzureUnavailableError(attempt - 1);
  }

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...(config.usesV1Endpoint ? { model: config.deployment } : {}),
        messages: buildMessages(input, previousInvalidCandidate),
        response_format: { type: "json_object" },
        max_completion_tokens: 256,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Provider rejected request");
    }
    return extractCandidate(await readBoundedProviderBody(response));
  } catch {
    throw new AzureUnavailableError(attempt);
  }
}

export async function selectLegalMoveFromProvider(
  input: AzureMoveInput,
  provider: CandidateProvider = requestAzureCandidate,
  random: () => number = Math.random,
): Promise<MoveSelection> {
  if (input.legalMoves.length === 0) throw new AzureUnavailableError(0);

  const legalMoveSet = new Set(input.legalMoves);
  let previousInvalidCandidate: string | null = null;

  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    let rawCandidate: string;
    try {
      rawCandidate = await provider(input, previousInvalidCandidate, attempt);
    } catch (error) {
      if (error instanceof AzureUnavailableError) throw error;
      throw new AzureUnavailableError(attempt);
    }

    const move = parseLegalMoveCandidate(rawCandidate, legalMoveSet);
    if (move !== null) return { move, fallback: false, attempts: attempt };
    previousInvalidCandidate = rawCandidate;
  }

  const sample = random();
  const index =
    Number.isFinite(sample) && sample >= 0 && sample < 1
      ? Math.floor(sample * input.legalMoves.length)
      : 0;

  return {
    move: input.legalMoves[index]!,
    fallback: true,
    attempts: MAX_PROVIDER_ATTEMPTS,
  };
}
