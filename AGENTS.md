# AGENTS.md — Luna Chess Repository Contract

## Mission

Build the smallest production-quality application that satisfies [PRD.md](PRD.md). Correct chess behavior, complete local play, secure AI integration, and a passing build outrank optional polish.

Read these before implementation:

1. [PRD.md](PRD.md)
2. [ARCHITECTURE.md](ARCHITECTURE.md)
3. [DESIGN.md](DESIGN.md)
4. [API.md](API.md)
5. [TESTING.md](TESTING.md)

When documents conflict, use this precedence:

1. Security and legality invariants
2. PRD acceptance criteria
3. Architecture contracts
4. Design system
5. Roadmap suggestions

## Hard constraints

- Next.js App Router, React, TypeScript
- `chess.js` for all legal moves and terminal-state decisions
- Tailwind CSS, used consistently
- No database, auth, Docker, Stockfish, or third-party chess service
- Azure calls occur only in a server route
- Deployment name comes from `AZURE_OPENAI_DEPLOYMENT`
- Local two-player mode makes zero network requests during play
- Build for Vercel with no additional infrastructure

## Build order

Do not begin a lower item until the current item is functional:

1. Chess state and legal move application
2. Local two-player game from setup through terminal state
3. Luna request/response cycle
4. Server-side move validation, retries, and fallback
5. Turn/status/history/captures/game-over UX
6. Responsive and accessibility behavior
7. Small visual polish

## Engineering rules

- Inspect the installed Next.js documentation under `node_modules/next/dist/docs/` before relying on remembered framework APIs.
- Prefer the native platform and already-installed dependencies.
- Keep client rules state, AI transport, server Azure adapter, and visual components separate.
- Do not add an abstraction for a single use.
- Avoid `any`; validate untrusted values before narrowing them.
- Derive history, captures, turn, last move, and terminal state from `chess.js`.
- Do not duplicate chess logic in React state.
- Do not write custom movement or check-detection logic.
- No placeholder controls, fake loading, dead code, or speculative framework layers.
- Keep files reasonably cohesive; split when concerns genuinely differ, not to satisfy arbitrary line counts.

## Chess correctness rules

- Every human and AI move is applied through `chess.move`.
- Use verbose legal moves for board indicators and canonical UCI-like strings at the API boundary.
- Promotion is not committed until the player chooses `q`, `r`, `b`, or `n`.
- Interaction is locked after resignation, terminal state, or while Luna is pending.
- A stale AI response must not mutate a changed/reset game.
- Test castling through check, en passant timing, underpromotion, repetition, and insufficient material explicitly.

## AI route rules

- Validate body type, size, string lengths, enums, FEN, game status, and side to move.
- Generate the legal move list server-side for the submitted FEN.
- Treat all Azure output as untrusted.
- Parse strict JSON defensively, validate against the exact legal list, retry at most twice, then use one move from that list as fallback.
- Apply a 20-second timeout.
- Use a process-local request lock only; document its non-distributed ceiling.
- Return sanitized public errors. Never leak stack traces, keys, endpoint details, or raw upstream responses.
- Log only request metadata useful for debugging.

## UX rules

- The initial screen has two primary choices: **Play vs AI** and **Local 2 Player**.
- The board is the visual focus.
- Always show turn/status, move history, captures, and essential controls.
- Legal destinations, captures, selection, last move, and check need distinct treatments.
- AI lock state is explicit and announced accessibly.
- Mobile works at 320px without horizontal overflow.
- Respect reduced motion and visible keyboard focus.
- Follow [DESIGN.md](DESIGN.md); avoid generic AI-dashboard styling.

## Environment contract

Create and maintain `.env.example` with empty values only:

```env
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_DEPLOYMENT=
```

Never commit `.env.local`, credentials, real endpoints, or model deployment values.

## Required verification

Before declaring work complete:

```bash
npm run lint
npm test        # if a test script exists
npm run build
```

Also perform the manual matrix in [TESTING.md](TESTING.md). A plan, partial scaffold, or plausible code review is not completion; the app must actually run and build.

## Change discipline

- Keep commits focused.
- Update documentation when an external contract changes.
- Do not expand scope while any release criterion is failing.
- If time runs short, remove polish; never remove server validation, legal move handling, error containment, or accessibility basics.
