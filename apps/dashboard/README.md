# @bywaretech/bysentinel-dashboard

A dedicated, high-end dashboard for BySentinel, built with **Nuxt 4 + Tailwind v4 + shadcn-vue** (reka-ui).
It replaces the single-file HTML panel that used to live inside the collector.

## What it does

- **Login** with the collector admin token. The token is validated against the
  collector, then stored in a **httpOnly** session cookie. It never reaches the browser.
- **Overview** — metric cards, a 14-day activity trend, severity distribution and the
  most recent incidents.
- **Incidents** — searchable, filterable (severity / project / sort) list.
- **Incident detail** — AI root cause and suggested fix, confidence meter, causal chain,
  example patch, execution timeline with bottleneck attribution, security signals, stack
  trace, release/git correlation and the sanitized raw event.
- **AI analysis settings** — pick a provider (OpenAI, OpenRouter, Anthropic, Ollama/local,
  custom HTTP), model, base URL, API key and timeout. Enable or disable model analysis.

## Architecture

The browser only ever talks to this app (same origin). A **Nitro server proxy**
(`server/api/**`) forwards requests to the collector's admin API using the stored token
as a `Bearer` credential. This avoids CORS entirely and keeps the admin token server-side.

```
browser ──/api/*──▶ Nuxt Nitro proxy ──Bearer token──▶ collector /api/*
```

The app renders as a client SPA (`ssr: false`) because it is a token-gated internal tool.

## Configuration

Runtime config (env vars, all optional):

| Env var             | Default                 | Purpose                                            |
| ------------------- | ----------------------- | -------------------------------------------------- |
| `NUXT_COLLECTOR_URL`| `http://localhost:4000` | Base URL of the BySentinel collector.              |
| `NUXT_ADMIN_TOKEN`  | _(empty)_               | Optional. If set, the app runs pre-authenticated (managed mode) and the login screen is skipped. |

## Develop

```bash
pnpm --filter @bywaretech/bysentinel-dashboard dev      # http://localhost:3000
```

Point it at a running collector (see `apps/collector`). Sign in with that collector's
`BYSENTINEL_ADMIN_TOKEN` (dev default: `bs_admin_dev_token`).

## Build

```bash
pnpm --filter @bywaretech/bysentinel-dashboard build
node apps/dashboard/.output/server/index.mjs  # serves the built app
```

## Design system

Dark-locked, developer-tool aesthetic. One accent (iris/indigo) for interactive surfaces;
severity uses its own semantic scale (critical/high/medium/low). Tokens live in
`app/assets/css/main.css`; shadcn-vue primitives in `app/components/ui`.
