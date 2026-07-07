# Contributing to BySentinel

Thanks for helping make BySentinel better.

## Development setup

Requirements:

- Node.js 24+
- pnpm 9+
- Docker, for collector/self-hosting smoke tests

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm lint
```

## Local collector smoke test

```bash
cp .env.example .env
docker compose up -d --build
pnpm smoke:e2e
docker compose down
```

## Pull request checklist

- Keep changes scoped to the issue or feature.
- Add or update tests when behavior changes.
- Update README/docs for user-facing changes.
- Keep secrets, tokens, customer data and production payloads out of fixtures.
- Run `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm lint`.

## Security-sensitive changes

Changes touching redaction, AI prompts, auth, webhooks, collector storage or
SDK delivery should include tests and a short note explaining the security
impact. BySentinel should fail closed for data exposure and fail open for Lambda
business execution.

## Release packaging

To generate local npm tarballs:

```bash
pnpm release:pack
```

The tarballs are written to `dist-packs/` and are useful for testing the SDK in
external Lambda projects before publishing.
