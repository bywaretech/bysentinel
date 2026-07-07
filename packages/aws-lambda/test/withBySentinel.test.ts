import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BySentinelEvent } from "@bysentinel/core";
import { withBySentinel } from "../src/withBySentinel.js";
import { captureException } from "../src/capture.js";
import { __resetColdStart } from "../src/context.js";
import { buildDeliveryUrl } from "../src/transport.js";

const baseOpts = {
  project: "payments-api",
  environment: "test",
  collectorUrl: "http://collector.local",
  apiKey: "bsk_test",
};

function mockFetch() {
  const calls: BySentinelEvent[] = [];
  const requests: Array<{ url: string; headers: Record<string, string> }> = [];
  const fn = vi.fn(async (_url: string, init: any) => {
    requests.push({ url: _url, headers: init.headers });
    calls.push(JSON.parse(init.body));
    return { ok: true, status: 200 } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn, requests };
}

const ctx = {
  functionName: "pay",
  functionVersion: "1",
  awsRequestId: "req-123",
  memoryLimitInMB: "512",
  getRemainingTimeInMillis: () => 30_000,
};

beforeEach(() => __resetColdStart());
afterEach(() => vi.unstubAllGlobals());

describe("withBySentinel", () => {
  it("captures an exception, sends a sanitized event, and re-throws", async () => {
    const { calls } = mockFetch();
    const handler = withBySentinel(async () => {
      throw new Error("boom");
    }, baseOpts);

    await expect(handler({}, ctx)).rejects.toThrow("boom");

    expect(calls).toHaveLength(1);
    const evt = calls[0]!;
    expect(evt.error?.type).toBe("Error");
    expect(evt.error?.message).toBe("boom");
    expect(evt.sanitized).toBe(true);
    expect(evt.lambda.functionName).toBe("pay");
    expect(evt.lambda.requestId).toBe("req-123");
  });

  it("returns the handler result unchanged on success", async () => {
    mockFetch();
    const handler = withBySentinel(async () => ({ statusCode: 200 }), baseOpts);
    await expect(handler({}, ctx)).resolves.toEqual({ statusCode: 200 });
  });

  it("does not send an event on a healthy successful run", async () => {
    const { fn } = mockFetch();
    const handler = withBySentinel(async () => "ok", baseOpts);
    await handler({}, ctx);
    expect(fn).not.toHaveBeenCalled();
  });

  it("marks the first invocation as a cold start and later ones as warm", async () => {
    const { calls } = mockFetch();
    const handler = withBySentinel(async () => {
      throw new Error("x");
    }, baseOpts);

    await handler({}, ctx).catch(() => {});
    await handler({}, ctx).catch(() => {});

    expect(calls[0]!.lambda.coldStart).toBe(true);
    expect(calls[1]!.lambda.coldStart).toBe(false);
  });

  it("redacts secrets in the request body when body capture is enabled", async () => {
    const { calls } = mockFetch();
    const handler = withBySentinel(
      async () => {
        throw new Error("fail");
      },
      { ...baseOpts, capture: { requestBody: true, headers: true } },
    );

    const event = {
      httpMethod: "POST",
      path: "/pay",
      headers: { authorization: "Bearer abc.def.ghi", "content-type": "application/json" },
      body: JSON.stringify({ cpf: "123.456.789-09", cardNumber: "4111111111111111" }),
    };

    await handler(event, ctx).catch(() => {});
    const evt = calls[0]!;
    expect(evt.request?.headers?.authorization).toBe("[REDACTED_AUTHORIZATION]");
    expect((evt.request?.body as any).cpf).toBe("[REDACTED_CPF]");
    expect((evt.request?.body as any).cardNumber).toBe("[REDACTED_CARD]");
  });

  it("captures body-only local Lambda invocation payloads", async () => {
    const { calls } = mockFetch();
    const handler = withBySentinel(
      async () => {
        throw new Error("fail");
      },
      { ...baseOpts, capture: { requestBody: true, headers: true } },
    );

    await handler({ body: JSON.stringify({ amount: 15000 }) }, ctx).catch(() => {});

    const evt = calls[0]!;
    expect(evt.request?.body).toEqual({ amount: 15000 });
    expect(evt.request?.headers).toBeUndefined();
  });

  it("strict mode strips body and headers entirely", async () => {
    const { calls } = mockFetch();
    const handler = withBySentinel(
      async () => {
        throw new Error("fail");
      },
      {
        ...baseOpts,
        capture: { requestBody: true, headers: true },
        security: { strictMode: true },
      },
    );

    await handler(
      { httpMethod: "POST", path: "/pay", headers: { authorization: "Bearer x" }, body: "{}" },
      ctx,
    ).catch(() => {});

    const evt = calls[0]!;
    expect(evt.request?.headers).toBeUndefined();
    expect(evt.request?.body).toBeUndefined();
  });

  it("emits a performance warning when close to timeout", async () => {
    const { calls } = mockFetch();
    const nearTimeoutCtx = { ...ctx, getRemainingTimeInMillis: () => 500 };
    const handler = withBySentinel(async () => "ok", baseOpts);

    await handler({}, nearTimeoutCtx);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.performance?.timeoutRisk).toBe(true);
  });

  it("never throws the SDK's own errors: a broken collector does not break the handler", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const handler = withBySentinel(async () => {
      throw new Error("business error");
    }, baseOpts);

    // The business error propagates; the network failure is swallowed.
    await expect(handler({}, ctx)).rejects.toThrow("business error");
  });

  it("drops oversized events before delivery", async () => {
    const fn = vi.fn();
    vi.stubGlobal("fetch", fn);
    const onError = vi.fn();
    const handler = withBySentinel(
      async () => {
        throw new Error("large");
      },
      {
        ...baseOpts,
        capture: { requestBody: true },
        delivery: { maxEventBytes: 128 },
        onError,
      },
    );

    await handler({ body: JSON.stringify({ payload: "x".repeat(500) }) }, ctx).catch(() => {});

    expect(fn).not.toHaveBeenCalled();
    expect(String(onError.mock.calls[0]?.[0])).toContain("maxEventBytes");
  });

  it("can fan out the sanitized event to direct webhooks", async () => {
    const { calls, requests } = mockFetch();
    const handler = withBySentinel(
      async () => {
        throw new Error("fanout");
      },
      {
        ...baseOpts,
        delivery: {
          webhooks: ["https://webhook.example/a", "https://webhook.example/b"],
        },
      },
    );

    await handler({}, ctx).catch(() => {});

    expect(calls).toHaveLength(3);
    expect(requests.map((request) => request.url)).toEqual([
      "http://collector.local/v1/events",
      "https://webhook.example/a",
      "https://webhook.example/b",
    ]);
    expect(requests[0]!.headers["x-api-key"]).toBe("bsk_test");
    expect(requests[1]!.headers["x-bysentinel-delivery"]).toBe("sdk-webhook");
    expect(calls.every((event) => event.sanitized)).toBe(true);
  });

  it("can deliver to direct webhooks without a collector", async () => {
    const { calls, requests } = mockFetch();
    const handler = withBySentinel(
      async () => {
        throw new Error("webhook only");
      },
      {
        project: "payments-api",
        environment: "test",
        delivery: { webhooks: ["https://webhook.example/only"] },
      },
    );

    await handler({}, ctx).catch(() => {});

    expect(calls).toHaveLength(1);
    expect(requests[0]!.url).toBe("https://webhook.example/only");
    expect(calls[0]!.error?.message).toBe("webhook only");
  });

  it("detects security signals on the raw request (SSRF)", async () => {
    const { calls } = mockFetch();
    const handler = withBySentinel(
      async () => {
        throw new Error("fail");
      },
      { ...baseOpts, capture: { requestBody: true } },
    );
    await handler(
      {
        httpMethod: "POST",
        path: "/fetch",
        body: JSON.stringify({ url: "http://169.254.169.254/" }),
      },
      ctx,
    ).catch(() => {});

    const types = calls[0]!.securitySignals?.map((s) => s.type) ?? [];
    expect(types).toContain("ssrf-like-url");
  });
});

