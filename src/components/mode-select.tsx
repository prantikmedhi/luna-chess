import { useId, useState } from "react";
import type { Color } from "chess.js";

import type { Difficulty, GameConfig } from "@/lib/chess/types";

type ModeSelectProps = {
  onStart: (config: GameConfig) => void;
};

const difficultyCopy: Record<Difficulty, string> = {
  easy: "Relaxed choices with more variety.",
  medium: "Solid, sensible moves for a casual game.",
  hard: "More attention to threats and king safety.",
};

export function ModeSelect({ onStart }: ModeSelectProps) {
  const [showAiSetup, setShowAiSetup] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [humanColor, setHumanColor] = useState<Color>("w");
  const headingId = useId();

  const startAiGame = () => {
    onStart({
      mode: "ai",
      difficulty,
      humanColor,
      aiColor: humanColor === "w" ? "b" : "w",
    });
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col justify-center px-4 py-10 text-[#F7F8FC] sm:px-6">
      <div className="mb-8 text-center">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#8EA9FF]">
          Luna Chess
        </p>
        <h1
          id={headingId}
          className="font-serif text-4xl font-semibold tracking-[-0.03em] text-[#F5F1E8] sm:text-5xl"
        >
          Choose your game
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-[#AFB7C7]">
          A quiet board for a shared match or a game against Luna.
        </p>
      </div>

      <section aria-labelledby={headingId} className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col rounded-2xl border border-white/10 bg-[#1A1F29] p-6">
          <div className="mb-6 grow">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#AFB7C7]">
              No network needed
            </p>
            <h2 className="text-xl font-semibold text-[#F7F8FC]">Local 2 Player</h2>
            <p className="mt-2 leading-6 text-[#AFB7C7]">
              Take turns with another player on this device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onStart({ mode: "local" })}
            className="min-h-12 w-full rounded-[10px] bg-[#8EA9FF] px-4 py-3 font-semibold text-[#12151B] transition-colors hover:bg-[#F5F1E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F1E8] motion-reduce:transition-none"
          >
            Local 2 Player
          </button>
        </article>

        <article className="flex flex-col rounded-2xl border border-white/10 bg-[#1A1F29] p-6">
          <div className="mb-6 grow">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#AFB7C7]">
              One player
            </p>
            <h2 className="text-xl font-semibold text-[#F7F8FC]">Play vs AI</h2>
            <p className="mt-2 leading-6 text-[#AFB7C7]">
              Choose a side and a behavior preset, then play Luna.
            </p>
          </div>

          {!showAiSetup ? (
            <button
              type="button"
              onClick={() => setShowAiSetup(true)}
              aria-expanded="false"
              className="min-h-12 w-full rounded-[10px] bg-[#8EA9FF] px-4 py-3 font-semibold text-[#12151B] transition-colors hover:bg-[#F5F1E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F1E8] motion-reduce:transition-none"
            >
              Play vs AI
            </button>
          ) : (
            <div className="space-y-5">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-[#F7F8FC]">Difficulty</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((value) => (
                    <label key={value} className="relative">
                      <input
                        type="radio"
                        name="difficulty"
                        value={value}
                        checked={difficulty === value}
                        onChange={() => setDifficulty(value)}
                        className="peer sr-only"
                      />
                      <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-[#242B38] px-2 text-sm capitalize text-[#F7F8FC] peer-checked:border-[#8EA9FF] peer-checked:bg-[#8EA9FF] peer-checked:text-[#12151B] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#F5F1E8]">
                        {value}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 min-h-10 text-sm leading-5 text-[#AFB7C7]">
                  {difficultyCopy[difficulty]}
                </p>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-[#F7F8FC]">Play as</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["w", "b"] as const).map((color) => (
                    <label key={color} className="relative">
                      <input
                        type="radio"
                        name="side"
                        value={color}
                        checked={humanColor === color}
                        onChange={() => setHumanColor(color)}
                        className="peer sr-only"
                      />
                      <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-[#242B38] px-3 text-sm text-[#F7F8FC] peer-checked:border-[#8EA9FF] peer-checked:bg-[#8EA9FF] peer-checked:text-[#12151B] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#F5F1E8]">
                        {color === "w" ? "White" : "Black"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={startAiGame}
                className="min-h-12 w-full rounded-[10px] bg-[#8EA9FF] px-4 py-3 font-semibold text-[#12151B] transition-colors hover:bg-[#F5F1E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F1E8] motion-reduce:transition-none"
              >
                Start Game
              </button>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
