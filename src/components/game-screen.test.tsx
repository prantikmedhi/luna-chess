/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameScreen } from "./game-screen";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function playE4() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /^e2, white pawn/ }));
  await user.click(screen.getByRole("button", { name: /^e4, empty, legal destination/ }));
  return user;
}

describe("GameScreen", () => {
  it("lets the player mute and enable game sounds", async () => {
    const user = userEvent.setup();
    render(<GameScreen config={{ mode: "local" }} onNewGame={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Mute game sounds" }));
    expect(screen.getByRole("button", { name: "Enable game sounds" })).toBeTruthy();
  });

  it("plays a local move with sound and without issuing a request", async () => {
    const fetchMock = vi.fn();
    const oscillatorStart = vi.fn();
    class AudioContextStub {
      state = "running";
      currentTime = 0;
      destination = {};
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        };
      }
      createOscillator() {
        return {
          type: "sine",
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: oscillatorStart,
          stop: vi.fn(),
        };
      }
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    }
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("AudioContext", AudioContextStub);

    render(<GameScreen config={{ mode: "local" }} onNewGame={vi.fn()} />);
    await playE4();

    expect(screen.getByText("Black to move")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^e4, white pawn, last move/ })).toBeTruthy();
    expect(screen.getByText("e4")).toBeTruthy();
    expect(oscillatorStart).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the human move and exposes retry when Luna is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: "AI_UNAVAILABLE",
            message: "AI is temporarily unavailable. Please try again.",
          },
          { status: 503 },
        ),
      ),
    );

    render(
      <GameScreen
        config={{
          mode: "ai",
          difficulty: "medium",
          humanColor: "w",
          aiColor: "b",
        }}
        onNewGame={vi.fn()}
      />,
    );
    await playE4();

    expect(await screen.findByText("AI is temporarily unavailable. Try again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^e4, white pawn, last move/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^e2, empty, last move/ })).toBeTruthy();
  });

  it("opens a result dialog on checkmate", async () => {
    const user = userEvent.setup();
    render(<GameScreen config={{ mode: "local" }} onNewGame={vi.fn()} />);

    for (const [from, to] of [
      ["f2", "f3"],
      ["e7", "e5"],
      ["g2", "g4"],
      ["d8", "h4"],
    ]) {
      await user.click(screen.getByRole("button", { name: new RegExp(`^${from},`) }));
      await user.click(
        screen.getByRole("button", { name: new RegExp(`^${to},.*legal`) }),
      );
    }

    const dialog = await screen.findByRole("dialog", { name: "Checkmate" });
    expect(dialog.textContent).toContain("Black wins");
    expect(screen.getByRole("button", { name: "Play again" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review board" })).toBeTruthy();
  });

  it("ignores an AI response from before restart", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <GameScreen
        config={{
          mode: "ai",
          difficulty: "hard",
          humanColor: "w",
          aiColor: "b",
        }}
        onNewGame={vi.fn()}
      />,
    );
    const user = await playE4();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Black to move — Luna is thinking…")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Restart" }));

    await act(async () => {
      resolveFetch(Response.json({ move: "e7e5", fallback: false }));
      await Promise.resolve();
    });

    expect(screen.getByText("White to move")).toBeTruthy();
    expect(screen.getByText("Moves will appear here.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^e7, black pawn/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^e5, empty/ })).toBeTruthy();
  });
});
