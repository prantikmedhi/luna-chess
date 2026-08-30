import type { Chess, Color } from "chess.js";

import type { GameStatus } from "./types";

export function colorName(color: Color): "White" | "Black" {
  return color === "w" ? "White" : "Black";
}

export function oppositeColor(color: Color): Color {
  return color === "w" ? "b" : "w";
}

export function deriveGameStatus(
  chess: Chess,
  resignedColor: Color | null,
  isAiThinking: boolean,
): GameStatus {
  if (resignedColor) {
    const winner = oppositeColor(resignedColor);
    return {
      kind: "resignation",
      text: `${colorName(resignedColor)} resigned — ${colorName(winner)} wins`,
      terminal: true,
      winner,
    };
  }

  if (chess.isCheckmate()) {
    const winner = oppositeColor(chess.turn());
    return {
      kind: "checkmate",
      text: `Checkmate — ${colorName(winner)} wins`,
      terminal: true,
      winner,
    };
  }

  if (chess.isStalemate()) {
    return { kind: "stalemate", text: "Draw — stalemate", terminal: true };
  }

  if (chess.isInsufficientMaterial()) {
    return {
      kind: "insufficient-material",
      text: "Draw — insufficient material",
      terminal: true,
    };
  }

  if (chess.isThreefoldRepetition()) {
    return { kind: "repetition", text: "Draw — repetition", terminal: true };
  }

  if (chess.isDrawByFiftyMoves()) {
    return {
      kind: "fifty-move",
      text: "Draw — fifty-move rule",
      terminal: true,
    };
  }

  const sideToMove = colorName(chess.turn());

  if (isAiThinking) {
    return {
      kind: chess.isCheck() ? "check" : "active",
      text: `${sideToMove} to move — Luna is thinking…`,
      terminal: false,
    };
  }

  if (chess.isCheck()) {
    return {
      kind: "check",
      text: `${sideToMove} is in check`,
      terminal: false,
    };
  }

  return { kind: "active", text: `${sideToMove} to move`, terminal: false };
}
