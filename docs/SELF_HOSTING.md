# Self-hosting BySentinel

BySentinel runs as three Docker services: the **collector** (ingest + AI
orchestration + git/sandbox pipeline), the **dashboard** (Nuxt UI) and
**ministack** (local AWS-compatible sandbox used to reproduce incidents).

## Quick Start

```bash
cp .env.example .env
docker compose up -d --build
```

Dashboard:

```txt
http://localhost:4000
```

Sign in with the default account (change it in `.env` before installing):

```bash
BYSENTINEL_DEFAULT_USER=bysentinel
BYSENTINEL_DEFAULT_PASSWORD=adminbysentinel
```

The account is seeded once on the collector's first boot. After signing in,
create named accounts in **Settings > Users** and remove the default one.

SDK endpoint:

```txt
http://localhost:4000/v1/events
```

Use the same API key in your Lambda:

```bash
BYSENTINEL_COLLECTOR_URL=http://localhost:4000
BYSENTINEL_API_KEY=bsk_local_dev_key
```

## VPS With HTTPS

Point a DNS `A` record to your VPS, then set production secrets:

```bash
BYSENTINEL_DOMAIN=runtime.example.com
BYSENTINEL_API_KEYS=$(openssl rand -hex 32)
BYSENTINEL_ADMIN_TOKEN=$(openssl rand -hex 32)
BYSENTINEL_DEFAULT_PASSWORD=$(openssl rand -base64 32)
BYSENTINEL_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

Start with Caddy TLS:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Dashboard:

```txt
https://runtime.example.com
```

Caddy routes the domain to the dashboard and keeps `/v1/*` + `/health` on the
collector for SDK ingest. Local Docker exposes the same shape through the
dashboard proxy, so `http://localhost:4000` is the UI and
`http://localhost:4000/v1/events` is the SDK endpoint. Sign in with the default
account (or the admin token), then create named accounts in **Settings > Users**.

Set the default account before the first boot:

```bash
BYSENTINEL_DEFAULT_USER=bysentinel
BYSENTINEL_DEFAULT_PASSWORD=change-me-before-install
```

## AI Providers

Choose the AI provider in the dashboard after login. The settings are persisted
in the `/data` volume and can be changed without rebuilding Docker images.

Supported providers:

- OpenAI: set model and API key.
- OpenRouter: set model and API key.
- Anthropic: set model and API key.
- Ollama/local: set model and a reachable base URL, for example `http://host.docker.internal:11434` on Docker Desktop or `http://<private-ip>:11434` on a VPS network.
- Custom HTTP: set the full endpoint URL and optional bearer token.

The Compose files do not start Ollama. If you want local AI, run Ollama wherever
you prefer and paste its URL into the dashboard.

## Production Boot Guard

With `NODE_ENV=production` (set for you by `docker-compose.prod.yml`), the
collector **refuses to start** while any of these are still the development
default: `BYSENTINEL_ADMIN_TOKEN`, `BYSENTINEL_API_KEYS`, or
`BYSENTINEL_DEFAULT_PASSWORD`. It prints exactly what to fix and exits.

```bash
BYSENTINEL_ADMIN_TOKEN=$(openssl rand -hex 32)
BYSENTINEL_API_KEYS=$(openssl rand -hex 32)
BYSENTINEL_DEFAULT_PASSWORD='a-strong-unique-password'
```

Outside production it only warns. To override the guard (not recommended), set
`BYSENTINEL_ALLOW_INSECURE_DEFAULTS=true`.

Other hardening already in place: login is rate limited and constant-time (no
username enumeration), the last admin account cannot be deleted, viewer accounts
are read-only (they cannot analyze, fetch code, run the sandbox or change
settings), and the dashboard sends a strict CSP plus the usual security headers.

## Production Notes

- Put BySentinel behind HTTPS with Caddy, Nginx or a cloud load balancer.
- Change `BYSENTINEL_API_KEYS` and `BYSENTINEL_ADMIN_TOKEN`.
- Set `BYSENTINEL_WEBHOOK_SECRET` before enabling outbound webhooks.
- Keep `/data` on a persistent volume.
- Keep AI disabled in the dashboard if you want zero external calls.
- Change `BYSENTINEL_DEFAULT_PASSWORD` before the first boot, or rotate the
  default account from Settings > Users right after installing.
- The ministack service is internal-only (never exposed through Caddy) and
  needs access to `/var/run/docker.sock` to run simulated Lambdas.
- Tune `COLLECTOR_RATE_LIMIT_PER_MINUTE` for public collectors.
- The current MVP uses file storage. Move to Postgres before high-volume usage.

## Outbound Webhooks

Set one or more comma-separated URLs:

```bash
BYSENTINEL_WEBHOOK_URLS=https://example.com/runtime-webhook
BYSENTINEL_WEBHOOK_SECRET=bswhsec_...
```

BySentinel sends:

- `x-bysentinel-event: incident.analyzed`
- `x-bysentinel-timestamp`
- `x-bysentinel-signature: sha256=<hmac>`
- `x-bysentinel-idempotency-key`

Verify signatures with:

```txt
HMAC_SHA256(secret, timestamp + "." + raw_body)
```
