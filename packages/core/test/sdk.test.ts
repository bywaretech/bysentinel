import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { resolveBaseOptions, normalizeWebhooks } from "../src/sdk/options.js";
import { resolveGitContext } from "../src/sdk/git.js";
import { markCaptured, isCaptured } from "../src/sdk/dedupe.js";
import { buildEvent, errorToInfo } from "../src/sdk/event.js";
import { sendEvent, deliver, buildDeliveryUrl } from "../src/sdk/transport.js";
import { createCapture } from "../src/sdk/capture.js";
import { runWithScope } from "../src/sdk/scope.js";
import type { ResolvedBaseOptions } from "../src/sdk/types.js";
import type { RuntimeInfo } from "../src/types/event.js";

const RUNTIME: RuntimeInfo = { provider: "node", service: "test", language: "nodejs", version: "x" };

const ENV_KEYS = [
  "BYSENTINEL_PROJECT",
  "BYSENTINEL_ENVIRONMENT",
  "BYSENTINEL_RELEASE",
  "BYSENTINEL_COLLECTOR_URL",
  "BYSENTINEL_API_KEY",
  "BYSENTINEL_DIRECT_WEBHOOK_URLS",
  "BYSENTINEL_GIT_SHA",
  "BYSENTINEL_GIT_BRANCH",
  "BYSENTINEL_VERSION",
  "GITHUB_SHA",
  "GITHUB_REF_NAME",
  "npm_package_version",
];
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function mockFetch(impl?: (url: string, init: any) => any) {
  const requests: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const fn = vi.fn(async (url: string, init: any) => {
    requests.push({ url, headers: init.headers, body: init.body });
    return impl ? impl(url, init) : ({ ok: true, status: 200 } as Response);
  });
  vi.stubGlobal("fetch", fn);
  return { fn, requests };
}

const resolved = (over: Parameters<typeof resolveBaseOptions>[0] = { project: "p", environment: "t" }) =>
  resolveBaseOptions(over);

describe("resolveBaseOptions", () => {
  it("applies defaults", () => {
    const o = resolved();
    expect(o.delivery.mode).toBe("background");
    expect(o.delivery.timeoutMs).toBe(2000);
    expect(o.delivery.endpointPath).toBe("/v1/events");
    expect(o.delivery.webhooks).toEqual([]);
    expect(o.capture.query).toBe(true);
  });

  it("reads env fallbacks and splits the direct webhook list", () => {
    process.env.BYSENTINEL_PROJECT = "envp";
    process.env.BYSENTINEL_COLLECTOR_URL = "https://c.example";
    process.env.BYSENTINEL_DIRECT_WEBHOOK_URLS = " https://a, ,https://b ";
    const o = resolveBaseOptions({} as never);
    expect(o.project).toBe("envp");
    expect(o.collectorUrl).toBe("https://c.example");
    expect(o.delivery.webhooks).toEqual([{ url: "https://a" }, { url: "https://b" }]);
  });

  it("strict mode forces body and header capture off", () => {
    const o = resolveBaseOptions({
      project: "p",
      environment: "t",
      capture: { requestBody: true, headers: true },
      security: { strictMode: true },
    });
    expect(o.capture.requestBody).toBe(false);
    expect(o.capture.headers).toBe(false);
  });

  it("default onError only logs when debug is on", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    resolveBaseOptions({ project: "p", environment: "t" }).onError(new Error("quiet"));
    expect(debug).not.toHaveBeenCalled();
    resolveBaseOptions({ project: "p", environment: "t", debug: true }).onError(new Error("loud"));
    expect(debug).toHaveBeenCalled();
  });
});

describe("normalizeWebhooks", () => {
  it("coerces strings, keeps objects, drops empties and url-less entries", () => {
    expect(
      normalizeWebhooks(
        ["https://a", "", { url: "https://b", auth: { type: "bearer", token: "t" } }, { url: "" }],
        [],
      ),
    ).toEqual([{ url: "https://a" }, { url: "https://b", auth: { type: "bearer", token: "t" } }]);
  });

  it("falls back to the env URL list when webhooks is undefined", () => {
    expect(normalizeWebhooks(undefined, ["https://fallback"])).toEqual([{ url: "https://fallback" }]);
  });
});

