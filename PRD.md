# Product Requirements Document — Luna Chess

## 1. Summary

Luna Chess is a focused web chess application with two modes:

1. **Local 2 Player** — two people share one device; no network calls are made during play.
2. **Play vs Luna** — one person plays an AI opponent powered by GPT-5.6 through Azure OpenAI.

The product must feel complete, remain easy to deploy, and preserve deterministic chess correctness. `chess.js`, not the model, is the authority for legal moves and terminal game states.

## 2. Goals

- Make a legal game of chess playable immediately without an account.
- Support all standard rules and special moves.
- Keep local mode independent of Azure availability.
- Make the AI mode robust against malformed or illegal model responses.
- Keep credentials entirely on the server.
- Deliver a clear, responsive, accessible interface suitable for Vercel.

## 3. Non-goals

- Accounts, profiles, ratings, matchmaking, or online multiplayer
- Saved games, cloud persistence, or databases
- Stockfish or any other external chess engine/API
- Chat with the AI, AI explanations, or claims of grandmaster strength
- Spectator mode, tournaments, clocks, puzzles, or analysis boards
- Native mobile applications

## 4. Users and jobs

### Casual player

Wants to start a complete game quickly, understand whose turn it is, and recover cleanly when a game ends.

### Two people sharing a device

Want a zero-setup local game with no dependency on network services.

### AI challenger

Wants a lightweight opponent with understandable difficulty labels and no misleading strength claims.

## 5. Primary user flows

### 5.1 Entry

Opening `/` displays exactly two primary choices:

- **Play vs AI**
- **Local 2 Player**

There is no login, registration, or onboarding gate.

### 5.2 Local two-player

1. Select **Local 2 Player**.
2. A new standard chess position opens immediately.
3. Players alternate turns on the same board.
4. The interface allows only legal moves.
5. On a terminal result or resignation, the board locks and a result banner appears.
6. **Restart** resets the current mode; **New Game** returns to mode selection.

### 5.3 Play vs Luna

1. Select **Play vs AI**.
2. Select difficulty: Easy, Medium, or Hard.
3. Select side: White or Black.
4. Select **Start Game**.
5. If Luna is White, the AI request starts after the board appears.
6. On the human turn, legal human input is enabled.
7. After a legal human move, interaction locks and **Luna is thinking…** appears.
8. The server returns only a validated legal move or a sanitized error.
9. The client applies the returned move to its local `chess.js` instance.
10. If the request fails, the user sees **AI is temporarily unavailable. Try again.** with a Retry action.

## 6. Functional requirements

### 6.1 Game rules and state

- Use one `chess.js` instance or serialized equivalent as the source of truth for the current client game.
- Support legal movement, captures, check, checkmate, stalemate, insufficient material, threefold repetition, the fifty-move rule, castling, en passant, and promotion.
- Reject input when the game is terminal, resigned, or awaiting Luna.
- Display SAN move history in numbered pairs.
- Preserve FEN for current-position synchronization with the API.
- Promotion must open a piece chooser for queen, rook, bishop, or knight before committing the move.
- Restart must clear selection, pending requests, history, captures, errors, and resignation state.

### 6.2 Board interaction

- Click/tap a movable piece to select it.
- Show legal destination indicators for the selected piece.
- Click/tap a legal destination to move.
- Selecting another own piece changes selection.
- Clicking outside a legal move clears selection.
- Highlight the last move's origin and destination.
- Highlight a checked king distinctly.
- Disable all squares while an AI request is pending or after game over.

### 6.3 Captures

Captured pieces are derived from verbose move history, not a second independently mutated rules state. Show captured White and captured Black material in compact groups.

### 6.4 Game status

Always show one clear status:

- White to move
- Black to move
- Luna is thinking…
- White/Black is in check
- Checkmate — White/Black wins
- Draw — stalemate
- Draw — insufficient material
- Draw — repetition
- Draw — fifty-move rule
- White/Black resigned — opponent wins

### 6.5 Controls

