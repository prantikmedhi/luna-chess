import { Chess } from "chess.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const validRequest = {
  requestId: "route-test-request",
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  difficulty: "medium",
  aiColor: "w",
  recentMoves: [],
};

function request(body: unknown = validRequest): Request {
  return new Request("http://localhost/api/ai-move", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function azureResponse(candidate: string): Response {
  return Response.json({
    choices: [{ message: { content: candidate } }],
  });
}

describe("POST /api/ai-move", () => {
  beforeEach(() => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "test-key");
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://azure.example.test");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "2024-10-21");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "test-deployment");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns an exact legal provider move", async () => {
    const provider = vi
      .fn()
      .mockResolvedValue(azureResponse('{"move":"e2e4"}'));
    vi.stubGlobal("fetch", provider);

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      move: "e2e4",
      fallback: false,
    });
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("rejects incomplete FEN before calling Azure", async () => {
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);

    const response = await POST(
      request({
        ...validRequest,
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w",
      }),
    );

    expect(response.status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "terminal position",
      body: {
        ...validRequest,
        fen: "7k/6Q1/6K1/8/8/8/8/8 b - - 0 1",
        aiColor: "b",
      },
    },
    {
      name: "turn mismatch",
      body: { ...validRequest, aiColor: "b" },
    },
  ])("rejects $name before calling Azure", async ({ body }) => {
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);

    const response = await POST(request(body));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "MOVE_NOT_ALLOWED",
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("uses a legal fallback only after three invalid candidates", async () => {
    const provider = vi
      .fn()
      .mockImplementation(() => Promise.resolve(azureResponse("   ")));
    vi.stubGlobal("fetch", provider);

    const response = await POST(request());
    const body = (await response.json()) as { move: string; fallback: boolean };
    const legalMoves = new Set(
      new Chess(validRequest.fen)
        .moves({ verbose: true })
        .map((move) => `${move.from}${move.to}${move.promotion ?? ""}`),
    );

    expect(response.status).toBe(200);
    expect(body.fallback).toBe(true);
    expect(legalMoves.has(body.move)).toBe(true);
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it("maps provider failures to a sanitized 503 without fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("secret upstream diagnostics", { status: 500 }),
      ),
    );

    const response = await POST(request());
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(text)).toEqual({
      error: "AI_UNAVAILABLE",
      message: "AI is temporarily unavailable. Please try again.",
    });
    expect(text).not.toContain("secret upstream diagnostics");
    expect(text).not.toContain("test-key");
  });

  it("uses the stable API version when none is configured", async () => {
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "");
    const provider = vi
      .fn()
      .mockResolvedValue(azureResponse('{"move":"e2e4"}'));
    vi.stubGlobal("fetch", provider);

    expect((await POST(request())).status).toBe(200);
    expect(String(provider.mock.calls[0]?.[0])).toContain("api-version=2024-10-21");
  });

  it("supports Azure v1 endpoints without an API version", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://azure.example.test/openai/v1/");
    vi.stubEnv("AZURE_OPENAI_API_VERSION", "");
    const provider = vi
      .fn()
      .mockResolvedValue(azureResponse('{"move":"e2e4"}'));
    vi.stubGlobal("fetch", provider);

    expect((await POST(request())).status).toBe(200);
    const [url, init] = provider.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe("/openai/v1/chat/completions");
    expect(url.search).toBe("");
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "test-deployment" });
  });

  it("returns 503 without a provider call when configuration is missing", async () => {
    vi.stubEnv("AZURE_OPENAI_API_KEY", "");
    const provider = vi.fn();
    vi.stubGlobal("fetch", provider);

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "AI_UNAVAILABLE",
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it("rejects a duplicate request while the first is in flight", async () => {
    let resolveProvider!: (response: Response) => void;
    const providerResponse = new Promise<Response>((resolve) => {
      resolveProvider = resolve;
    });
    const provider = vi.fn().mockReturnValue(providerResponse);
    vi.stubGlobal("fetch", provider);

    const firstResponsePromise = POST(request());
    await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(1));

    const duplicateResponse = await POST(request());
    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      error: "REQUEST_IN_PROGRESS",
    });

    resolveProvider(azureResponse('{"move":"e2e4"}'));
    expect((await firstResponsePromise).status).toBe(200);

    provider.mockResolvedValue(azureResponse('{"move":"e2e4"}'));
    expect((await POST(request())).status).toBe(200);
  });
});
