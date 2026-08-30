import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import {
  boardSquares,
  capturedPieces,
  parseCanonicalMove,
} from "./display";
import { deriveGameStatus } from "./status";

describe("chess display helpers", () => {
  it("orients board toward selected player", () => {
    expect(boardSquares("w").slice(0, 2)).toEqual(["a8", "b8"]);
    expect(boardSquares("b").slice(0, 2)).toEqual(["h1", "g1"]);
  });

  it("parses only canonical coordinate moves", () => {
    expect(parseCanonicalMove("e2e4")).toEqual({ from: "e2", to: "e4" });
    expect(parseCanonicalMove("e7e8n")).toEqual({
      from: "e7",
      to: "e8",
      promotion: "n",
    });
    expect(parseCanonicalMove("e2-e4")).toBeNull();
    expect(parseCanonicalMove("e7e8k")).toBeNull();
  });

  it("derives captures from chess.js history", () => {
    const chess = new Chess();
    chess.move("e4");
    chess.move("d5");
    chess.move("exd5");

    expect(capturedPieces(chess.history({ verbose: true }))).toEqual({
      w: ["p"],
      b: [],
    });
  });
});

describe("game status", () => {
  it("reports checkmate and winner", () => {
    const chess = new Chess();
    for (const move of ["f3", "e5", "g4", "Qh4#"]) chess.move(move);

    expect(deriveGameStatus(chess, null, false)).toMatchObject({
      kind: "checkmate",
      terminal: true,
      winner: "b",
    });
  });

  it("distinguishes stalemate and insufficient material", () => {
    expect(
      deriveGameStatus(
        new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"),
        null,
        false,
      ).kind,
    ).toBe("stalemate");
    expect(
      deriveGameStatus(
        new Chess("8/8/8/8/8/8/7k/K7 w - - 0 1"),
        null,
        false,
      ).kind,
    ).toBe("insufficient-material");
  });

  it("distinguishes repetition and fifty-move draws", () => {
    const repetition = new Chess();
    for (const move of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) {
      repetition.move(move);
    }

    expect(deriveGameStatus(repetition, null, false).kind).toBe("repetition");
    expect(
      deriveGameStatus(
        new Chess("8/8/8/8/8/8/R6k/K7 w - - 100 51"),
        null,
        false,
      ).kind,
    ).toBe("fifty-move");
  });

  it("reports resignation before board-derived results", () => {
    expect(deriveGameStatus(new Chess(), "w", false)).toMatchObject({
      kind: "resignation",
      terminal: true,
      winner: "b",
    });
  });
});

describe("special move authority", () => {
  it("uses chess.js for castling, en passant, and every promotion choice", () => {
    const castle = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    expect(castle.move({ from: "e1", to: "g1" }).san).toBe("O-O");

    const enPassant = new Chess();
    for (const move of ["e4", "a6", "e5", "d5"]) enPassant.move(move);
    expect(enPassant.move({ from: "e5", to: "d6" }).isEnPassant()).toBe(true);

    for (const choice of ["q", "r", "b", "n"] as const) {
      const promotion = new Chess("7k/P7/8/8/8/8/8/7K w - - 0 1");
      expect(promotion.move({ from: "a7", to: "a8", promotion: choice }).promotion).toBe(
        choice,
      );
      expect(promotion.get("a8")?.type).toBe(choice);
    }
  });

  it("uses chess.js to reject castling through check and expired en passant", () => {
    const throughCheck = new Chess("r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1");
    expect(() => throughCheck.move({ from: "e1", to: "g1" })).toThrow();

    const lostRights = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    for (const move of ["Ke2", "Ra7", "Ke1", "Ra8"]) lostRights.move(move);
    expect(() => lostRights.move({ from: "e1", to: "g1" })).toThrow();

    const expiredEnPassant = new Chess();
    for (const move of ["e4", "a6", "e5", "d5", "Nf3", "Nf6"]) {
      expiredEnPassant.move(move);
    }
    expect(() => expiredEnPassant.move({ from: "e5", to: "d6" })).toThrow();
  });
});
