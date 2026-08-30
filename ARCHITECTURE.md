# Architecture — Luna Chess

## 1. System overview

```text
┌──────────────────────────────── Browser ────────────────────────────────┐
│ React client components                                                 │
│                                                                         │
│  Game controller ── chess.js ── board, status, history, captures       │
│        │                                                                │
│        ├── Local 2P: no requests                                        │
│        │                                                                │
│        └── AI mode: POST /api/ai-move                                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ FEN + difficulty + AI color + recent SAN
                                ▼
┌──────────────────── Next.js server route ───────────────────────────────┐
│ validate body → load FEN → verify turn/game → generate legal UCI moves │
│        │                                                                │
│        ▼                                                                │
│ Azure OpenAI GPT-5.6 deployment → parse JSON → validate against list   │
│        │                                  │                             │
│        └── invalid: bounded retry ────────┘                             │
│        └── exhausted: random move from server legal list                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ validated move only
                                ▼
                    Browser applies move via chess.js
```

## 2. Core invariant

No code path may apply a move that has not been accepted by `chess.js` for the exact current position.

The model is untrusted input. The browser is also untrusted input at the API boundary.

## 3. Runtime boundaries

### Client

Owns:

- Current game mode and AI setup
- Current `chess.js` position
- Selection and promotion UI state
- Visible move history and captured-material derivation
- Pending AI request state and retry affordance
- Resignation state

Must never receive or reference Azure credentials.

### Server

Owns:

- Environment variable access
- Request validation and size enforcement
- Independent reconstruction of the submitted position
- Legal move generation for the exact FEN
- Azure prompt construction and invocation
- Parsing, retry, validation, fallback, and sanitized responses
- Best-effort process-local duplicate-request locking

### Azure OpenAI

Receives compact chess context and returns one candidate move. It does not retain application game state and is not trusted for legality.

## 4. Suggested source layout

```text
src/
  app/
    api/
      ai-move/
        route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    chess-board.tsx
    game-screen.tsx
    game-sidebar.tsx
    mode-select.tsx
    promotion-dialog.tsx
  lib/
    ai/
      azure.ts
      prompts.ts
      schema.ts
    chess/
      display.ts
      status.ts
      types.ts
```

Keep files cohesive, but do not create wrappers or abstractions with a single speculative use. A single `game-screen.tsx` may coordinate state while visual pieces remain separate.

## 5. Domain model

```ts
type GameMode = "local" | "ai";
type Difficulty = "easy" | "medium" | "hard";
type Color = "w" | "b";

type AiMoveRequest = {
  requestId: string;
  fen: string;
  difficulty: Difficulty;
  aiColor: Color;
  recentMoves: string[];
};

type AiMoveResponse = {
  move: string; // canonical UCI-like: e2e4 or e7e8q
  fallback: boolean;
};
```

The request does not need a client-computed legal-move list because the server must generate and trust its own list. The server sends that list to Azure.

## 6. Canonical move format

Use lowercase UCI-like strings:

```text
e2e4
b8c6
e7e8q
```

Conversion from a verbose `chess.js` move:

```ts
`${move.from}${move.to}${move.promotion ?? ""}`
```

To apply a candidate, split it into `{ from, to, promotion? }` and call `chess.move(...)`. Membership in the server-generated canonical legal set is checked first.

## 7. Client game lifecycle

### Initialization

- Construct a standard `Chess` position.
- Set mode and optional AI configuration.
- If AI color equals side to move, enqueue exactly one AI request.

### Human move

1. Reject if terminal, resigned, pending, or not the human turn.
2. Derive legal moves for the selected square from `chess.js`.
3. If promotion is needed, collect the promotion piece.
4. Apply through `chess.move`.
5. Replace rendered game state from the resulting chess instance/FEN.
6. If AI mode is active and the game is not terminal, request the AI move.

### AI move

