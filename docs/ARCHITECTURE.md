# Architecture

BySentinel is split into a small Lambda SDK, shared core logic, provider
transports and a self-hosted collector.

```txt
AWS Lambda
  |
  | @bysentinel/aws-lambda
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
| `@bysentinel/aws-lambda` | Handler wrapper, manual capture, timeline, Git metadata, bounded delivery.                 |
| `@bysentinel/core`       | Types, redaction, security signals, fingerprinting, timeline and AI prompt/schema helpers. |
| `@bysentinel/providers`  | Provider transports for OpenAI, OpenRouter, Anthropic, Ollama and custom HTTP.             |
| `@bysentinel/collector`  | Ingest API, file storage, AI settings, analysis and webhooks.                              |
| `@bysentinel/dashboard`  | Nuxt dashboard and same-origin Nitro proxy to the collector.                               |

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

The SDK can optionally fan out the sanitized event to direct webhook URLs with
`delivery.webhooks` or `BYSENTINEL_DIRECT_WEBHOOK_URLS`.

```txt
AWS Lambda
  |\
  | \ direct sanitized event
  |  v
  | External webhook
  v
Collector API -> Dashboard/API -> signed collector webhook
```

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
