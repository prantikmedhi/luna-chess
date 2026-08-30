# CLAUDE.md

Build Luna Chess end-to-end. Do not stop at scaffolding or a plan.

## Read first

- `PRD.md` — behavior and acceptance criteria
- `ARCHITECTURE.md` — boundaries and data flow
- `DESIGN.md` — visual implementation
- `API.md` — AI route contract
- `TESTING.md` — release gates

`AGENTS.md` is the repository-wide authority. If `next dev` adds a generated Next.js rules block to that file, preserve both the generated block and the Luna contract.

## Fixed decisions

- Next.js App Router + TypeScript + React
- Tailwind CSS
- `chess.js` is the sole chess-rules authority
- Client owns current game state
- `POST /api/ai-move` is the only Azure boundary
- Move format is lowercase `from + to + optional promotion`, e.g. `e2e4`, `e7e8q`
- No database, auth, Docker, Stockfish, or external chess API
- Deploy to Vercel

## Order of work

1. Scaffold the smallest current Next.js app.
2. Implement and verify local two-player chess, including promotion UI and all terminal states.
3. Implement AI setup and strict client pending/stale-response guards.
4. Implement the server route, Azure adapter, legal-set validation, two corrective retries, and legal random fallback.
5. Add status, captures, SAN history, resignation, restart, and new game.
6. Apply responsive/accessibility requirements and restrained visual polish.
7. Remove dead code and unused dependencies.
8. Run lint, tests, and production build; fix all failures.

## Non-negotiable checks

- Local mode issues no fetch requests.
- Every move is accepted by `chess.js` before rendering.
- The server regenerates legal moves from FEN; it does not trust a client list.
- Missing/failed Azure leaves the board unchanged and retryable.
- Secrets never enter client components, `NEXT_PUBLIC_*`, storage, logs, or responses.
- `AZURE_OPENAI_DEPLOYMENT` is read from the environment.
- No duplicate request while Luna is thinking.
- No stale AI response after restart/new game.
- No input after game over or resignation.
- Mobile has no horizontal overflow.

## Finish line

Completion requires real command output from:

```bash
npm run lint
npm test        # when configured
npm run build
```

Do not claim completion with known errors, placeholders, or unverified special moves.
