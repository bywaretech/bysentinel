import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { assertSecureConfig, collectSecurityFindings } from "../src/security.js";
import { createBySentinelServer } from "../src/server.js";

const servers: Array<{ close(): Promise<void> }> = [];
const httpServers: Array<{ close(callback?: (err?: Error) => void): void }> = [];
const dataDirs: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(
    httpServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
  await Promise.all(dataDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("collector server", () => {
  it("receives an event, stores an incident and returns it in the dashboard API", async () => {
    const { baseUrl } = await boot();
    const event = sampleEvent();

    const ingest = await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "bsk_test" },
      body: JSON.stringify(event),
    });

    expect(ingest.status).toBe(202);
    const list = await fetch(`${baseUrl}/api/incidents`, {
      headers: { authorization: `Bearer admin_test` },
    }).then((res) => res.json());
    expect(list).toHaveLength(1);
    expect(list[0].latestEvent.error.message).toBe("provider rejected the charge");
    expect(list[0].analysis.result.summary).toContain("Error");
  });

  it("rejects events without the configured API key", async () => {
    const { baseUrl } = await boot();
    const res = await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sampleEvent()),
    });
    expect(res.status).toBe(401);
  });

  it("rate limits event ingestion by API key", async () => {
    const { baseUrl } = await boot({ COLLECTOR_RATE_LIMIT_PER_MINUTE: "1" });
    const headers = { "content-type": "application/json", "x-api-key": "bsk_test" };

    const first = await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(sampleEvent("evt_rate_1")),
    });
    const second = await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(sampleEvent("evt_rate_2")),
    });

    expect(first.status).toBe(202);
    expect(second.status).toBe(429);
    expect(second.headers.get("x-ratelimit-limit")).toBe("1");
  });

  it("delivers signed webhooks after analysis", async () => {
    const received: Array<{ headers: Headers; body: string }> = [];
    const webhook = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      received.push({
        headers: new Headers(req.headers as Record<string, string>),
        body: Buffer.concat(chunks).toString("utf8"),
      });
      res.writeHead(204);
      res.end();
    });
    httpServers.push(webhook);
    const webhookUrl = await new Promise<string>((resolve) => {
      webhook.listen(0, "127.0.0.1", () => {
        const address = webhook.address();
        if (typeof address === "object" && address) resolve(`http://127.0.0.1:${address.port}`);
      });
    });
    const { baseUrl } = await boot({
      BYSENTINEL_WEBHOOK_URLS: webhookUrl,
      BYSENTINEL_WEBHOOK_SECRET: "whsec_test",
    });

    const ingest = await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "bsk_test" },
      body: JSON.stringify(sampleEvent()),
    });

    expect(ingest.status).toBe(202);
    expect(received).toHaveLength(1);
    expect(received[0]!.headers.get("x-bysentinel-event")).toBe("incident.analyzed");
    expect(received[0]!.headers.get("x-bysentinel-signature")).toMatch(/^sha256=/);
    expect(JSON.parse(received[0]!.body).type).toBe("incident.analyzed");
  });

  it("serves API metadata at root and sends browser hardening headers", async () => {
    const { baseUrl } = await boot();

    const res = await fetch(`${baseUrl}/`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, service: "bysentinel-collector", ingest: "/v1/events" });
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("lets admins configure AI settings without exposing stored API keys", async () => {
    const { baseUrl } = await boot();
    const auth = { authorization: `Bearer admin_test` };

    const saved = await fetch(`${baseUrl}/api/settings/ai`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({
        enabled: true,
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-or-secret",
        timeoutMs: 30_000,
      }),
    }).then((res) => res.json());

    expect(saved).toMatchObject({
      enabled: true,
      provider: "openrouter",
      model: "openai/gpt-4.1-mini",
      hasApiKey: true,
      timeoutMs: 30_000,
    });
    expect(saved.apiKey).toBeUndefined();

    const loaded = await fetch(`${baseUrl}/api/settings/ai`, { headers: auth }).then((res) =>
      res.json(),
    );
    expect(loaded.hasApiKey).toBe(true);
    expect(loaded.apiKey).toBeUndefined();
  });

  it("requires a base URL for enabled local AI providers", async () => {
    const { baseUrl } = await boot();
    const res = await fetch(`${baseUrl}/api/settings/ai`, {
      method: "POST",
      headers: { authorization: `Bearer admin_test`, "content-type": "application/json" },
      body: JSON.stringify({
        enabled: true,
        provider: "ollama",
        model: "qwen2.5:7b",
      }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "ollama provider requires a base URL" });
  });

  it("authenticates seeded users and rejects wrong passwords", async () => {
    const { baseUrl } = await boot({
      BYSENTINEL_DEFAULT_USER: "root",
      BYSENTINEL_DEFAULT_PASSWORD: "s3cure-pass-1",
    });

    const ok = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "root", password: "s3cure-pass-1" }),
    });
    expect(ok.status).toBe(200);
    expect((await ok.json()).user).toMatchObject({ username: "root", role: "admin" });

    const bad = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "root", password: "wrong" }),
    });
    expect(bad.status).toBe(401);

    // Unknown user returns the same generic error (no enumeration).
    const missing = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "ghost", password: "wrong" }),
    });
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ error: "invalid username or password" });
  });

  it("rate limits login attempts", async () => {
    const { baseUrl } = await boot({ COLLECTOR_LOGIN_RATE_LIMIT_PER_MINUTE: "3" });
    const attempt = () =>
      fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "root", password: "nope" }),
      });

    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await attempt()).status);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });

  it("refuses to remove the last admin account", async () => {
    const { baseUrl } = await boot();
    const auth = { authorization: `Bearer admin_test`, "content-type": "application/json" };
    const users = await fetch(`${baseUrl}/api/users`, {
      headers: { authorization: `Bearer admin_test` },
    }).then((r) => r.json());

    const res = await fetch(`${baseUrl}/api/users/${users[0].id}`, {
      method: "DELETE",
      headers: auth,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "cannot remove the last admin account" });
  });
});

