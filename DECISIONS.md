# Architectural Decisions — Luna Chess

## ADR-001: `chess.js` is the only rules authority

**Status:** Accepted

**Decision:** All move legality, application, check, mate, draw, FEN, and SAN behavior comes from `chess.js` on both client and server.

**Reason:** Chess edge cases are deterministic and subtle. Duplicating rules creates avoidable correctness risk.

## ADR-002: Client owns active game state

**Status:** Accepted

**Decision:** The browser stores the current game position. There is no session database or server game object.

**Reason:** Local play needs no server. AI requests are stateless and can be validated from FEN.

**Tradeoff:** Games do not survive refresh and cannot sync across devices in v1.

## ADR-003: Server regenerates legal AI candidates

**Status:** Accepted

**Decision:** The AI route ignores client authority for legal moves and generates its own list from the submitted FEN.

**Reason:** The browser is a trust boundary. Server reconstruction prevents forged candidate sets and ensures validation matches the exact position.

## ADR-004: Canonical UCI-like move strings

**Status:** Accepted

**Decision:** AI transport uses lowercase `from + to + optional promotion`, such as `e2e4` and `e7e8q`.

**Reason:** This format is compact, deterministic, easy to compare, and avoids SAN parsing ambiguity.

## ADR-005: Direct Azure `fetch` adapter

**Status:** Accepted

**Decision:** Prefer the platform `fetch` API over an Azure/OpenAI SDK unless the live endpoint contract makes the SDK materially safer or shorter.

**Reason:** One endpoint does not justify a large dependency. Direct fetch keeps bundle and API surface small.

## ADR-006: Bounded retry plus legal random fallback

**Status:** Accepted

**Decision:** Invalid model output receives at most two corrective retries. Exhaustion selects a random move from the server-generated legal list.

**Reason:** An unreliable model response must not softlock the game, and random legal selection preserves chess correctness.

**Tradeoff:** A fallback move may not match the selected difficulty. The response exposes `fallback: true` for diagnostics, not dramatic UI.

## ADR-007: Process-local duplicate lock

**Status:** Accepted

**Decision:** Use a module-level in-flight request set plus a client pending guard.

**Reason:** It satisfies accidental concurrency protection without violating the no-database/no-extra-infrastructure constraint.

**Tradeoff:** It does not coordinate across Vercel instances. Add platform rate limiting or a distributed store only if observed abuse requires it.

## ADR-008: No persistent player identity or analytics

**Status:** Accepted

**Decision:** Version 1 stores no account, game, or behavioral analytics data.

**Reason:** Persistence does not improve the core play loop and would add privacy and infrastructure obligations.

## ADR-009: Honest difficulty labels

**Status:** Accepted

**Decision:** Easy, Medium, and Hard tune model instructions/context but do not map to Elo or engine levels.

**Reason:** GPT move quality is nondeterministic and must not be overstated.

## ADR-010: Derive secondary UI state

**Status:** Accepted

**Decision:** History, captures, turn, last move, and terminal status are derived from `chess.js` rather than separately mutated stores.

**Reason:** Fewer writable sources reduce desynchronization bugs and simplify restart behavior.
