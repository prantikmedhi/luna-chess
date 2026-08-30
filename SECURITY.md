# Security — Luna Chess

## Security objective

Keep Azure credentials and upstream details server-only, reject untrusted input before use, and guarantee that model output cannot introduce an illegal chess move.

## Trust boundaries

Untrusted inputs include:

- Browser request bodies
- FEN and recent move history submitted by the client
- Request identifiers
- All Azure model output
- Upstream status codes and error bodies

Trusted authorities are limited to:

- Server environment variables
- Server-side `chess.js` legality for the submitted position
- Application-owned validation code

## Secrets

Required server variables:

```env
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=
AZURE_OPENAI_DEPLOYMENT=
```

Rules:

- Never prefix these with `NEXT_PUBLIC_`.
- Never read them from a client component.
- Never put them in localStorage, sessionStorage, URLs, HTML, telemetry, or API responses.
- Commit only blank names in `.env.example`.
- Keep `.env*` ignored except `.env.example`.
- Do not log headers, keys, complete Azure URLs, full prompts, or full responses.

## API input controls

`POST /api/ai-move` must:

- Require JSON.
- Reject bodies over 8 KB where measurable before parsing.
- Reject unknown or malformed shapes.
- Bound every string and array.
- Parse FEN using a fresh `Chess` instance.
- Reject terminal positions and positions where it is not the AI's turn.
- Generate its own legal move list.

Do not trust a client-provided legal list, game-over flag, or candidate AI move.

## Model-output controls

- Request one JSON object with one `move` property.
- Treat markdown, commentary, extra keys, empty output, and malformed JSON as invalid.
- Normalize only harmless syntax such as trimming whitespace and lowercasing the move string.
- Never “repair” a move into a different move.
- Validate exact membership in the legal set generated for the submitted FEN.
- After bounded retries, select only from that same legal set.

## Error handling

Public responses are stable and generic:

- Invalid request
- AI move is not allowed for this position
- AI request already in progress
- AI is temporarily unavailable

Server diagnostics may record a request ID, outcome category, duration, retry count, and fallback boolean. Do not forward upstream error bodies or stack traces.

## Availability and abuse

- Azure calls time out after approximately 20 seconds.
- The client disables repeated actions while a request is active.
- The server uses a process-local in-flight request set and returns `409` for duplicates in that instance.
- Request bodies are intentionally small.
- No durable global rate limiter is added in v1 because it would require extra infrastructure; configure platform-level protections if public abuse becomes material.

## Browser safety

- Render status and move text as text, not raw HTML.
- Do not use `dangerouslySetInnerHTML` for model or error content.
- Do not expose a free-form prompt surface.
- Keep dependencies minimal and maintain them with lockfile-backed updates.

## Threat model

| Threat | Control |
| --- | --- |
| Credential extraction from bundle | Server-only route and non-public env names |
| Client forges legal moves | Server reconstructs FEN and legal set |
| Model returns illegal move | Exact legal-set validation + bounded retry/fallback |
| Duplicate requests | Client pending flag + process-local server lock |
| Oversized payload | Content-length and parsed shape/length limits |
| Upstream hangs | Abort timeout |
| Error leaks provider data | Sanitized response mapping |
| Stale AI response alters new game | Client compares dispatch FEN/request identity |
| Prompt injection via history | History is bounded SAN data; system limits output to legal list |

## Reporting a vulnerability

Do not open a public issue containing secrets or an active exploit. Contact the repository owner privately through their GitHub profile. Include impact, reproduction steps, affected code, and a suggested fix if known.
