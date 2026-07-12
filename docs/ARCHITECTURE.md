# Architecture

BySentinel is split into a small Lambda SDK, shared core logic, provider
transports and a self-hosted collector.

```txt
AWS Lambda
  |
  | @bywaretech/bysentinel-aws-lambda
  | sanitized event, background delivery
  v
Collector API
  |
  | file storage, grouping, redaction, AI orchestration
  v
Dashboard/API
  |
  | optional signed webhook
  v
External alerting / automation
```

## Packages

| Package                  | Responsibility                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `@bywaretech/bysentinel-aws-lambda` | Lambda handler wrapper — a thin adapter over `core/sdk`.                                    |
| `@bywaretech/bysentinel-node`       | Node SDK for Express, Fastify and plain functions — a thin adapter over `core/sdk`.        |
| `@bywaretech/bysentinel-core`       | Types, redaction, security signals, fingerprinting, timeline, AI helpers, webhook signing. Its `core/sdk` subpath holds the shared SDK runtime (option resolution, event assembly, delivery with auth + HMAC signing, scoping, manual capture) that every adapter builds on. |
| `@bywaretech/bysentinel-providers`  | Provider transports for OpenAI, OpenRouter, Anthropic, Ollama and custom HTTP.             |
| `@bywaretech/bysentinel-collector`  | Ingest API, file storage, AI settings, analysis and webhooks.                              |
| `@bywaretech/bysentinel-dashboard`  | Nuxt dashboard and same-origin Nitro proxy to the collector.                               |

## Event flow

1. A Lambda handler throws or manually captures an incident.
2. The SDK builds a `BySentinelEvent`.
3. The SDK redacts the event and marks it `sanitized: true`.
4. Delivery runs with a bounded timeout and fails silently if the collector is unreachable.
5. The collector rejects unsanitized events.
6. The collector redacts again, groups by fingerprint and stores the incident.
7. The collector analyzes with the configured AI provider or heuristic fallback.
8. The dashboard renders the incident and optional webhooks are delivered.

## Direct SDK webhooks

The SDK can optionally fan out the sanitized event to one or more direct webhook
targets with `delivery.webhooks` or `BYSENTINEL_DIRECT_WEBHOOK_URLS`.

```txt
AWS Lambda
  |\
  | \ direct sanitized event (N targets)
  |  v
  | External webhook(s)
  v
Collector API -> Dashboard/API -> signed collector webhook
```

Each `delivery.webhooks` entry is either a plain URL string (legacy form) or a
`WebhookConfig` object:

```ts
{
  url: string;
  auth?:
    | { type: "basic"; username: string; password: string }
    | { type: "bearer"; token: string }
    | { type: "apiKey"; value: string; header?: string /* default x-api-key */ };
  headers?: Record<string, string>;
}
```

Auth is applied per target, so different webhooks can use different credentials.
Reserved headers (`content-type`, `x-bysentinel-event-id`,
`x-bysentinel-delivery`) and the auth header take precedence over any custom
`headers`. `BYSENTINEL_DIRECT_WEBHOOK_URLS` remains URL-only; use the object form
in code when a target needs authentication.

Direct SDK webhooks are best for bootstrap/testing or parallel notification.
Collector webhooks remain the richer production path because they include stored
incident metadata, grouping and AI analysis.

## Data boundaries

- Request bodies and headers are disabled by default.
- `strictMode` prevents bodies and headers from leaving the Lambda process.
- Timeline metadata is redacted before delivery.
- AI settings API never returns stored provider API keys.
- Outbound webhooks include HMAC signatures and idempotency keys.

## Current storage

The MVP stores incidents and settings in `/data/bysentinel.json`. This is simple
and transparent for self-hosting, but it is not the long-term high-volume
storage layer. The roadmap moves persistent state to Postgres and analysis work
to a queue-backed worker.

## Planned evolution

```txt
Collector API -> Redis/BullMQ -> Worker -> Postgres
                         |
                         v
                AI providers / source-code integrations
```

This will unlock historical baselines, incident clustering, trend intelligence,
source-code context by commit SHA and richer dashboard workflows.
