import { useEffect, useId, useRef, type KeyboardEvent } from "react";

import { pieceGlyph, pieceName } from "@/lib/chess/display";
import type { PromotionChoice, PromotionRequest } from "@/lib/chess/types";

type PromotionDialogProps = {
  request: PromotionRequest;
  onChoose: (piece: PromotionChoice) => void;
  onCancel: () => void;
};

const choices: PromotionChoice[] = ["q", "r", "b", "n"];

export function PromotionDialog({ request, onChoose, onCancel }: PromotionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();

    return () => {
      const canRestorePreviousFocus =
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused !== document.body &&
        previouslyFocused.isConnected &&
        !previouslyFocused.matches(":disabled");

      if (canRestorePreviousFocus) {
        previouslyFocused.focus();
      } else {
        document.querySelector<HTMLElement>("[data-chess-board]")?.focus();
      }
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;

    const buttons = [...dialogRef.current.querySelectorAll<HTMLButtonElement>("button")];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12151B]/85 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1F29] p-6 text-[#F7F8FC] shadow-2xl"
      >
        <h2 id={titleId} className="text-xl font-semibold">
          Choose a promotion piece
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#AFB7C7]">
          The pawn move from {request.from} to {request.to} is not made until you choose.
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => onChoose(choice)}
              aria-label={`Promote to ${pieceName(choice)}`}
              className="flex aspect-square min-h-14 items-center justify-center rounded-[10px] border border-white/10 bg-[#242B38] text-4xl text-[#F5F1E8] transition-colors hover:border-[#8EA9FF] hover:bg-[#30394A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8EA9FF] motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="block h-12 w-12">
                {pieceGlyph({ color: request.color, type: choice })}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-5 min-h-11 w-full rounded-[10px] bg-[#242B38] px-4 py-2 font-medium text-[#F7F8FC] transition-colors hover:bg-[#30394A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8EA9FF] motion-reduce:transition-none"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
