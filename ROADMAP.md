# Roadmap — Luna Chess

## Two-hour implementation plan

### 0:00–0:15 — Foundation

- Scaffold current Next.js App Router with TypeScript and Tailwind.
- Add `chess.js` and the smallest test runner needed.
- Add `.env.example` and baseline layout/styles.
- Confirm local dev page renders.

**Checkpoint:** buildable skeleton with no secret exposure.

### 0:15–0:50 — Rules and local play

- Implement game controller around `chess.js`.
- Build board rendering, selection, and legal destinations.
- Add last move, check, promotion dialog, history, and captured pieces.
- Add terminal states, resignation, restart, and new game.
- Verify castling, en passant, promotion, mate, and draws.

**Checkpoint:** local two-player works end-to-end with zero gameplay requests.

### 0:50–1:20 — Luna integration

- Add AI setup: difficulty and side.
- Implement client request lock, thinking state, retry, abort, and stale-FEN guard.
- Implement `POST /api/ai-move` validation and server legal-move generation.
- Add Azure adapter with compact prompt, strict JSON, timeout, two retries, and legal fallback.

**Checkpoint:** complete human → Luna → human turn cycle; bad model output cannot reach board.

### 1:20–1:40 — Product UX

- Finish status hierarchy and game-over treatment.
- Make desktop/mobile layouts coherent.
- Add focus, live-region, reduced-motion, and touch affordances.
- Confirm honest difficulty copy and sanitized errors.

**Checkpoint:** all required state is visible and usable at 320px and desktop.

### 1:40–2:00 — Verification

- Run focused automated tests.
- Run lint and production build.
- Exercise manual critical paths.
- Remove dead code and unused dependencies.
- Verify client output does not contain secrets.
- Update README only if actual setup differs.

**Checkpoint:** clean commands, no known critical defects, deployable artifact.

## Scope-cut order

If time is short, remove or simplify in this order:

1. Piece movement animation
2. Decorative transitions
3. Optional keyboard shortcuts beyond accessible basics
4. Material-value summaries
5. Nonessential microcopy

Never cut:

- `chess.js` authority
- Local two-player completeness
- Promotion choice
- Server validation
- Retry/fallback legality
- Secret isolation
- Pending/stale-response guards
- Error recovery
- Basic mobile and keyboard usability

## Post-v1 candidates

Only after observed demand:

- Import/export FEN or PGN
- Board flip control in local mode
- Optional clocks
- Installable PWA/offline shell
- Shareable completed-game links, which would require a persistence decision
- Engine analysis, which would change the no-engine product boundary
- Online multiplayer, which would require identity, synchronization, and abuse architecture

These are explicitly deferred and should not be scaffolded in v1.