describe("production boot guard", () => {
  const secureConfig = () =>
    loadConfig({
      BYSENTINEL_ADMIN_TOKEN: "a".repeat(40),
      BYSENTINEL_API_KEYS: "b".repeat(40),
      BYSENTINEL_DEFAULT_PASSWORD: "a-strong-password",
    });

  it("refuses to start in production with default secrets", () => {
    const config = loadConfig({}); // all dev defaults
    expect(() => assertSecureConfig(config, { NODE_ENV: "production" })).toThrow(
      /insecure defaults in production/,
    );
  });

  it("allows production boot when secrets are set", () => {
    expect(() => assertSecureConfig(secureConfig(), { NODE_ENV: "production" })).not.toThrow();
  });

  it("only warns (never throws) outside production", () => {
    const config = loadConfig({});
    expect(() => assertSecureConfig(config, { NODE_ENV: "development" })).not.toThrow();
  });

  it("honours the explicit override escape hatch", () => {
    const config = loadConfig({});
    expect(() =>
      assertSecureConfig(config, {
        NODE_ENV: "production",
        BYSENTINEL_ALLOW_INSECURE_DEFAULTS: "true",
      }),
    ).not.toThrow();
  });

  it("flags each insecure default field", () => {
    const findings = collectSecurityFindings(loadConfig({}), true);
    const fields = findings.filter((f) => f.level === "fatal").map((f) => f.field);
    expect(fields).toContain("BYSENTINEL_ADMIN_TOKEN");
    expect(fields).toContain("BYSENTINEL_API_KEYS");
    expect(fields).toContain("BYSENTINEL_DEFAULT_PASSWORD");
  });
});

async function boot(overrides: NodeJS.ProcessEnv = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), "bysentinel-"));
  dataDirs.push(dataDir);
  const config = loadConfig({
    COLLECTOR_HOST: "127.0.0.1",
    COLLECTOR_PORT: "0",
    BYSENTINEL_DATA_DIR: dataDir,
    BYSENTINEL_API_KEYS: "bsk_test",
    BYSENTINEL_ADMIN_TOKEN: "admin_test",
    BYSENTINEL_AI_ENABLED: "false",
    ...overrides,
  });
  const server = await createBySentinelServer(config);
  await server.listen();
  servers.push(server);
  return { baseUrl: server.url() };
}

function sampleEvent(id = "evt_test") {
  return {
    id,
    timestamp: "2026-07-06T00:00:00.000Z",
    project: "payment",
    environment: "sandbox",
    runtime: { provider: "aws", service: "lambda", language: "nodejs", version: "20.x" },
    lambda: { functionName: "payment", requestId: "req_1" },
    error: { type: "Error", message: "provider rejected the charge" },
    sanitized: true,
  };
}
