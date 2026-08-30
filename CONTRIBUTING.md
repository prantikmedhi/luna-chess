# Contributing to Luna Chess

## Before changing code

Read `AGENTS.md`, then the document governing your change:

- Product behavior: `PRD.md`
- Runtime boundaries: `ARCHITECTURE.md`
- UI and tokens: `DESIGN.md`
- AI endpoint: `API.md`
- Verification: `TESTING.md`

## Setup

After implementation exists:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Azure values are needed only for Play vs AI. Never commit `.env.local` or real credentials.

## Change rules

- Keep changes focused on one product outcome.
- Reuse existing code and platform features before adding dependencies.
- Never implement custom chess legality.
- Never move Azure configuration or calls into client code.
- Update tests for nontrivial logic and regressions.
- Update docs when a public behavior or contract changes.
- Do not add speculative architecture for deferred roadmap items.

## Pull requests

Include:

1. What changed and why
2. Screenshots for visual changes at desktop and mobile widths
3. Tests performed, including special chess positions if relevant
4. Security impact for API or environment changes
5. Known limitations, if any

## Required checks

```bash
npm run lint
npm test
npm run build
```

Run the relevant manual scenarios from `TESTING.md`. For UI changes, verify keyboard access, reduced motion, and 320px width.

## Commit style

Use short imperative commit messages, for example:

```text
Add legal move indicators
Validate Luna moves server-side
Fix stale AI response after restart
```

## Definition of done

A change is done when:

- Required behavior works, not merely compiles.
- No illegal move or secret-exposure path was introduced.
- Error and loading states are handled.
- Tests and production build pass.
- No dead control, placeholder, or unused dependency remains.
- Relevant documentation is accurate.