describe("resolveGitContext", () => {
  it("reads env vars and prefers overrides", () => {
    process.env.BYSENTINEL_GIT_SHA = "abc";
    process.env.GITHUB_REF_NAME = "main";
    const git = resolveGitContext({ version: "1.2.3" });
    expect(git?.commitSha).toBe("abc");
    expect(git?.branch).toBe("main");
    expect(git?.version).toBe("1.2.3");
  });

  it("returns undefined when nothing is known", () => {
    expect(resolveGitContext()).toBeUndefined();
  });
});

describe("dedupe", () => {
  it("marks and detects captured errors without enumerable keys", () => {
    const e = new Error("x");
    expect(isCaptured(e)).toBe(false);
    markCaptured(e);
    expect(isCaptured(e)).toBe(true);
    expect(Object.keys(e)).not.toContain("bysentinel.captured");
    expect(isCaptured("string")).toBe(false);
  });
});

describe("errorToInfo", () => {
  it("maps Error and non-Error inputs", () => {
    expect(errorToInfo(new TypeError("boom"), true).type).toBe("TypeError");
    expect(errorToInfo(new Error("s"), false).stack).toBeUndefined();
    expect(errorToInfo("nope", true)).toEqual({ type: "NonError", message: "nope" });
  });
});

describe("buildEvent", () => {
  it("assembles a sanitized event with injected runtime and optional lambda", () => {
    const o = resolved({ project: "pay", environment: "prod", release: "r1" });
    const event = buildEvent({ options: o, runtime: RUNTIME, error: new Error("boom") });
    expect(event.runtime).toEqual(RUNTIME);
    expect(event.lambda).toBeUndefined();
    expect(event.project).toBe("pay");
    expect(event.release).toBe("r1");
    expect(event.error?.message).toBe("boom");
    expect(event.sanitized).toBe(true);
  });

  it("detects signals on the raw request, then redacts it", () => {
    const o = resolveBaseOptions({ project: "p", environment: "t", capture: { requestBody: true } });
    const event = buildEvent({
      options: o,
      runtime: RUNTIME,
      request: {
        method: "POST",
        path: "/fetch",
        body: { url: "http://169.254.169.254/latest/meta-data/", cardNumber: "4111111111111111" },
      },
    });
    // The card number is redacted in the stored request...
    expect((event.request?.body as any).cardNumber).toBe("[REDACTED_CARD]");
    // ...but the SSRF signal was detected on the raw request first.
    expect(event.securitySignals?.some((s) => s.type === "ssrf-like-url")).toBe(true);
  });

  it("forwards AI metadata into customContext when ai is set", () => {
    const o = resolveBaseOptions({
      project: "p",
      environment: "t",
      ai: { enabled: true, provider: "openrouter", model: "m" },
    });
    const event = buildEvent({ options: o, runtime: RUNTIME });
    expect((event.customContext as any).__bysentinel.ai.provider).toBe("openrouter");
  });
});

