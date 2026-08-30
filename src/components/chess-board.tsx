import { useRef, type KeyboardEvent } from "react";
import type { Chess, Color, Move, Square } from "chess.js";

import {
  boardSquares,
  isLightSquare,
  pieceGlyph,
  squareName,
} from "@/lib/chess/display";

type ChessBoardProps = {
  chess: Chess;
  orientation: Color;
  selectedSquare: Square | null;
  legalMoves: Move[];
  lastMove: Move | null;
  checkedKing: Square | null;
  disabled: boolean;
  onSquareSelect: (square: Square) => void;
};

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function ChessBoard({
  chess,
  orientation,
  selectedSquare,
  legalMoves,
  lastMove,
  checkedKing,
  disabled,
  onSquareSelect,
}: ChessBoardProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const squares = boardSquares(orientation);
  const legalBySquare = new Map(legalMoves.map((move) => [move.to, move]));

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offsets: Partial<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -8,
      ArrowDown: 8,
    };
    const offset = offsets[event.key];
    if (offset === undefined) return;

    event.preventDefault();
    const column = index % 8;
    if ((event.key === "ArrowLeft" && column === 0) || (event.key === "ArrowRight" && column === 7)) {
      return;
    }

    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= 64) return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-board-index="${nextIndex}"]`)
      ?.focus();
  };

  return (
    <div
      ref={gridRef}
      role="group"
      data-chess-board
      tabIndex={-1}
      aria-label={`Chess board, ${orientation === "w" ? "White" : "Black"} side`}
      aria-disabled={disabled}
      className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-md border border-white/15 bg-[#6C778C] shadow-[0_24px_70px_rgba(0,0,0,0.42)] ring-1 ring-black/30"
    >
      {squares.map((square, index) => {
        const piece = chess.get(square);
        const legalMove = legalBySquare.get(square);
        const lightSquare = isLightSquare(square);
        const isCapture = Boolean(legalMove?.captured);
        const isSelected = selectedSquare === square;
        const isLastMove = lastMove?.from === square || lastMove?.to === square;
        const isChecked = checkedKing === square;
        const useDarkCoordinates = lightSquare || isLastMove || isSelected || isChecked;
        const file = square[0];
        const rank = square[1];
        const showFile = Math.floor(index / 8) === 7;
        const showRank = index % 8 === 0;

        const stateDescription = [
          isSelected && "selected",
          legalMove && (isCapture ? "legal capture" : "legal destination"),
          isLastMove && "last move",
          isChecked && "in check",
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <button
            key={square}
            type="button"
            data-board-index={index}
            disabled={disabled}
            onClick={() => onSquareSelect(square)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            aria-label={`${squareName(square, piece)}${stateDescription ? `, ${stateDescription}` : ""}`}
            aria-pressed={isSelected}
            className={classNames(
              "relative flex aspect-square min-h-0 min-w-0 items-center justify-center p-0 text-[clamp(2rem,10vw,5.25rem)] leading-none transition-colors focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#12151B] disabled:cursor-default motion-reduce:transition-none",
              lightSquare ? "bg-[#D8CFBC]" : "bg-[#6C778C]",
              isLastMove && "bg-[#A7C6FF]",
              isSelected && "bg-[#F3C969]",
              isChecked && "bg-[#FF6B6B]",
            )}
          >
            {isLastMove && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 h-1.5 w-1.5 rotate-45 bg-[#315CA8]"
              />
            )}
            {isSelected && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 border-[3px] border-[#7A5511]"
              />
            )}
            {isChecked && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-1 rounded-sm border-[3px] border-[#8D1E26]"
              />
            )}
            {legalMove && !isCapture && (
              <span
                aria-hidden="true"
                className="absolute h-[24%] w-[24%] rounded-full bg-[#12151B]"
              />
            )}
            {legalMove && isCapture && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[8%] rounded-full border-[clamp(3px,0.7vw,6px)] border-[#12151B]"
              />
            )}
            {piece && (
              <span
                aria-hidden="true"
                className="relative z-10 grid h-[90%] w-[90%] select-none place-items-center drop-shadow-[0_2px_1px_rgba(0,0,0,0.35)] [&>img]:h-full [&>img]:w-full"
              >
                {pieceGlyph(piece)}
              </span>
            )}
            {showRank && (
              <span
                aria-hidden="true"
                className={classNames(
                  "absolute left-1 top-0.5 text-[clamp(0.5rem,1.3vw,0.7rem)] font-bold leading-none",
                  useDarkCoordinates ? "text-[#12151B]" : "text-white",
                )}
              >
                {rank}
              </span>
            )}
            {showFile && (
              <span
                aria-hidden="true"
                className={classNames(
                  "absolute bottom-0.5 right-1 text-[clamp(0.5rem,1.3vw,0.7rem)] font-bold leading-none",
                  useDarkCoordinates ? "text-[#12151B]" : "text-white",
                )}
              >
                {file}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
