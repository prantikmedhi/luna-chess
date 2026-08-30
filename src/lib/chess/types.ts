import type { Color, PieceSymbol, Square } from "chess.js";

export type GameMode = "local" | "ai";
export type Difficulty = "easy" | "medium" | "hard";

export type GameConfig =
  | { mode: "local" }
  | {
      mode: "ai";
      difficulty: Difficulty;
      humanColor: Color;
      aiColor: Color;
    };

export type PromotionChoice = Extract<PieceSymbol, "q" | "r" | "b" | "n">;

export type PromotionRequest = {
  from: Square;
  to: Square;
  color: Color;
};

export type GameStatusKind =
  | "active"
  | "check"
  | "checkmate"
  | "stalemate"
  | "insufficient-material"
  | "repetition"
  | "fifty-move"
  | "resignation";

export type GameStatus = {
  kind: GameStatusKind;
  text: string;
  terminal: boolean;
  winner?: Color;
};

export type AiMoveResponse = {
  move: string;
  fallback: boolean;
};
