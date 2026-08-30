# Testing — Luna Chess

## Test strategy

Use `chess.js` as the oracle for rules and keep tests concentrated around integration boundaries that can regress:

1. Move formatting/parsing
2. Game-status derivation
3. AI request validation and legal-set enforcement
4. Client interaction locks and stale-response handling
5. Critical end-to-end game flows

Avoid re-testing the entire internal implementation of `chess.js`. Test that the application wires it correctly.

## Automated checks

### Unit tests

- Canonical move conversion: normal, capture, castle, and promotion
- Candidate parser rejects malformed strings and accepts legal canonical strings
- Captured-piece derivation from verbose history
- Result/status text for checkmate, stalemate, repetition, insufficient material, and resignation
- API body validator rejects missing, oversized, and invalid fields
- Azure JSON parser rejects commentary, missing move, extra invalid shape, and empty output
- Legal validator rejects a syntactically valid but illegal move
- Fallback always returns one member of the generated legal set

### Integration tests

- Valid AI output is returned unchanged with `fallback: false`.
- Invalid output triggers a corrective retry.
- Exhausted invalid outputs return a legal fallback with `fallback: true`.
- Terminal FEN is rejected before Azure is called.
- Turn mismatch is rejected before Azure is called.
- Duplicate `requestId` is rejected while the first request is pending.
- Timeout/provider failure maps to a sanitized `503`.
- No response includes environment values or upstream body text.

### UI tests

- Mode selection exposes two primary modes.
- Local mode starts immediately.
- AI setup requires difficulty and side.
- Human input locks during AI request.
- Retry does not mutate the position before success.
- Restart and New Game clear stale/pending state.
- Promotion chooser appears before move commitment.
- Terminal and resignation states disable the board.

## Manual chess matrix

### Normal movement

- Move every piece type from legal positions.
- Attempt an illegal move and verify no state/history change.
- Capture a piece and verify board, SAN, and captured list update once.

### Check and checkmate

- Play Fool's Mate: `f3 e5 g4 Qh4#`.
- Verify checked king treatment and exact checkmate result.
- Verify the board and Resign control are locked after mate.

### Castling

- Verify legal king-side and queen-side castling move both pieces.
- Verify castling fails when the king is in check.
- Verify castling fails through an attacked square.
- Verify castling rights are lost after king/rook movement even if the piece returns.

### En passant

- Create an immediate en-passant opportunity and capture successfully.
- Make an intervening move instead and verify the opportunity disappears.
- Verify the captured pawn and SAN/history update correctly.

### Promotion

- Reach the last rank and verify queen, rook, bishop, and knight choices.
- Verify canceling the chooser does not commit the pawn move.
- Verify promotion with capture.

### Draws

- Load or play into stalemate and verify the exact label.
- Verify insufficient-material detection.
- Repeat a position three times and verify draw locking.
- Verify fifty-move draw behavior using a controlled FEN/counter.

## Manual AI matrix

- Choose White: human moves, board locks, Luna responds, turn returns.
- Choose Black: Luna makes the opening move exactly once.
- Put Luna in check and verify the returned move legally resolves the check.
- Stub malformed JSON, markdown-wrapped JSON, empty output, and illegal move.
- Verify illegal/malformed output is never applied.
- Verify bounded retries and legal fallback.
- Simulate timeout and unreachable Azure; show retryable message without changing FEN.
- Double-click or rapidly trigger actions; verify only one active request.
- Restart while a request is pending; verify late response is discarded.
- Set missing Azure variables; local mode remains fully playable.

## Responsive/accessibility matrix

View at:

- 320×568
- 375×812
- 768×1024
- 1440×900

Verify:

- No horizontal page scroll.
- Board remains square and fully visible.
- Controls remain reachable and legible.
- Move history scrolls internally without trapping the page.
- Full flow works by keyboard.
- Focus indication is visible.
- Status changes and AI thinking are announced by a live region.
- Reduced-motion preference removes nonessential transitions.
- Board state is understandable without relying only on color.

## Network verification for local mode

Open browser developer tools, clear the Network panel, start Local 2 Player, and play several moves including a capture and restart. There must be no `/api/ai-move` request or any other gameplay request.

## Secret verification

After a production build, search generated client assets for:

- `AZURE_OPENAI_API_KEY`
- The actual key value
- The actual endpoint
- The actual deployment name

None may appear in browser-delivered output. Environment variable names may exist in server bundles only.

## Release gate

Run in this order:

```bash
npm run lint
npm test
npm run build
```

If no automated test script exists yet, add the smallest useful test setup before release; do not report `npm test` as passing when it did not run.

The release fails if any of the following remain:

- Build or lint error
- Illegal move path
- Broken promotion, castling, or en passant
- Duplicate or stale AI request bug
- Secret leakage
- Dead control
- Mobile horizontal overflow
- Unsanitized upstream error
