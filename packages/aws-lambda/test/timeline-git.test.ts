import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BySentinelEvent } from "@bysentinel/core";
import { withBySentinel } from "../src/withBySentinel.js";
import { startRuntime, BySentinel } from "../src/runtime.js";
import { __resetColdStart } from "../src/context.js";

const baseOpts = {
  project: "payments-api",
  environment: "test",
  collectorUrl: "http://collector.local",
  apiKey: "bsk_test",
};

function mockFetch() {
  const calls: BySentinelEvent[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: any) => {
      calls.push(JSON.parse(init.body));
      return { ok: true, status: 200 } as Response;
    }),
  );
  return calls;
}

const ctx = {
  functionName: "pay",
  awsRequestId: "req-1",
  memoryLimitInMB: "512",
  getRemainingTimeInMillis: () => 30_000,
};

// Env vars that resolveGitContext reads. Cleared around each test so the
// runner's own vars (e.g. npm_package_version set by pnpm) don't leak in.
const GIT_ENV = [
  "BYSENTINEL_GIT_SHA",
  "BYSENTINEL_GIT_BRANCH",
  "BYSENTINEL_VERSION",
  "BYSENTINEL_RELEASE",
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
  __resetColdStart();
  for (const k of GIT_ENV) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of GIT_ENV) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("execution timeline (roadmap #1/#2/#14)", () => {
  it("attaches the timeline to the captured event and marks the failed step", async () => {
    const calls = mockFetch();
    const handler = withBySentinel(async () => {
      const runtime = startRuntime();
      runtime.step("Validate Request");
      runtime.step("Create Payment");
      runtime.step("Notify ERP");
      throw new Error("provider timeout");
    }, baseOpts);

    await handler({}, ctx).catch(() => {});

    const evt = calls[0]!;
    expect(evt.timeline).toBeDefined();
    expect(evt.timeline!.aborted).toBe(true);
    const steps = evt.timeline!.steps;
    expect(steps.map((s) => s.name)).toEqual([
      "Validate Request",
      "Create Payment",
      "Notify ERP",
    ]);
    // The last step was running when the error was thrown → failed.
    expect(steps.at(-1)!.status).toBe("failed");
  });

  it("exposes the spec-style BySentinel.start() namespace", async () => {
    mockFetch();
    const handler = withBySentinel(async () => {
      const runtime = BySentinel.start();
      runtime.step("only step");
      return "ok";
    }, baseOpts);
    await expect(handler({}, ctx)).resolves.toBe("ok");
  });

  it("redacts sensitive data in timeline step metadata", async () => {
    const calls = mockFetch();
    const handler = withBySentinel(async () => {
      const runtime = startRuntime();
      runtime.step("Charge").annotate({ authorization: "Bearer abc.def.ghi" });
      throw new Error("boom");
    }, baseOpts);

    await handler({}, ctx).catch(() => {});
    const meta = calls[0]!.timeline!.steps[0]!.meta as Record<string, unknown>;
    expect(meta.authorization).toBe("[REDACTED_AUTHORIZATION]");
  });
});

describe("git/release correlation (roadmap #4)", () => {
  it("captures git metadata from BySentinel env vars", async () => {
    process.env.BYSENTINEL_GIT_SHA = "abc1234";
    process.env.BYSENTINEL_GIT_BRANCH = "main";
    process.env.BYSENTINEL_VERSION = "2.4.0";
    process.env.BYSENTINEL_RELEASE = "release-42";

    const calls = mockFetch();
    const handler = withBySentinel(async () => {
      throw new Error("x");
    }, baseOpts);
    await handler({}, ctx).catch(() => {});

    expect(calls[0]!.git).toEqual(
      expect.objectContaining({
        commitSha: "abc1234",
        branch: "main",
        version: "2.4.0",
        release: "release-42",
      }),
    );
  });

  it("falls back to CI provider vars (GitHub Actions)", async () => {
    process.env.GITHUB_SHA = "deadbeef";
    const calls = mockFetch();
    const handler = withBySentinel(async () => {
      throw new Error("x");
    }, baseOpts);
    await handler({}, ctx).catch(() => {});
    expect(calls[0]!.git?.commitSha).toBe("deadbeef");
  });

  it("omits git entirely when nothing is configured", async () => {
    const calls = mockFetch();
    const handler = withBySentinel(async () => {
      throw new Error("x");
    }, baseOpts);
    await handler({}, ctx).catch(() => {});
    expect(calls[0]!.git).toBeUndefined();
  });
});
