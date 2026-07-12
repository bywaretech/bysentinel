# @bywaretech/bysentinel-aws-lambda

BySentinel SDK for AWS Lambda handlers. Wraps your handler, captures sanitized
incident data on failure, and delivers it to a collector — without ever breaking
your function.

> **Not on Lambda?** For Express, Fastify, plain functions, workers or cron jobs,
> use [`@bywaretech/bysentinel-node`](https://www.npmjs.com/package/@bywaretech/bysentinel-node)
> — same redaction, delivery, auth and HMAC signing, different entry points.
> See the [monorepo README](https://github.com/bywaretech/bysentinel#readme) for
> the full picture.

## Install

```bash
pnpm add @bywaretech/bysentinel-aws-lambda
# npm i @bywaretech/bysentinel-aws-lambda
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
directly from the Lambda, configure `delivery.webhooks`. Each entry is either a
plain URL string (legacy form) or an object with per-webhook authentication and
extra headers, and you can configure as many targets as you need:

```ts
export const handler = withBySentinel(myHandler, {
  project: "payments-api",
  environment: "production",
  collectorUrl: process.env.BYSENTINEL_COLLECTOR_URL,
  apiKey: process.env.BYSENTINEL_API_KEY,
  delivery: {
    timeoutMs: 5000,
    webhooks: [
      // Plain URL (legacy form, still supported).
      "https://webhook.site/your-url",

      // HTTP Basic auth.
      {
        url: "https://ops.example.com/hooks/bysentinel",
        auth: { type: "basic", username: "svc", password: process.env.HOOK_PASSWORD! },
      },

      // Bearer token.
      {
        url: "https://api.proxy.example.com/ingest",
        auth: { type: "bearer", token: process.env.INGEST_TOKEN! },
      },

      // API key in a header (defaults to `x-api-key`) plus a custom header.
      {
        url: "https://gateway.example.com/events",
        auth: { type: "apiKey", value: process.env.GATEWAY_KEY!, header: "X-Gateway-Key" },
        headers: { "x-tenant": "acme" },
      },
    ],
  },
});
```

Authentication modes (all optional — a webhook can have no `auth` at all):

| `auth.type` | Header sent                               | Fields                     |
| ----------- | ----------------------------------------- | -------------------------- |
| `basic`     | `Authorization: Basic base64(user:pass)`  | `username`, `password`     |
| `bearer`    | `Authorization: Bearer <token>`           | `token`                    |
| `apiKey`    | `<header>: <value>` (default `x-api-key`) | `value`, optional `header` |

### HMAC-signed webhooks

Add `sign` to a webhook to prove authenticity **and** integrity (that the payload
wasn't tampered with) — not just possession of a credential:

```ts
{
  url: "https://ops.example.com/hook",
  sign: { secret: process.env.WEBHOOK_SECRET! },
}
```

A signed webhook additionally carries:

- `x-bysentinel-timestamp` — unix seconds
- `x-bysentinel-signature` — `sha256=HMAC_SHA256(secret, "{timestamp}.{body}")`
- `x-bysentinel-idempotency-key` — a UUID to drop duplicate deliveries

This is the **same scheme** the collector uses for its outbound webhooks, so a
receiver verifies both identically: recompute the HMAC over `${timestamp}.${body}`
with a constant-time compare, and reject stale timestamps (replay protection).
`auth` and `sign` are independent — use either, both, or neither.

All webhooks are delivered in parallel. Each also receives
`content-type: application/json`, `x-bysentinel-event-id`, and
`x-bysentinel-delivery: sdk-webhook`. These reserved headers, the auth header and
the signature headers always take precedence over any custom `headers` you
provide.

This sends the same sanitized event to every target, e.g.:

```txt
<collectorUrl>/v1/events
https://webhook.site/your-url
https://ops.example.com/hooks/bysentinel
```

For webhook-only usage, omit `collectorUrl` and keep `delivery.webhooks`.
Comma-separated URLs can also be set with `BYSENTINEL_DIRECT_WEBHOOK_URLS`
(URL-only; use the object form in code when a webhook needs authentication).

## Testing locally (no AWS)

`withBySentinel` just wraps a plain `(event, context)` function, so you can
exercise it from any Node script — no AWS account and no deploy. Point
`delivery.webhooks` at a free [webhook.site](https://webhook.site) URL and watch
the sanitized incident arrive in your browser.

Save this as `local-test.mjs` and run `node local-test.mjs`:

```js
import { withBySentinel } from "@bywaretech/bysentinel-aws-lambda";

// Your real handler. It throws here so we generate an incident to inspect.
function myHandler(event) {
  if (event.httpMethod !== "POST") {
    throw new Error(`Invalid HTTP method: ${event.httpMethod}`);
  }
  return { statusCode: 200, body: JSON.stringify({ message: "OK" }) };
}

const handler = withBySentinel(myHandler, {
  project: "payments-api",
  environment: "local",
  // No collector needed for a local test — deliver straight to a webhook.
  delivery: {
    timeoutMs: 5000,
    webhooks: ["https://webhook.site/your-unique-url"],
  },
  debug: true, // print internal diagnostics to the console
});

// Fake an API Gateway event + a Lambda context.
const event = {
  httpMethod: "GET", // change to "POST" to see a successful (silent) run
  path: "/test",
  queryStringParameters: { foo: "bar" },
};

const context = {
  awsRequestId: "local-test-1",
  functionName: "test-function",
  functionVersion: "$LATEST",
  memoryLimitInMB: "512",
  getRemainingTimeInMillis: () => 30_000, // enables timeout-risk detection
};

// The wrapped handler awaits delivery, so `await` here waits for the POST to
// finish before the process exits.
try {
  const result = await handler(event, context);
  console.log("handler ok:", result);
} catch (err) {
  console.error("handler threw (expected):", err.message);
}
```

What to expect:

- With `httpMethod: "GET"` the handler throws, so the SDK POSTs a **sanitized**
  event to your webhook.site URL and then re-throws — you'll see
  `handler threw (expected)` and a request appear on webhook.site.
- Switch the event to `httpMethod: "POST"` and the handler returns `200` with
  **no** event delivered: healthy runs are silent unless a performance risk is
  detected.
- CommonJS project? Use `require(...)` and drop the top-level `await`, or keep
  the `.mjs` extension shown above. If your `package.json` has
  `"type": "module"`, a plain `.js` file works too.

The same pattern works with a real collector: set `collectorUrl` + `apiKey`
instead of (or alongside) `delivery.webhooks`.

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

## Related packages

| Package | Use it for |
| ------- | ---------- |
| [`@bywaretech/bysentinel-node`](https://www.npmjs.com/package/@bywaretech/bysentinel-node) | Express, Fastify, plain functions, workers, cron — anything that isn't Lambda. |
| [`@bywaretech/bysentinel-core`](https://www.npmjs.com/package/@bywaretech/bysentinel-core) | Shared types, redaction engine, webhook signing, and the `core/sdk` runtime both SDKs are built on. |

Full docs, self-hosting and the dashboard live in the
[monorepo README](https://github.com/bywaretech/bysentinel#readme).
