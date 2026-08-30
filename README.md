# Luna Chess

A production-ready web chess experience for local two-player games and matches against **Luna**, a GPT-5.6-powered opponent served securely through Azure OpenAI.

The application is implemented end to end with local two-player chess, server-validated Luna moves, automated tests, and a Vercel-ready build.

## Product scope

- Fully offline local two-player chess
- Easy, Medium, and Hard AI modes
- Choice of White or Black against Luna
- Deterministic legality and game state through `chess.js`
- Server-validated AI moves with bounded retries and legal fallback
- Responsive, accessible, board-first interface
- Vercel deployment with no database or authentication

## Documentation map

| Document | Purpose |
| --- | --- |
| [PRD.md](PRD.md) | Product requirements, scope, flows, and acceptance criteria |
| [PRODUCT.md](PRODUCT.md) | Product vision, audience, principles, and release strategy |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System boundaries, request lifecycle, security, and modules |
| [DESIGN.md](DESIGN.md) | Visual system, design tokens, components, and responsive rules |
| [AGENTS.md](AGENTS.md) | Repository-wide operating contract for coding agents |
| [CLAUDE.md](CLAUDE.md) | Concise implementation instructions for Claude Code |
| [SECURITY.md](SECURITY.md) | Threat model and secret-handling requirements |
| [API.md](API.md) | `POST /api/ai-move` request and response contract |
| [TESTING.md](TESTING.md) | Test matrix, manual scenarios, and release gates |
| [ROADMAP.md](ROADMAP.md) | Time-boxed build sequence and deferred work |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution workflow and definition of done |
| [DECISIONS.md](DECISIONS.md) | Important architectural decisions and tradeoffs |

## Fixed stack

- Next.js App Router
- React + TypeScript
- `chess.js`
- Tailwind CSS
- Azure OpenAI, called only from a Next.js server route
- Vercel

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Release checks:

```bash
npm run lint
npm test
npm run build
```

Expected server variables:

```env
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION= # optional; defaults to 2024-10-21
AZURE_OPENAI_DEPLOYMENT=
```

Add the same variables to the Vercel project for Preview and Production, then redeploy.

No database or authentication is required. Local two-player mode works fully offline after the app has loaded.

## Build priorities

1. Correct chess rules and state
2. Complete local two-player play
3. Secure Luna AI move cycle
4. Server validation and fallback
5. Core game UX
6. Responsive behavior
7. Polish

When schedule and scope conflict, cut from the bottom of that list—not the top.
