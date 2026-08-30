import { describe, expect, it, vi } from "vitest";

import {
  AzureUnavailableError,
  selectLegalMoveFromProvider,
  type AzureMoveInput,
} from "./azure";

const input = {
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  sideToMove: "w",
  difficulty: "medium",
  legalMoves: ["e2e4", "g1f3"],
  recentMoves: [],
} satisfies AzureMoveInput;

describe("selectLegalMoveFromProvider", () => {
  it("returns a legal candidate without fallback", async () => {
    const provider = vi.fn().mockResolvedValue('{"move":"e2e4"}');

    await expect(
      selectLegalMoveFromProvider(input, provider),
    ).resolves.toEqual({ move: "e2e4", fallback: false, attempts: 1 });
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("uses a corrective retry after an invalid candidate", async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce('{"move":"a2a4"}')
      .mockResolvedValueOnce('{"move":"g1f3"}');

    await expect(
      selectLegalMoveFromProvider(input, provider),
    ).resolves.toEqual({ move: "g1f3", fallback: false, attempts: 2 });
    expect(provider.mock.calls[1]?.[1]).toBe('{"move":"a2a4"}');
  });

  it("falls back only after three invalid candidate outputs", async () => {
    const provider = vi.fn().mockResolvedValue("not-json");

    await expect(
      selectLegalMoveFromProvider(input, provider, () => 0.999),
    ).resolves.toEqual({ move: "g1f3", fallback: true, attempts: 3 });
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it("does not convert a provider failure into a random move", async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce("not-json")
      .mockRejectedValueOnce(new AzureUnavailableError(2));

    await expect(
      selectLegalMoveFromProvider(input, provider),
    ).rejects.toBeInstanceOf(AzureUnavailableError);
    expect(provider).toHaveBeenCalledTimes(2);
  });
});
