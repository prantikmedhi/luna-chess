import { useEffect, useId, useRef, type KeyboardEvent } from "react";

import type { GameStatus } from "@/lib/chess/types";

type GameOverDialogProps = {
  status: GameStatus;
  onReview: () => void;
  onRestart: () => void;
  onNewGame: () => void;
};

export function GameOverDialog({
  status,
  onReview,
  onRestart,
  onNewGame,
}: GameOverDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const title =
    status.kind === "checkmate"
      ? "Checkmate"
      : status.kind === "resignation"
        ? "Game over"
        : "Draw";

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onReview();
      return;
    }
    if (event.key !== "Tab") return;

    const buttons = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#080A0E]/80 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#1A1F29] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8EA9FF]">
          Final position
        </p>
        <h2 id={titleId} className="mt-2 font-serif text-4xl font-semibold text-[#F5F1E8]">
          {title}
        </h2>
        <p id={descriptionId} className="mt-3 text-base text-[#D7DCE6]">
          {status.text}
        </p>
        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="min-h-12 rounded-[10px] bg-[#F5F1E8] px-4 font-bold text-[#12151B] transition-transform active:translate-y-px motion-reduce:transition-none"
          >
            Play again
          </button>
          <button
            type="button"
            onClick={onReview}
            className="min-h-11 rounded-[10px] border border-white/15 bg-[#242B38] px-4 font-semibold text-[#F7F8FC] transition-colors hover:bg-[#30394A] motion-reduce:transition-none"
          >
            Review board
          </button>
          <button
            type="button"
            onClick={onNewGame}
            className="min-h-11 rounded-[10px] px-4 font-semibold text-[#AFB7C7] transition-colors hover:bg-white/5 hover:text-[#F7F8FC] motion-reduce:transition-none"
          >
            Change mode
          </button>
        </div>
      </div>
    </div>
  );
}
