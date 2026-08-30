import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, type Color, type Move, type Square } from "chess.js";

import { ChessBoard } from "@/components/chess-board";
import { GameOverDialog } from "@/components/game-over-dialog";
import { GameSidebar } from "@/components/game-sidebar";
import { PromotionDialog } from "@/components/promotion-dialog";
import {
  capturedPieces,
  checkedKingSquare,
  parseCanonicalMove,
} from "@/lib/chess/display";
import { colorName, deriveGameStatus } from "@/lib/chess/status";
import { useChessSounds } from "@/hooks/use-chess-sounds";
import type {
  AiMoveResponse,
  GameConfig,
  PromotionChoice,
  PromotionRequest,
} from "@/lib/chess/types";

type GameScreenProps = {
  config: GameConfig;
  onNewGame: () => void;
};

const AI_ERROR_MESSAGE = "AI is temporarily unavailable. Try again.";

function isAiMoveResponse(value: unknown): value is AiMoveResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.move === "string" && typeof candidate.fallback === "boolean";
}

function requestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `luna-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function GameScreen({ config, onNewGame }: GameScreenProps) {
  const [chess] = useState(() => new Chess());
  const {
    enabled: soundEnabled,
    play: playSound,
    toggle: toggleSound,
    unlock: unlockSound,
  } = useChessSounds();
  const pendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const gameGenerationRef = useRef(0);

  const [positionRevision, setPositionRevision] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [promotionRequest, setPromotionRequest] = useState<PromotionRequest | null>(null);
  const [resignedColor, setResignedColor] = useState<Color | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const orientation = config.mode === "ai" ? config.humanColor : "w";

  const history = chess.history({ verbose: true });
  const lastMove = history.at(-1) ?? null;
  const captures = capturedPieces(history);
  const checkedKing = checkedKingSquare(chess);
  const status = deriveGameStatus(chess, resignedColor, isAiThinking);
  const humanCanMove = config.mode === "local" || chess.turn() === config.humanColor;
  const boardDisabled =
    status.terminal || isAiThinking || Boolean(promotionRequest) || !humanCanMove;
  const legalMoves: Move[] = selectedSquare
    ? chess.moves({ square: selectedSquare, verbose: true })
    : [];

  const cancelAiRequest = useCallback(() => {
    gameGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    activeRequestIdRef.current = null;
    pendingRef.current = false;
  }, []);

  const applyMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionChoice): boolean => {
      let move: Move;
      try {
        move = chess.move({ from, to, ...(promotion ? { promotion } : {}) });
      } catch {
        setSelectedSquare(null);
        setPromotionRequest(null);
        return false;
      }

      const gameEnded = chess.isGameOver();
      setSelectedSquare(null);
      setPromotionRequest(null);
      setAiError(null);
      setPositionRevision((revision) => revision + 1);
      if (gameEnded) setIsResultOpen(true);
      playSound(
        gameEnded ? "game-end" : chess.isCheck() ? "check" : move.captured ? "capture" : "move",
      );
      return true;
    },
    [chess, playSound],
  );

  const requestAiMove = useCallback(async () => {
    if (config.mode !== "ai" || resignedColor || pendingRef.current) return;

    const currentGame = chess;
    if (currentGame.isGameOver() || currentGame.turn() !== config.aiColor) return;

    const generation = gameGenerationRef.current;
    const fenAtDispatch = currentGame.fen();
    const id = requestId();
    const controller = new AbortController();

    // This ref is the synchronous lock. State alone would allow a second call
    // before React commits the pending render.
    pendingRef.current = true;
    activeRequestIdRef.current = id;
    abortRef.current = controller;
    setAiError(null);
    setIsAiThinking(true);

    try {
      const response = await fetch("/api/ai-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          requestId: id,
          fen: fenAtDispatch,
          difficulty: config.difficulty,
          aiColor: config.aiColor,
          recentMoves: currentGame.history().slice(-8),
        }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const payload: unknown = await response.json();
      if (!isAiMoveResponse(payload)) throw new Error("Invalid AI response");

      const isCurrentRequest =
        !controller.signal.aborted &&
        gameGenerationRef.current === generation &&
        activeRequestIdRef.current === id &&
        chess.fen() === fenAtDispatch;
      if (!isCurrentRequest) return;

      const move = parseCanonicalMove(payload.move);
      if (!move) throw new Error("Invalid AI move");

      try {
        chess.move(move);
      } catch {
        throw new Error("Illegal AI move");
      }

      setSelectedSquare(null);
      setPromotionRequest(null);
      setAiError(null);
      setPositionRevision((revision) => revision + 1);
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      const requestIsStillCurrent =
        gameGenerationRef.current === generation &&
        activeRequestIdRef.current === id &&
        chess.fen() === fenAtDispatch;

      if (!isAbort && requestIsStillCurrent) setAiError(AI_ERROR_MESSAGE);
    } finally {
      if (
        gameGenerationRef.current === generation &&
        activeRequestIdRef.current === id
      ) {
        pendingRef.current = false;
        activeRequestIdRef.current = null;
        abortRef.current = null;
        setIsAiThinking(false);
      }
    }
  }, [chess, config, resignedColor]);

  useEffect(() => {
    if (
      config.mode !== "ai" ||
      status.terminal ||
      aiError ||
      chess.turn() !== config.aiColor
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void requestAiMove();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [aiError, chess, config, positionRevision, requestAiMove, status.terminal]);

  useEffect(() => {
    return () => {
      gameGenerationRef.current += 1;
      abortRef.current?.abort();
      pendingRef.current = false;
    };
  }, []);

  const handleSquareSelect = (square: Square) => {
    if (boardDisabled || pendingRef.current) return;

    const piece = chess.get(square);

    if (!selectedSquare) {
      if (piece?.color === chess.turn()) setSelectedSquare(square);
      return;
    }

    const destinationMoves = legalMoves.filter((move) => move.to === square);
    if (destinationMoves.length > 0) {
      const promotionMove = destinationMoves.find((move) => Boolean(move.promotion));
      if (promotionMove) {
        const movingPiece = chess.get(selectedSquare);
        if (movingPiece) {
          setPromotionRequest({ from: selectedSquare, to: square, color: movingPiece.color });
        }
        return;
      }

      applyMove(selectedSquare, square);
      return;
    }

    if (piece?.color === chess.turn()) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePromotion = (piece: PromotionChoice) => {
    if (!promotionRequest) return;
    applyMove(promotionRequest.from, promotionRequest.to, piece);
  };

  const handleResign = () => {
    if (status.terminal || isAiThinking || pendingRef.current) return;
    const color = config.mode === "ai" ? config.humanColor : chess.turn();
    setSelectedSquare(null);
    setPromotionRequest(null);
    setAiError(null);
    setResignedColor(color);
    setIsResultOpen(true);
    playSound("game-end");
  };

  const handleRestart = () => {
    cancelAiRequest();
    chess.reset();
    setSelectedSquare(null);
    setPromotionRequest(null);
    setResignedColor(null);
    setAiError(null);
    setIsAiThinking(false);
    setIsResultOpen(false);
    setPositionRevision((revision) => revision + 1);
  };

  const handleNewGame = () => {
    cancelAiRequest();
    setIsAiThinking(false);
    setIsResultOpen(false);
    onNewGame();
  };

  const handleRetry = () => {
    if (pendingRef.current || config.mode !== "ai") return;
    void requestAiMove();
  };

  return (
    <main
      onPointerDownCapture={unlockSound}
      className="mx-auto min-h-[100dvh] w-full max-w-[1480px] overflow-x-hidden px-2 py-3 text-[#F7F8FC] sm:px-4 lg:px-6 lg:py-5"
    >
      <header className="mb-3 flex min-w-0 items-center justify-between gap-3 lg:mb-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8EA9FF]">
            Luna Chess
          </p>
          <h1 className="mt-1 truncate font-serif text-2xl font-semibold text-[#F5F1E8] lg:text-3xl">
            {config.mode === "local" ? "Local 2 Player" : "Play vs Luna"}
          </h1>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!soundEnabled}
          aria-label={soundEnabled ? "Mute game sounds" : "Enable game sounds"}
          className="min-h-11 shrink-0 rounded-[10px] border border-white/10 bg-[#1A1F29] px-3 text-sm font-semibold text-[#F7F8FC] transition-colors hover:bg-[#242B38] active:translate-y-px motion-reduce:transition-none"
        >
          {soundEnabled ? "Sound on" : "Sound off"}
        </button>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-3 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`min-w-0 rounded-[10px] border p-4 lg:col-start-2 lg:row-start-1 ${
            status.terminal || status.kind === "check"
              ? "border-[#FF6B6B]/60 bg-[#FF6B6B]/10"
              : "border-white/10 bg-[#1A1F29]"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`h-3 w-3 shrink-0 rounded-full border ${
                chess.turn() === "w"
                  ? "border-[#AFB7C7] bg-[#F5F1E8]"
                  : "border-[#AFB7C7] bg-[#12151B]"
              }`}
            />
            <div className="min-w-0">
              {status.terminal && (
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#FF9B9B]">
                  Game over
                </p>
              )}
              <p className="font-semibold text-[#F7F8FC]">{status.text}</p>
            </div>
            {isAiThinking && (
              <span
                aria-hidden="true"
                className="ml-auto h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#8EA9FF]/30 border-t-[#8EA9FF] motion-reduce:animate-none"
              />
            )}
          </div>
        </section>

        <section
          aria-label="Chess board area"
          className="-mx-2 w-[calc(100%+1rem)] min-w-0 sm:mx-auto sm:w-full lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-[min(90dvh,900px)]"
        >
          <ChessBoard
            chess={chess}
            orientation={orientation}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            lastMove={lastMove}
            checkedKing={checkedKing}
            disabled={boardDisabled}
            onSquareSelect={handleSquareSelect}
          />
          <p className="mt-2 text-center text-xs text-[#AFB7C7]">
            {colorName(orientation)} at the bottom · Select a piece, then a marked square
          </p>
        </section>

        <div className="min-w-0 lg:sticky lg:top-5 lg:col-start-2 lg:row-start-2">
          <GameSidebar
            history={history}
            captures={captures}
            status={status}
            canResign={!status.terminal && !isAiThinking}
            aiError={aiError}
            onRetry={handleRetry}
            onResign={handleResign}
            onRestart={handleRestart}
            onNewGame={handleNewGame}
          />
        </div>
      </div>

      {promotionRequest && (
        <PromotionDialog
          request={promotionRequest}
          onChoose={handlePromotion}
          onCancel={() => setPromotionRequest(null)}
        />
      )}

      {isResultOpen && status.terminal && (
        <GameOverDialog
          status={status}
          onReview={() => setIsResultOpen(false)}
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}
    </main>
  );
}
