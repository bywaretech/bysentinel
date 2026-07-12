# @bywaretech/bysentinel-node

BySentinel SDK for Node.js servers and workers — Express, Fastify, plain
functions, queue consumers, cron jobs. Captures sanitized incident data on
failure and delivers it to a collector and/or direct webhooks, without ever
breaking your code.

It shares its redaction, event assembly and delivery (auth + HMAC signing) with
the AWS Lambda SDK, so behavior is identical across runtimes.

> **On AWS Lambda?** Use
> [`@bywaretech/bysentinel-aws-lambda`](https://www.npmjs.com/package/@bywaretech/bysentinel-aws-lambda)
> instead — it adds the Lambda `event`/`context`, cold-start and timeout-risk
> handling. See the [monorepo README](https://github.com/bywaretech/bysentinel#readme).

## Install

```bash
pnpm add @bywaretech/bysentinel-node
# npm i @bywaretech/bysentinel-node
```

## Wrap any async function

`withBySentinel` wraps a function, captures thrown errors, and re-throws them
unchanged. Ideal for workers, queue consumers, and cron handlers.

```ts
import { withBySentinel } from "@bywaretech/bysentinel-node";

const processJob = withBySentinel(
  async (job) => {
    await handle(job); // if this throws, a sanitized incident is delivered
  },
  {
    project: "billing",
    environment: "production",
    service: "worker", // labels runtime.service on the event
    collectorUrl: process.env.BYSENTINEL_COLLECTOR_URL,
    apiKey: process.env.BYSENTINEL_API_KEY,
  },
);
```

## Express / Connect

`bySentinelExpress` returns two middlewares that share one config:

```ts
import express from "express";
import { bySentinelExpress } from "@bywaretech/bysentinel-node";

const app = express();
app.use(express.json());

const bysentinel = bySentinelExpress({
  project: "payments-api",
  environment: "production",
  service: "express",
  collectorUrl: process.env.BYSENTINEL_COLLECTOR_URL,
  apiKey: process.env.BYSENTINEL_API_KEY,
});

app.use(bysentinel.scope); // early: lets manual captures inherit request context

app.post("/pay", async (req, res) => {
  const charge = await createCharge(req.body); // if it throws, it's captured
  res.json(charge);
});

app.use(bysentinel.errorHandler); // last: captures unhandled errors, then next(err)
```

The error handler dispatches in the background so the error response is never
delayed by delivery. Register `scope` before your routes so
`captureException` inside handlers picks up the active request.

## Manual capture

```ts
import { captureException, captureMessage } from "@bywaretech/bysentinel-node";

try {
  await chargeCustomer();
} catch (error) {
  await captureException(error, { feature: "checkout" });
  throw error;
}

await captureMessage("Payment provider is slow", { severity: "warning" });
```

## Direct webhooks (auth + HMAC signing)

Exactly like the Lambda SDK: send the sanitized event straight to one or more
webhooks, each with optional authentication and/or HMAC signing.

```ts
delivery: {
  mode: "background", // "background" (default) or "blocking"
  webhooks: [
    "https://webhook.site/your-url", // plain URL (no auth)
    {
      url: "https://ops.example.com/hook",
      auth: { type: "basic", username: "svc", password: process.env.HOOK_PW! },
    },
    {
      url: "https://gateway.example.com/events",
      auth: { type: "apiKey", value: process.env.KEY!, header: "X-Gateway-Key" },
      sign: { secret: process.env.WEBHOOK_SECRET! }, // adds x-bysentinel-signature
      headers: { "x-tenant": "acme" },
    },
  ],
}
```

| `auth.type` | Header sent                               | Fields                     |
| ----------- | ----------------------------------------- | -------------------------- |
| `basic`     | `Authorization: Basic base64(user:pass)`  | `username`, `password`     |
| `bearer`    | `Authorization: Bearer <token>`           | `token`                    |
| `apiKey`    | `<header>: <value>` (default `x-api-key`) | `value`, optional `header` |

When `sign` is set the request also carries `x-bysentinel-timestamp`,
`x-bysentinel-signature: sha256=…` and `x-bysentinel-idempotency-key` — the same
scheme as the collector's outbound webhooks, so a receiver verifies both the
same way. Reserved headers, the auth header and the signature headers always
take precedence over any custom `headers`.

## Delivery modes

- `background` (default): fire-and-forget, so the request/response is never
  delayed by delivery.
- `blocking`: await delivery before the wrapped function resolves.

Delivery is always bounded by `delivery.timeoutMs` and swallows its own errors.

## Execution timeline

```ts
import { BySentinel } from "@bywaretech/bysentinel-node";

const rt = BySentinel.start();
rt.step("Validate input");
rt.step("Charge card");
rt.finish();
```

Inside a wrapped function or Express request scope, the timeline is attached to
the event automatically (and finalized as aborted on error).

## Security

Bodies and headers are **off by default**. `security.strictMode` guarantees they
never leave the process. PII, secrets and payment data are redacted before any
network delivery, and security signals (SSRF, secret-in-log, etc.) are detected
on the raw request before redaction.

## Related packages

| Package | Use it for |
| ------- | ---------- |
| [`@bywaretech/bysentinel-aws-lambda`](https://www.npmjs.com/package/@bywaretech/bysentinel-aws-lambda) | AWS Lambda handlers (adds cold-start + timeout-risk detection). |
| [`@bywaretech/bysentinel-core`](https://www.npmjs.com/package/@bywaretech/bysentinel-core) | Shared types, redaction engine, webhook signing, and the `core/sdk` runtime this package is built on. |

Full docs, self-hosting and the dashboard live in the
[monorepo README](https://github.com/bywaretech/bysentinel#readme).
