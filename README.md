# DevGuess

Daily Wordle-style guessing game for developer technologies, built with React + Cloudflare Pages Functions.

## Stack

- Frontend: React + Vite
- Backend: Cloudflare Pages Functions (TypeScript)
- Validation: Zod
- Tests: Vitest

## Environment

Required server secret:

- `SECRET_SALT`: used for daily answer selection and progress token signing

Optional:

- `DATASET_VERSION` (default `v1`)
- `PUZZLE_EPOCH` (default `2025-01-01`)
- `RATE_LIMIT_KV` binding for persistent rate limits (falls back to in-memory for local dev)

## Local commands

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run dev` now runs the React app and local `/api/*` endpoints together via Vite middleware.  
Use Wrangler only when you need Cloudflare runtime parity.

## API routes

- `GET /api/meta`
- `POST /api/search`
- `POST /api/start`
- `POST /api/guess`