1. Set `isAiThinking` synchronously before the request.
2. Send current FEN and bounded metadata.
3. On success, verify the local FEN has not changed since dispatch.
4. Apply the returned move through local `chess.js`.
5. On failure, preserve the exact board and expose Retry.
6. Clear pending state in `finally`.

An `AbortController` should cancel obsolete requests on restart/new game/unmount.

## 8. Server AI lifecycle

```text
parse request
  → reject oversized/invalid body
  → acquire request lock
  → load Chess(fen)
  → reject terminal position
  → verify chess.turn() === aiColor
  → derive verbose moves and canonical legal set
  → invoke Azure (attempt 1)
  → parse JSON and validate membership
  → if invalid, invoke corrective attempt (max 2 retries total)
  → if still invalid, choose random canonical legal move
  → return { move, fallback }
  → release lock in finally
```

Do not accept a client legal-move list as authority. Do not return model commentary.

## 9. Azure adapter

A lean adapter can use `fetch` directly instead of adding an SDK. Construct the Azure URL from validated server variables and the deployment name. Use `AbortSignal.timeout(20_000)` or an equivalent controller.

The adapter must:

- Request structured JSON where the configured API supports it.
- Keep temperature low for Medium/Hard; Easy can favor variation.
- Avoid full PGN or conversational history.
- Extract text defensively across the chosen Azure response shape.
- Throw typed internal errors, converted by the route to sanitized public responses.

No logs may contain API keys, authorization headers, or complete upstream responses.

## 10. Prompt contract

System instruction:

```text
You are Luna, a chess move selector. Choose exactly one move for the supplied
position. Never change the board or invent a move. The move must be one of the
provided legalMoves strings. Return only strict JSON matching {"move":"e2e4"}.
No markdown, explanation, or extra keys.
```

The user payload is serialized compact JSON with:

- `fen`
- `sideToMove`
- `difficulty`
- `legalMoves`
- `recentMoves`

Corrective retries explicitly name the invalid result and repeat the legal list.

## 11. Validation and limits

Recommended route limits:

- Content type must be `application/json`.
- Reject `Content-Length` above 8 KB when present.
- `requestId`: 1–100 safe characters.
- `fen`: 1–120 characters and must load in `chess.js`.
- `recentMoves`: at most 8 strings, each at most 16 characters.
- Enumerated `difficulty` and `aiColor` only.
- Return generic public messages for internal failures.

A schema library is optional. Manual guards are sufficient for this small fixed shape.

## 12. Concurrency

Use a module-level `Set<string>` keyed by `requestId`. It prevents accidental duplicates within one warm server instance. The client remains the primary lock.

```ts
if (activeRequests.has(requestId)) return conflict();
activeRequests.add(requestId);
try {
  // process
} finally {
  activeRequests.delete(requestId);
}
```

This is intentionally not a distributed lock. A distributed store conflicts with the no-database, zero-extra-infrastructure constraint.

## 13. State derivation

Prefer derived UI state over duplicated mutable state:

- Move history from `chess.history({ verbose: true })`
- Captures from captured fields in verbose history
- Turn from `chess.turn()`
- Check/game-over from `chess.js` query methods
- Last move from the final verbose history entry

Only view concerns—selected square, promotion choice, pending state, error banner—need independent UI state.

## 14. Deployment

- Target: Vercel, Node.js runtime for the AI route.
- No database, queue, durable storage, or background worker.
- Configure four Azure variables in Preview and Production.
- The local mode remains functional when Azure variables are missing; AI mode returns a sanitized availability error.

## 15. Observability

Minimal structured server logs:

```text
requestId, durationMs, difficulty, attempts, fallback, outcome
```

Do not log API keys, authorization headers, full prompts, full responses, or user IP addresses.

## 16. Failure containment

- An Azure failure cannot mutate browser state.
- A malformed model result cannot escape server validation.
- A stale browser response cannot apply if its original FEN no longer matches.
- A UI exception must not alter the underlying rules position.
- Local two-player mode has no dependency on the AI route.