describe("transport", () => {
  it("buildDeliveryUrl joins base and path, or returns base when path is empty", () => {
    expect(buildDeliveryUrl("https://c/", "/v1/events")).toBe("https://c/v1/events");
    expect(buildDeliveryUrl("https://c", "v1/events")).toBe("https://c/v1/events");
    expect(buildDeliveryUrl("https://hook.site/abc", "")).toBe("https://hook.site/abc");
  });

  it("drops events larger than maxEventBytes", async () => {
    const onError = vi.fn();
    const o: ResolvedBaseOptions = { ...resolved(), delivery: { ...resolved().delivery, maxEventBytes: 10 }, onError };
    const { fn } = mockFetch();
    const res = await sendEvent(o, buildEvent({ options: o, runtime: RUNTIME, error: new Error("big") }));
    expect(res.delivered).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(String(onError.mock.calls[0]?.[0])).toContain("maxEventBytes");
  });

  it("errors when there are no targets", async () => {
    const onError = vi.fn();
    const o = { ...resolved(), onError };
    const res = await sendEvent(o, buildEvent({ options: o, runtime: RUNTIME }));
    expect(res.delivered).toBe(false);
    expect(String(onError.mock.calls[0]?.[0])).toContain("not configured");
  });

  it("sends to the collector with api key, and to webhooks with auth + signature", async () => {
    const { requests } = mockFetch();
    const o = resolveBaseOptions({
      project: "p",
      environment: "t",
      collectorUrl: "https://c",
      apiKey: "bsk",
      delivery: {
        webhooks: [
          {
            url: "https://h",
            auth: { type: "basic", username: "u", password: "p" },
            sign: { secret: "whsec" },
            headers: { "x-tenant": "acme" },
          },
        ],
      },
    });
    await sendEvent(o, buildEvent({ options: o, runtime: RUNTIME, error: new Error("e") }));

    const collector = requests.find((r) => r.url === "https://c/v1/events")!;
    expect(collector.headers["x-api-key"]).toBe("bsk");

    const hook = requests.find((r) => r.url === "https://h")!;
    expect(hook.headers.authorization).toBe(`Basic ${Buffer.from("u:p").toString("base64")}`);
    expect(hook.headers["x-tenant"]).toBe("acme");
    expect(hook.headers["x-bysentinel-delivery"]).toBe("sdk-webhook");
    const ts = hook.headers["x-bysentinel-timestamp"];
    const sig = createHmac("sha256", "whsec").update(`${ts}.${hook.body}`).digest("hex");
    expect(hook.headers["x-bysentinel-signature"]).toBe(`sha256=${sig}`);
  });

  it("retries a 5xx and succeeds; a 4xx is not retried", async () => {
    // 5xx then 200 with one retry.
    let n = 0;
    const retry = mockFetch(() => (n++ === 0 ? { ok: false, status: 503 } : { ok: true, status: 200 }));
    const o5 = resolveBaseOptions({ project: "p", environment: "t", collectorUrl: "https://c", delivery: { retries: 1 } });
    const r5 = await sendEvent(o5, buildEvent({ options: o5, runtime: RUNTIME }));
    expect(r5.delivered).toBe(true);
    expect(retry.fn).toHaveBeenCalledTimes(2);

    // 4xx: single attempt, not delivered.
    vi.unstubAllGlobals();
    const onError = vi.fn();
    const bad = mockFetch(() => ({ ok: false, status: 400 }));
    const o4 = { ...resolveBaseOptions({ project: "p", environment: "t", collectorUrl: "https://c", delivery: { retries: 3 } }), onError };
    const r4 = await sendEvent(o4, buildEvent({ options: o4, runtime: RUNTIME }));
    expect(r4.delivered).toBe(false);
    expect(bad.fn).toHaveBeenCalledTimes(1);
  });

  it("deliver swallows errors", async () => {
    mockFetch(() => {
      throw new Error("network down");
    });
    const o = resolveBaseOptions({ project: "p", environment: "t", collectorUrl: "https://c" });
    await expect(deliver(o, buildEvent({ options: o, runtime: RUNTIME }))).resolves.toBeUndefined();
  });
});

describe("createCapture", () => {
  it("captureException outside a scope uses the default runtime and overrides", async () => {
    const { requests } = mockFetch();
    const { captureException } = createCapture(RUNTIME);
    await captureException(new Error("standalone"), { feature: "x" }, {
      project: "p",
      environment: "t",
      collectorUrl: "https://c",
    });
    const evt = JSON.parse(requests[0]!.body);
    expect(evt.runtime.provider).toBe("node");
    expect(evt.error.message).toBe("standalone");
    expect(evt.customContext.feature).toBe("x");
  });

  it("captureMessage emits a Message event with severity", async () => {
    const { requests } = mockFetch();
    const { captureMessage } = createCapture(RUNTIME);
    await captureMessage("slow", { severity: "warning" }, { project: "p", environment: "t", collectorUrl: "https://c" });
    const evt = JSON.parse(requests[0]!.body);
    expect(evt.error).toEqual({ type: "Message", message: "slow" });
    expect(evt.customContext.severity).toBe("warning");
  });

  it("inside a scope it inherits the scope options, runtime and request", async () => {
    const { requests } = mockFetch();
    const o = resolveBaseOptions({ project: "scoped", environment: "t", collectorUrl: "https://c" });
    const { captureException } = createCapture(RUNTIME);
    await runWithScope(
      { options: o, runtime: { provider: "aws", service: "lambda", language: "nodejs", version: "1" }, request: { path: "/scoped" } },
      async () => captureException(new Error("in-scope")),
    );
    const evt = JSON.parse(requests[0]!.body);
    expect(evt.project).toBe("scoped");
    expect(evt.runtime.service).toBe("lambda");
    expect(evt.request.path).toBe("/scoped");
  });
});
