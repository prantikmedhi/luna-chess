# API — Luna Chess

## `POST /api/ai-move`

Requests Luna's move for an exact chess position. The route reconstructs the position, generates legal moves server-side, asks Azure OpenAI to select one, validates the result, and returns only a legal move.

## Request

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "requestId": "4fe92f56-c495-49dd-af52-a19a07f01474",
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  "difficulty": "medium",
  "aiColor": "w",
  "recentMoves": ["e4", "e5"]
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `requestId` | string | 1–100 safe characters; unique for the active request |
| `fen` | string | Valid FEN, maximum 120 characters |
| `difficulty` | string | `easy`, `medium`, or `hard` |
| `aiColor` | string | `w` or `b`; must equal FEN side to move |
| `recentMoves` | string[] | Maximum eight SAN strings, each at most 16 characters |

Unknown fields should be ignored only if validation remains strict; rejecting them is preferable for a small fixed contract.

## Success response

```json
{
  "move": "g1f3",
  "fallback": false
}
```

Promotion appends one lowercase piece letter:

```json
{
  "move": "e7e8q",
  "fallback": false
}
```

`fallback: true` means Azure failed to provide a valid move after bounded attempts and the server chose a random move from the exact server-generated legal set.

## Error responses

### `400 Bad Request`

```json
{
  "error": "INVALID_REQUEST",
  "message": "The game position could not be processed."
}
```

Use for malformed JSON, invalid fields, invalid FEN, or oversized input.

### `409 Conflict`

```json
{
  "error": "MOVE_NOT_ALLOWED",
  "message": "Luna cannot move in this position."
}
```

Use when the game is over or the FEN side to move does not match `aiColor`.

Duplicate active request:

```json
{
  "error": "REQUEST_IN_PROGRESS",
  "message": "An AI move is already in progress."
}
```

### `503 Service Unavailable`

```json
{
  "error": "AI_UNAVAILABLE",
  "message": "AI is temporarily unavailable. Please try again."
}
```

Use for missing Azure configuration, timeouts, network failure, empty upstream responses, or provider errors that cannot safely use the legal fallback.

## Server algorithm

1. Validate request and acquire `requestId` lock.
2. Load FEN with `chess.js`.
3. Reject terminal positions and turn mismatch.
4. Generate verbose legal moves.
5. Convert each legal move to canonical lowercase `from + to + promotion?`.
6. Build compact Azure input containing FEN, side, difficulty, legal moves, and short history.
7. Ask for strict JSON: `{"move":"..."}`.
8. Parse defensively and require exact legal-set membership.
9. Retry invalid output up to two times with a corrective prompt.
10. Use a random server legal move if all model attempts are invalid.
11. Return the canonical move and fallback flag.
12. Release lock in `finally`.

## Client application rule

The response is trusted only as transport output, not directly written to UI state. The client must still call local `chess.move({ from, to, promotion })`. If the board FEN differs from the FEN captured at request dispatch, discard the response as stale.

## Azure payload principle

The route sends no ongoing conversation. Each request is self-contained and small:

```json
{
  "fen": "...",
  "sideToMove": "b",
  "difficulty": "hard",
  "legalMoves": ["a7a6", "a7a5", "b7b6"],
  "recentMoves": ["e4", "c5", "Nf3"]
}
```

The deployment is selected exclusively from `AZURE_OPENAI_DEPLOYMENT`.