describe("delivery URL", () => {
  it("appends the BySentinel collector path by default", () => {
    expect(buildDeliveryUrl("https://collector.example", "/v1/events")).toBe(
      "https://collector.example/v1/events",
    );
  });

  it("can post to an exact webhook URL", () => {
    expect(buildDeliveryUrl("https://webhook.site/abc", "")).toBe("https://webhook.site/abc");
  });
});

describe("captureException (manual, inside scope)", () => {
  it("inherits project/env from the active handler scope", async () => {
    const { calls } = mockFetch();
    const handler = withBySentinel(async () => {
      await captureException(new Error("manual"), { feature: "pay", step: "charge" });
      return "ok";
    }, baseOpts);

    await handler({}, ctx);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.project).toBe("payments-api");
    expect(calls[0]!.error?.message).toBe("manual");
    expect((calls[0]!.customContext as any).feature).toBe("pay");
  });

  it("does not double-report when a manually-captured error is re-thrown", async () => {
    const { calls } = mockFetch();
    const handler = withBySentinel(async () => {
      try {
        throw new Error("boom");
      } catch (err) {
        await captureException(err, { step: "charge" });
        throw err; // wrapper must NOT capture again
      }
    }, baseOpts);

    await expect(handler({}, ctx)).rejects.toThrow("boom");
    expect(calls).toHaveLength(1);
    expect((calls[0]!.customContext as any).step).toBe("charge");
  });
});
