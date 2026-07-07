# @bywaretech/bysentinel-aws-lambda

BySentinel SDK for AWS Lambda handlers. Wraps your handler, captures sanitized
incident data on failure, and delivers it to a collector — without ever breaking
your function.

## Install

```bash
pnpm add @bywaretech/bysentinel-aws-lambda
```

## `withBySentinel(handler, options)`

Wraps a handler. On an unhandled exception it builds a **sanitized**
`BySentinelEvent`, delivers it (bounded, fail-silent), then **re-throws the
original error**. On success it only emits an event when a performance risk
(e.g. timeout) is detected.

```ts
import { withBySentinel } from "@bywaretech/bysentinel-aws-lambda";

export const handler = withBySentinel(myHandler, {
  project: "payments-api",
  environment: "production",
  collectorUrl: process.env.BYSENTINEL_COLLECTOR_URL,
  apiKey: process.env.BYSENTINEL_API_KEY,

  capture: {
    requestBody: false, // default false (security-first)
    headers: false, // default false
    query: true,
    stackTrace: true,
    performance: true,
  },
  security: {
    sanitize: true,
    redactPII: true,
    redactSecrets: true,
    redactPaymentData: true,
    strictMode: true, // forces requestBody/headers off no matter what
  },
  ai: {
    enabled: true,
    provider: "openrouter",
    model: "deepseek/deepseek-chat",
    sendBodyToAI: false,
    sendHeadersToAI: false,
  },
  delivery: { mode: "background", timeoutMs: 2000, retries: 0, maxEventBytes: 262144 },
});
```

`collectorUrl` is treated as a collector base URL and the SDK posts to
`/v1/events` by default. For raw webhook URLs such as webhook.site, use:

```ts
delivery: {
  endpointPath: "";
}
```

## Direct webhooks from the SDK

The recommended production flow is SDK -> BySentinel collector -> dashboard ->
signed outbound webhooks. If you also want the initial sanitized event delivered
directly from the Lambda, configure `delivery.webhooks`:

```ts
export const handler = withBySentinel(myHandler, {
  project: "payments-api",
  environment: "production",
  collectorUrl: process.env.BYSENTINEL_COLLECTOR_URL,
  apiKey: process.env.BYSENTINEL_API_KEY,
  delivery: {
    timeoutMs: 5000,
    webhooks: ["https://webhook.site/your-url"],
  },
});
```

This sends the same sanitized event to both:

```txt
<collectorUrl>/v1/events
https://webhook.site/your-url
```

For webhook-only usage, omit `collectorUrl` and keep `delivery.webhooks`.
Comma-separated URLs can also be set with `BYSENTINEL_DIRECT_WEBHOOK_URLS`.

## Manual capture

Inside a wrapped handler, manual capture inherits the active project /
environment / collector config automatically (via `AsyncLocalStorage`):

```ts
import { captureException, captureMessage } from "@bywaretech/bysentinel-aws-lambda";

try {
  await processPayment();
} catch (error) {
  await captureException(error, { feature: "payment-processing", step: "create-pix-charge" });
  throw error;
}

await captureMessage("Payment provider returned slow response", {
  severity: "warning",
  provider: "payment-api",
});
```

## Execution timeline

Record the flow of an invocation. Steps are auto-timed; on an unhandled error
the running step is marked `failed`, and a single **bottleneck** is computed.
Because each step carries an absolute timestamp, it also serves as the
chronological incident timeline.

```ts
import { withBySentinel, BySentinel } from "@bywaretech/bysentinel-aws-lambda";

export const handler = withBySentinel(async (event) => {
  const runtime = BySentinel.start(); // or: startRuntime()

  runtime.step("Validate Request");
  const body = validate(event);

  runtime.step("Create Payment");
  const payment = await createPayment(body);

  runtime.step("Notify ERP").annotate({ endpoint: "erp.orders" });
  await notifyErp(payment);

  runtime.finish();
  return { statusCode: 200, body: JSON.stringify(payment) };
}, options);
```

Inside a wrapped handler the timeline attaches to the active scope automatically,
so it is included in any captured event. Step `meta` is redacted before sending.

## Git / release correlation

Every event can carry `commitSha`, `branch`, `version`, `release`,
`buildTimestamp` and `repositoryUrl`. These are read from `git` in options, then
from `BYSENTINEL_*` env vars, then from common CI providers (GitHub Actions,
GitLab CI, Vercel):

```bash
BYSENTINEL_GIT_SHA=abc1234
BYSENTINEL_GIT_BRANCH=main
BYSENTINEL_VERSION=2.4.0
BYSENTINEL_RELEASE=release-42
```

## Deduplication

If you `captureException(err)` and then re-throw, the wrapper detects the error
was already reported and does **not** create a second incident — one failure,
one incident.

## What gets captured

- **Error**: type, message, stack (if `capture.stackTrace`)
- **Lambda context**: function name/version, request id, memory limit, remaining
  time, **cold-start** flag
- **Performance**: duration, memory used, **timeout risk**
- **Request** (HTTP events, API Gateway v1/v2 + ALB): method, path, query, and —
  only if explicitly enabled and not in strict mode — headers and body
- **Security signals**: SSRF-like URLs, SQL-error leakage, path traversal,
  command injection, secrets in body/headers, scanner user-agents, admin-route
  access

Everything is redacted by `@bywaretech/bysentinel-core` **before it leaves the process**.
See [docs/SECURITY.md](../../docs/SECURITY.md).

## Guarantees

- **Never breaks your Lambda.** A broken/unreachable collector is swallowed; your
  business error always propagates unchanged.
- **Bounded delivery.** Sends are time-capped by `delivery.timeoutMs`.
- **Sanitized by default.** `event.sanitized` is always `true`; the collector
  rejects unsanitized events.
