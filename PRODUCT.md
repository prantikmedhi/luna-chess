# Product — Luna Chess

## Vision

Make a trustworthy game of chess feel one click away: instantly playable with another person, or against a characterful AI opponent, without accounts, setup friction, or infrastructure sprawl.

## Product promise

**The board is always honest.** Luna may choose the move, but deterministic chess rules decide what is possible.

## Positioning

Luna Chess is not a chess training platform or a benchmark-grade engine. It is a polished, lightweight chess product that demonstrates how a generative model can participate safely inside a deterministic rules system.

## Audience

- Friends sharing a laptop or phone
- Casual chess players who want a low-friction AI match
- Builders evaluating robust LLM integration patterns
- Reviewers looking for a deployable Next.js product rather than a demo dashboard

## Principles

### 1. Start at the board

No account, dashboard, feed, or marketing detour. Mode selection is the only gateway.

### 2. Rules before intelligence

The AI is a move selector. `chess.js` owns legality, state transitions, and game results on both client and server.

### 3. Local play is first-class

Local two-player mode is not a degraded fallback. It is a complete offline product path and must work when Azure is unavailable.

### 4. Honest difficulty

Easy, Medium, and Hard describe Luna's instructions and decision effort. They are not Elo ratings and do not imply engine-level strength.

### 5. Fail without corrupting state

Network failures leave the position untouched and retryable. Invalid model output never reaches the board. A legal fallback prevents malformed output from softlocking a game.

### 6. Calm visual confidence

The board dominates. Supporting information is clear but quiet. Animation explains state change; it does not perform for attention.

## Experience pillars

### Immediate

A local game starts in one action. An AI game requires only difficulty and side.

### Legible

The current turn, selectable pieces, legal destinations, last move, check, captures, history, and result are always understandable.

### Resilient

The model can return bad output without breaking chess correctness. Azure can fail without breaking local mode.

### Portable

The app deploys to Vercel with four environment variables and no other infrastructure.

## Personality

Luna is composed, observant, and understated. The interface can use small phrases such as **Luna is thinking…**, but the model does not chat, taunt, explain moves, or fabricate personality through long prose.

## Release definition

Version 1 is complete when a player can:

- Start and finish a local game with all standard rules.
- Configure and finish a game against Luna from either side.
- Understand every board and game state without guessing.
- Recover from temporary AI failures without losing the position.
- Use the product comfortably on phone and desktop.

## Success signals

Because v1 has no analytics, launch quality is judged by observable product outcomes:

- No known illegal move can be applied.
- No known game state can become unrecoverably stuck.
- Local mode performs zero AI/network requests.
- Setup from clone to local run is documented and reproducible.
- Vercel deployment requires no service beyond Azure OpenAI.

## Scope guard

Do not add accounts, persistence, Stockfish, multiplayer networking, clocks, themes, puzzles, or analysis before the v1 acceptance criteria are green. These additions increase surface area without proving the core promise.
