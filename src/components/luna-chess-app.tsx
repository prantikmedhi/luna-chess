"use client";

import { useState } from "react";

import { GameScreen } from "@/components/game-screen";
import { ModeSelect } from "@/components/mode-select";
import type { GameConfig } from "@/lib/chess/types";

export function LunaChessApp() {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  return (
    <div className="min-h-[100dvh] bg-[#12151B]">
      {gameConfig ? (
        <GameScreen config={gameConfig} onNewGame={() => setGameConfig(null)} />
      ) : (
        <ModeSelect onStart={setGameConfig} />
      )}
    </div>
  );
}
