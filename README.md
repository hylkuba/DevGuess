# DevGuess

Wordle-style guessing game for developer technologies, built with React + Cloudflare Pages Functions.

## Stack

- Frontend: React + Vite
- Backend: Cloudflare Pages Functions (TypeScript)
- Validation: Zod
- Tests: Vitest

## Environment

Required server secret:

- `SECRET_SALT`: used for round answer selection and progress token signing

Optional:

- `DATASET_VERSION` (default `v1`)
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

## Governance

DevGuess is an open-source project with a single maintainer model.

Community contributions are welcome via pull requests.
Final decisions, releases, and deployments are handled by the project owner.

## Contribution model

- This project uses a fork + pull request workflow.
- Direct pushes to `main` and `deploy` are restricted to the project owner.
- All changes must go through a pull request.

See `CONTRIBUTING.md` for the full process.

## Security

If you discover a security issue, do not open a public issue.
Report vulnerabilities to `TODO`.
See `SECURITY.md` for reporting details.

## Sponsorship

Sponsorship helps cover hosting costs and supports continued development.
Sponsors do not receive governance rights or special control.
Funding links are defined in `FUNDING.yml`.

## Policies

- `LICENSE` (MIT)
- `CONTRIBUTING.md`
- `CODEOWNERS`
- `SECURITY.md`
- `DISCLAIMER.md`

## Maintainer setup (manual)

Configure branch protection for `main` and `deploy` in GitHub:

- Require a pull request before merging
- Require at least 1 approval
- Dismiss stale approvals
- Require status checks to pass (CI)
- Restrict who can push to matching branches (owner only)
- Include administrators

This keeps merge and deployment control owner-only while preserving open contribution via forks and pull requests.

## Secrets and deployment safety

- Keep all secrets in Cloudflare environment variables
- Never commit API keys or private tokens
- Keep answer-selection and signing logic server-side
