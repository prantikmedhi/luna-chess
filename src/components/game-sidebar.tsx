import type { Color, Move, PieceSymbol } from "chess.js";

import { capturedPiecesLabel, pieceGlyph } from "@/lib/chess/display";
import type { GameStatus } from "@/lib/chess/types";

type GameSidebarProps = {
  history: Move[];
  captures: Record<Color, PieceSymbol[]>;
  status: GameStatus;
  canResign: boolean;
  aiError: string | null;
  onRetry: () => void;
  onResign: () => void;
  onRestart: () => void;
  onNewGame: () => void;
};

export function GameSidebar({
  history,
  captures,
  status,
  canResign,
  aiError,
  onRetry,
  onResign,
  onRestart,
  onNewGame,
}: GameSidebarProps) {
  const rows = Array.from({ length: Math.ceil(history.length / 2) }, (_, index) => ({
    number: index + 1,
    white: history[index * 2],
    black: history[index * 2 + 1],
  }));
  const lastMoveIndex = history.length - 1;

  return (
    <aside className="flex min-w-0 flex-col gap-4" aria-label="Game details">
      {aiError && (
        <section
          role="alert"
          className="rounded-[10px] border border-[#FF6B6B]/50 bg-[#FF6B6B]/10 p-4"
        >
          <h2 className="font-semibold text-[#F7F8FC]">Luna could not move</h2>
          <p className="mt-1 text-sm leading-6 text-[#F7F8FC]">{aiError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-11 rounded-[10px] bg-[#FF6B6B] px-4 py-2 font-semibold text-[#12151B] transition-colors hover:bg-[#F5F1E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F1E8] motion-reduce:transition-none"
          >
            Retry
          </button>
        </section>
      )}

      <section aria-label="Game controls" className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onResign}
          disabled={!canResign}
          className="min-h-11 rounded-[10px] bg-[#242B38] px-2 py-2 text-sm font-medium text-[#F7F8FC] transition-colors hover:bg-[#30394A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8EA9FF] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
        >
          Resign
        </button>
        <button
          type="button"
          onClick={onRestart}
          className={`min-h-11 rounded-[10px] px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F1E8] motion-reduce:transition-none ${
            status.terminal
              ? "bg-[#8EA9FF] text-[#12151B] hover:bg-[#F5F1E8]"
              : "bg-[#242B38] text-[#F7F8FC] hover:bg-[#30394A]"
          }`}
        >
          Restart
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className="min-h-11 rounded-[10px] bg-[#242B38] px-2 py-2 text-sm font-medium text-[#F7F8FC] transition-colors hover:bg-[#30394A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8EA9FF] motion-reduce:transition-none"
        >
          New Game
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#1A1F29] p-4">
        <h2 className="text-sm font-semibold text-[#F7F8FC]">Captured pieces</h2>
        <div className="mt-3 space-y-3">
          {(["w", "b"] as const).map((capturer) => {
            const capturedColor: Color = capturer === "w" ? "b" : "w";
            const pieces = captures[capturer];
            return (
              <div key={capturer}>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#AFB7C7]">
                  {capturer === "w" ? "White" : "Black"} captured
                </p>
                <span className="sr-only">{capturedPiecesLabel(capturer, pieces)}</span>
                <div
                  aria-hidden="true"
                  className="mt-1 flex min-h-8 flex-wrap items-center gap-1 text-2xl text-[#F5F1E8]"
                >
                  {pieces.length > 0 ? (
                    pieces.map((piece, index) => (
                      <span
                        key={`${piece}-${index}`}
                        aria-hidden="true"
                        className="inline-block h-7 w-7"
                      >
                        {pieceGlyph({ color: capturedColor, type: piece })}
                      </span>
                    ))
                  ) : (
                    <span aria-hidden="true" className="text-sm text-[#AFB7C7]">
                      None
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="min-h-0 rounded-2xl border border-white/10 bg-[#1A1F29] p-4">
        <h2 className="text-sm font-semibold text-[#F7F8FC]">Move history</h2>
        <div
          className="mt-3 max-h-52 overflow-y-auto overscroll-contain pr-1 font-mono text-sm"
          aria-label="Move history in standard algebraic notation"
          tabIndex={rows.length > 0 ? 0 : undefined}
        >
          {rows.length === 0 ? (
            <p className="font-sans text-sm text-[#AFB7C7]">Moves will appear here.</p>
          ) : (
            <ol className="space-y-1">
              {rows.map((row) => (
                <li
                  key={row.number}
                  className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)] gap-2"
                >
                  <span className="py-1 text-right text-[#AFB7C7]">{row.number}.</span>
                  <span
                    className={`truncate rounded px-2 py-1 ${
                      (row.number - 1) * 2 === lastMoveIndex
                        ? "bg-[#A7C6FF] text-[#12151B]"
                        : "text-[#F7F8FC]"
                    }`}
                  >
                    {row.white?.san ?? ""}
                  </span>
                  <span
                    className={`truncate rounded px-2 py-1 ${
                      (row.number - 1) * 2 + 1 === lastMoveIndex
                        ? "bg-[#A7C6FF] text-[#12151B]"
                        : "text-[#F7F8FC]"
                    }`}
                  >
                    {row.black?.san ?? ""}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </aside>
  );
}
