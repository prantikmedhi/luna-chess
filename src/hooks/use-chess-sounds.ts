"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ChessSound = "move" | "capture" | "check" | "game-end";

type AudioContextConstructor = new () => AudioContext;
type AudioWindow = Window & { webkitAudioContext?: AudioContextConstructor };

const SOUND_NOTES: Record<ChessSound, Array<[number, number, number, OscillatorType]>> = {
  move: [[210, 0, 0.09, "triangle"]],
  capture: [
    [185, 0, 0.09, "square"],
    [110, 0.055, 0.14, "triangle"],
  ],
  check: [
    [392, 0, 0.1, "triangle"],
    [523, 0.09, 0.15, "triangle"],
  ],
  "game-end": [
    [392, 0, 0.12, "triangle"],
    [311, 0.12, 0.15, "triangle"],
    [196, 0.27, 0.24, "sine"],
  ],
};

export function useChessSounds() {
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const Context = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Context) return null;
    contextRef.current ??= new Context();
    return contextRef.current;
  }, []);

  const unlock = useCallback(() => {
    const context = getContext();
    if (context?.state === "suspended") void context.resume();
  }, [getContext]);

  useEffect(
    () => () => {
      void contextRef.current?.close();
    },
    [],
  );

  const play = useCallback(
    (sound: ChessSound) => {
      if (!enabled) return;
      const context = getContext();
      if (!context) return;

      const soundNow = () => {
        const master = context.createGain();
        const start = context.currentTime;
        const notes = SOUND_NOTES[sound];
        const end = Math.max(...notes.map(([, delay, duration]) => delay + duration));

        master.gain.setValueAtTime(0.0001, start);
        master.gain.exponentialRampToValueAtTime(0.18, start + 0.006);
        master.gain.exponentialRampToValueAtTime(0.0001, start + end + 0.04);
        master.connect(context.destination);

        for (const [frequency, delay, duration, type] of notes) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const noteStart = start + delay;
          oscillator.type = type;
          oscillator.frequency.setValueAtTime(frequency, noteStart);
          oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(70, frequency * 0.72),
            noteStart + duration,
          );
          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.8, noteStart + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
          oscillator.connect(gain);
          gain.connect(master);
          oscillator.start(noteStart);
          oscillator.stop(noteStart + duration + 0.01);
        }
      };

      if (context.state === "suspended") {
        void context.resume().then(soundNow).catch(() => undefined);
      } else {
        soundNow();
      }
    },
    [enabled, getContext],
  );

  return { enabled, play, toggle: () => setEnabled((current) => !current), unlock };
}
