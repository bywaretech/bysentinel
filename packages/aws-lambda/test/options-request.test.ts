import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isCaptured, markCaptured } from "../src/dedupe.js";
import { extractRequest } from "../src/request.js";
import { currentScope, runWithScope } from "../src/scope.js";
import { resolveOptions } from "../src/options.js";
import type { ResolvedOptions } from "../src/types.js";

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
  "BYSENTINEL_BUILD_TIME",
  "BYSENTINEL_GIT_REPO_URL",
  "GIT_SHA",
  "GITHUB_SHA",
  "GITHUB_REF_NAME",
  "GITHUB_SERVER_URL",
  "GITHUB_REPOSITORY",
  "CI_COMMIT_SHA",
  "CI_COMMIT_BRANCH",
  "CI_PROJECT_URL",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_REF",
  "npm_package_version",
];

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

function baseOptions(overrides: Partial<ResolvedOptions> = {}): ResolvedOptions {
  return {
    ...resolveOptions({ project: "payments-api", environment: "test" }),
    ...overrides,
    capture: {
      ...resolveOptions({ project: "payments-api", environment: "test" }).capture,
      ...overrides.capture,
    },
    security: {
      ...resolveOptions({ project: "payments-api", environment: "test" }).security,
      ...overrides.security,
    },
    delivery: {
      ...resolveOptions({ project: "payments-api", environment: "test" }).delivery,
      ...overrides.delivery,
    },
  };
}

describe("resolveOptions", () => {
  it("uses environment fallbacks and trims direct webhook lists", () => {
    process.env.BYSENTINEL_PROJECT = "env-project";
    process.env.BYSENTINEL_ENVIRONMENT = "staging";
    process.env.BYSENTINEL_RELEASE = "2026.07.07";
    process.env.BYSENTINEL_COLLECTOR_URL = "https://collector.example";
    process.env.BYSENTINEL_API_KEY = "bsk_env";
    process.env.BYSENTINEL_DIRECT_WEBHOOK_URLS =
      " https://hooks.example/a, ,https://hooks.example/b ";

    const options = resolveOptions({} as Parameters<typeof resolveOptions>[0]);

    expect(options.project).toBe("env-project");
    expect(options.environment).toBe("staging");
    expect(options.release).toBe("2026.07.07");
    expect(options.collectorUrl).toBe("https://collector.example");
    expect(options.apiKey).toBe("bsk_env");
    expect(options.delivery.webhooks).toEqual([
      "https://hooks.example/a",
      "https://hooks.example/b",
    ]);
  });

  it("lets explicit options win over env vars", () => {
    process.env.BYSENTINEL_PROJECT = "env-project";
    process.env.BYSENTINEL_ENVIRONMENT = "staging";
    process.env.BYSENTINEL_COLLECTOR_URL = "https://collector.example";
    process.env.BYSENTINEL_API_KEY = "bsk_env";

    const options = resolveOptions({
      project: "explicit-project",
      environment: "prod",
      collectorUrl: "https://collector.internal",
      apiKey: "bsk_explicit",
    });

    expect(options.project).toBe("explicit-project");
    expect(options.environment).toBe("prod");
    expect(options.collectorUrl).toBe("https://collector.internal");
    expect(options.apiKey).toBe("bsk_explicit");
  });

  it("forces body and header capture off in strict mode", () => {
    const options = resolveOptions({
      project: "payments-api",
      environment: "test",
      capture: { requestBody: true, headers: true },
      security: { strictMode: true },
    });

    expect(options.capture.requestBody).toBe(false);
    expect(options.capture.headers).toBe(false);
  });

  it("calls console.debug from the default onError only when debug is enabled", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});

    resolveOptions({ project: "payments-api", environment: "test" }).onError(new Error("quiet"));
    expect(debug).not.toHaveBeenCalled();

    resolveOptions({ project: "payments-api", environment: "test", debug: true }).onError(
      new Error("loud"),
    );
    expect(debug).toHaveBeenCalledWith("[bysentinel] internal error:", expect.any(Error));
  });
});

describe("extractRequest", () => {
  it("normalizes API Gateway v2 method, path, query, headers and JSON body", () => {
    const request = extractRequest(
      {
        requestContext: { http: { method: "POST", path: "/checkout" } },
        queryStringParameters: { cart: "42" },
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: 15000 }),
      },
      baseOptions({ capture: { requestBody: true, headers: true, query: true } }),
    );

    expect(request).toEqual({
      method: "POST",
      path: "/checkout",
      query: { cart: "42" },
      headers: { "content-type": "application/json" },
      body: { amount: 15000 },
    });
  });

  it("prefers multi-value query parameters when present", () => {
    const request = extractRequest(
      {
        httpMethod: "GET",
        path: "/orders",
        multiValueQueryStringParameters: { status: ["open", "paid"] },
        queryStringParameters: { status: "open" },
      },
      baseOptions({ capture: { query: true } }),
    );

    expect(request?.query).toEqual({ status: ["open", "paid"] });
  });

  it("decodes base64 bodies and falls back to raw strings for non-JSON payloads", () => {
    const request = extractRequest(
      {
        httpMethod: "POST",
        path: "/upload",
        body: Buffer.from("plain text").toString("base64"),
        isBase64Encoded: true,
      },
      baseOptions({ capture: { requestBody: true } }),
    );

    expect(request?.body).toBe("plain text");
  });

  it("skips non-HTTP events unless explicit body capture sees a body", () => {
    expect(extractRequest({ source: "aws.events" }, baseOptions())).toBeUndefined();

    expect(
      extractRequest(
        { body: JSON.stringify({ local: true }) },
        baseOptions({ capture: { requestBody: true } }),
      ),
    ).toEqual({ body: { local: true } });
  });
});

describe("scope and captured-error dedupe", () => {
  it("keeps active scope isolated to runWithScope async execution", async () => {
    const scope = {
      options: resolveOptions({ project: "payments-api", environment: "test" }),
      coldStart: true,
    };

    expect(currentScope()).toBeUndefined();
    await expect(runWithScope(scope, async () => currentScope()?.coldStart)).resolves.toBe(true);
    expect(currentScope()).toBeUndefined();
  });

  it("marks captured errors with a non-enumerable symbol", () => {
    const error = new Error("boom");

    markCaptured(error);

    expect(isCaptured(error)).toBe(true);
    expect(Object.keys(error)).not.toContain("bysentinel.captured");
    expect(isCaptured("boom")).toBe(false);
  });

  it("ignores frozen values when marking captured", () => {
    const error = Object.freeze(new Error("frozen"));

    expect(() => markCaptured(error)).not.toThrow();
    expect(isCaptured(error)).toBe(false);
  });
});