- **Resign** is available only during active play.
- **Restart** starts the same mode with the same AI setup choices.
- **New Game** returns to the initial mode screen and clears configuration.
- **Retry** appears only after a recoverable AI request failure and must not duplicate an in-flight call.

## 7. Luna AI requirements

### 7.1 Client request

The client sends:

- Current FEN
- Difficulty
- AI color
- Recent SAN history, capped at eight half-moves

It must not submit a proposed AI move.

### 7.2 Server authority

For each request, the route must:

1. Validate JSON shape and enforce a small body limit.
2. Load the FEN into a fresh server-side `chess.js` instance.
3. Reject terminal positions.
4. Verify that the side to move equals the declared AI color.
5. Generate legal moves server-side in one canonical UCI-like format: `from + to + optional promotion`, e.g. `e2e4`, `e7e8q`.
6. Send the FEN, side, difficulty, legal list, and short history to Azure.
7. Parse strict JSON shaped as `{"move":"e2e4"}`.
8. Validate the returned move against the exact generated legal set.
9. Retry invalid or malformed output at most twice with a concise corrective instruction.
10. After retries fail, select a random move from the same server-generated legal set.
11. Return only a validated move and whether fallback was used.

### 7.3 Difficulty behavior

- **Easy:** ask for a simple or intentionally imperfect move; use minimal history.
- **Medium:** ask for a solid, sensible move using the full legal list and short history.
- **Hard:** ask the model to consider checks, captures, threats, king safety, and material before returning only JSON.

UI copy must describe these as behavior presets, not standardized chess ratings.

### 7.4 Azure contract

- Endpoint, API version, deployment, and key come only from server environment variables.
- The deployment is read from `AZURE_OPENAI_DEPLOYMENT`; no deployment name is hardcoded.
- Use JSON/structured output mode when supported by the selected Azure API version.
- Apply a 20-second request timeout.
- Never expose upstream bodies, stack traces, credentials, or configuration values to the browser.

## 8. Concurrency and abuse controls

- Client stores one pending-request flag and checks it before requesting another move.
- Server maintains a best-effort in-memory set of active game/request identifiers.
- Duplicate active requests receive HTTP `409`.
- Locks are released in `finally` blocks.
- This process-local lock is acceptable for the first Vercel release; it is not presented as a global distributed guarantee.

## 9. Responsive and accessibility requirements

- No horizontal scrolling at 320 CSS pixels wide.
- Board remains square and is the visual focus.
- Tap targets are at least 44×44 CSS pixels where practical.
- All controls are keyboard reachable and have visible focus styles.
- Do not rely on color alone for turn, selection, legal moves, check, or errors.
- Board squares expose understandable accessible names.
- Motion respects `prefers-reduced-motion`.
- Core text and controls meet WCAG AA contrast.

## 10. Error behavior

| Condition | Server behavior | Client behavior |
| --- | --- | --- |
| Invalid body/FEN | `400` sanitized error | Show setup/game error; do not mutate board |
| Not AI turn | `409` | Keep board unchanged |
| Game already over | `409` | Recompute terminal status locally |
| Duplicate request | `409` | Keep current pending request only |
| Azure timeout/unreachable | `503` sanitized error | Show retryable availability message |
| Malformed/illegal model move | Retry, then legal random fallback | Apply validated returned move |
| Missing server env | `503` sanitized error | Show configuration unavailable message |

## 11. Analytics and privacy

Version 1 includes no analytics, tracking, cookies, user accounts, or persistent storage. Server logs may include request IDs, durations, retry counts, and fallback occurrence, but never secrets or full Azure payloads.

## 12. Acceptance criteria

The release is acceptable when:

- Local mode completes legal games without network requests.
- Castling, en passant, promotion, check, checkmate, stalemate, and draws behave through `chess.js`.
- AI mode completes a human move → server request → validated AI move cycle.
- Illegal/malformed model output is never applied.
- Duplicate AI requests are prevented.
- Secrets and deployment details are absent from client bundles.
- Mobile layouts remain usable without horizontal overflow.
- All controls work; no placeholders or dead interactions remain.
- `npm run lint`, automated tests, and `npm run build` pass.
