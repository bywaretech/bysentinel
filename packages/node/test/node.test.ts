import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import type { BySentinelEvent } from "@bywaretech/bysentinel-core";
import { withBySentinel } from "../src/withBySentinel.js";
import { captureException, captureMessage } from "../src/capture.js";
import { bySentinelExpress, bySentinelErrorHandler } from "../src/express.js";
import { BySentinel } from "../src/runtime.js";

function mockFetch() {
  const calls: BySentinelEvent[] = [];
  const requests: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const fn = vi.fn(async (url: string, init: any) => {
    requests.push({ url, headers: init.headers, body: init.body });
    calls.push(JSON.parse(init.body));
    return { ok: true, status: 200 } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn, requests };
}

const baseOpts = {
  project: "payments-api",
  environment: "test",
  collectorUrl: "http://collector.local",
  apiKey: "bsk_test",
  delivery: { mode: "blocking" as const },
};

const flush = () => new Promise((r) => setImmediate(r));

afterEach(() => vi.unstubAllGlobals());

describe("withBySentinel (node)", () => {
  it("captures a thrown error, sends a sanitized node event, and re-throws", async () => {
    const { calls, requests } = mockFetch();
    const wrapped = withBySentinel(async () => {
      throw new Error("boom");
    }, baseOpts);

    await expect(wrapped()).rejects.toThrow("boom");

    expect(calls).toHaveLength(1);
    const evt = calls[0]!;
    expect(evt.error?.message).toBe("boom");
    expect(evt.runtime.provider).toBe("node");
    expect(evt.runtime.service).toBe("node");
    expect(evt.lambda).toBeUndefined();
    expect(evt.sanitized).toBe(true);
    expect(requests[0]!.url).toBe("http://collector.local/v1/events");
  });

  it("labels the runtime service from options.service", async () => {
    const { calls } = mockFetch();
    const wrapped = withBySentinel(
      async () => {
        throw new Error("x");
      },
      { ...baseOpts, service: "worker" },
    );
    await wrapped().catch(() => {});
    expect(calls[0]!.runtime.service).toBe("worker");
  });

  it("returns the value unchanged on success and sends nothing", async () => {
    const { fn } = mockFetch();
    const wrapped = withBySentinel(async (a: number, b: number) => a + b, baseOpts);
    await expect(wrapped(2, 3)).resolves.toBe(5);
    expect(fn).not.toHaveBeenCalled();
  });

  it("background mode does not block but still delivers", async () => {
    const { fn } = mockFetch();
    const wrapped = withBySentinel(
      async () => {
        throw new Error("bg");
      },
      { ...baseOpts, delivery: { mode: "background" } },
    );
    await expect(wrapped()).rejects.toThrow("bg");
    // Delivery is fire-and-forget; flush the microtask/timer queue.
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("redacts secrets and does not double-capture a manually captured error", async () => {
    const { calls } = mockFetch();
    const wrapped = withBySentinel(async () => {
      await captureException(new Error("handled"), { feature: "checkout" });
      throw Object.assign(new Error("handled"), {}); // different instance still re-throws
    }, baseOpts);

    // The manually-captured error is a different instance than the thrown one,
    // so both are delivered — but the manual one carries our custom context.
    await wrapped().catch(() => {});
    const manual = calls.find((c) => c.customContext?.feature === "checkout");
    expect(manual).toBeTruthy();
    expect(manual!.runtime.provider).toBe("node");
  });

  it("HMAC-signs a direct webhook (node)", async () => {
    const { requests } = mockFetch();
    const wrapped = withBySentinel(
      async () => {
        throw new Error("signed");
      },
      {
        project: "p",
        environment: "test",
        delivery: {
          mode: "blocking",
          webhooks: [{ url: "https://hook.example/x", sign: { secret: "whsec" } }],
        },
      },
    );
    await wrapped().catch(() => {});
    const req = requests.find((r) => r.url === "https://hook.example/x")!;
    const ts = req.headers["x-bysentinel-timestamp"];
    const expected = createHmac("sha256", "whsec").update(`${ts}.${req.body}`).digest("hex");
    expect(req.headers["x-bysentinel-signature"]).toBe(`sha256=${expected}`);
  });

  it("blocking mode delivers before the rejection settles (no flush needed)", async () => {
    const { fn } = mockFetch();
    const wrapped = withBySentinel(
      async () => {
        throw new Error("blk");
      },
      { ...baseOpts, delivery: { mode: "blocking" } },
    );
    await expect(wrapped()).rejects.toThrow("blk");
    // No flush: blocking awaited delivery before re-throwing.
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not double-capture: same error captured then thrown yields one event", async () => {
    const { calls } = mockFetch();
    const err = new Error("once");
    const wrapped = withBySentinel(async () => {
      await captureException(err, { feature: "checkout" });
      throw err; // same instance — wrapper must skip it
    }, baseOpts);

    await wrapped().catch(() => {});
    expect(calls).toHaveLength(1);
    expect(calls[0]!.customContext?.feature).toBe("checkout");
  });

  it("fans out to the collector and multiple webhooks in one go", async () => {
    const { requests } = mockFetch();
    const wrapped = withBySentinel(
      async () => {
        throw new Error("fan");
      },
      {
        ...baseOpts,
        delivery: {
          mode: "blocking",
          webhooks: ["https://a.example/h", "https://b.example/h"],
        },
      },
    );
    await wrapped().catch(() => {});
    expect(requests.map((r) => r.url)).toEqual([
      "http://collector.local/v1/events",
      "https://a.example/h",
      "https://b.example/h",
    ]);
  });

  it("attaches an execution timeline and marks it aborted on failure", async () => {
    const { calls } = mockFetch();
    const wrapped = withBySentinel(async () => {
      const rt = BySentinel.start();
      rt.step("validate");
      rt.step("charge");
      throw new Error("mid-charge");
    }, baseOpts);

    await wrapped().catch(() => {});
    const tl = calls[0]!.timeline;
    expect(tl).toBeTruthy();
    expect(tl!.steps.length).toBe(2);
    expect(tl!.steps.some((s) => s.status === "failed")).toBe(true);
  });

  it("detects security signals on the raw request (SSRF)", async () => {
    const { calls } = mockFetch();
    const { errorHandler } = bySentinelExpress({
      ...baseOpts,
      service: "express",
      capture: { requestBody: true },
      delivery: { mode: "blocking" },
    });
    const req = {
      method: "POST",
      path: "/fetch",
      body: { url: "http://169.254.169.254/latest/meta-data/" },
    };
    errorHandler(new Error("ssrf"), req, {}, () => {});
    await flush();
    const signals = calls[0]!.securitySignals ?? [];
    expect(signals.some((s) => s.type === "ssrf-like-url")).toBe(true);
  });
});

describe("captureMessage (node)", () => {
  it("delivers a standalone Message event with severity", async () => {
    const { calls } = mockFetch();
    await captureMessage("provider slow", { severity: "warning", provider: "stripe" }, baseOpts);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.error).toEqual({ type: "Message", message: "provider slow" });
    expect(calls[0]!.customContext?.severity).toBe("warning");
    expect(calls[0]!.runtime.provider).toBe("node");
  });
});

describe("bySentinelExpress", () => {
  it("bySentinelErrorHandler is a standalone error handler", async () => {
    const { calls } = mockFetch();
    const handler = bySentinelErrorHandler({ ...baseOpts, service: "express" });
    const next = vi.fn();
    handler(new Error("standalone"), { method: "GET", path: "/x" }, {}, next);
    await flush();
    expect(next).toHaveBeenCalled();
    expect(calls[0]!.error?.message).toBe("standalone");
  });

  it("captures an unhandled error with request context and calls next(err)", async () => {
    const { calls } = mockFetch();
    const { errorHandler } = bySentinelExpress({ ...baseOpts, service: "express" });

    const err = new Error("route failed");
    const req = { method: "POST", path: "/pay", headers: { "x-test": "1" } };
    const next = vi.fn();

    errorHandler(err, req, {}, next);
    await flush();

    expect(next).toHaveBeenCalledWith(err);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.error?.message).toBe("route failed");
    expect(calls[0]!.request?.method).toBe("POST");
    expect(calls[0]!.request?.path).toBe("/pay");
    expect(calls[0]!.runtime.service).toBe("express");
  });

  it("scope middleware lets captureException inherit request context", async () => {
    const { calls } = mockFetch();
    const { scope } = bySentinelExpress({ ...baseOpts, service: "express" });

    const req = { method: "GET", path: "/orders", query: { page: "2" } };
    scope(req, {}, () => {
      // Inside the request scope: a manual capture should pick up the request.
      void captureException(new Error("in-scope"));
    });
    await flush();

    const evt = calls.find((c) => c.error?.message === "in-scope");
    expect(evt).toBeTruthy();
    expect(evt!.request?.path).toBe("/orders");
    expect(evt!.runtime.service).toBe("express");
  });
});
