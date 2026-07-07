# Smoke Tests

Use these checks before publishing a release or deploying to a VPS.

## Local Docker smoke

```bash
cp .env.example .env
docker compose up -d --build
pnpm smoke:e2e
docker compose down
```

`pnpm smoke:e2e` verifies:

- `POST /v1/events` accepts a sanitized event with the configured API key.
- `GET /api/incidents` returns the stored incident with analysis output, using
  collector Bearer auth or dashboard session cookies when the base URL points to
  the Nuxt dashboard proxy.
- `GET /api/settings/ai` does not expose the stored provider API key.

## Direct SDK webhook check

For a Lambda that should send to both BySentinel and a raw webhook receiver, set:

```bash
BYSENTINEL_COLLECTOR_URL=http://localhost:4000
BYSENTINEL_API_KEY=bsk_local_dev_key
BYSENTINEL_DIRECT_WEBHOOK_URLS=https://webhook.site/your-url
```

The SDK posts the same sanitized event to the collector and to each direct
webhook URL. This is separate from collector outbound webhooks, which run after
storage and analysis.

## Manual dashboard check

1. Open `http://localhost:4000`.
2. Use any username and `BYSENTINEL_ADMIN_TOKEN` as the password.
3. Confirm the smoke incident appears.
4. Open AI settings and save a provider/model.
5. Re-run analysis on the incident.

## External Lambda package check

After `pnpm release:pack`, install the local tarballs in an external Lambda
project:

```bash
npm install /path/to/bysentinel/dist-packs/bysentinel-core-0.1.0.tgz \
  /path/to/bysentinel/dist-packs/bysentinel-aws-lambda-0.1.0.tgz
```

Then deploy or zip the Lambda normally and trigger a failing invocation.
