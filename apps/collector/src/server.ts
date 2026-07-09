import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  fingerprint,
  DEFAULT_SECURITY_OPTIONS,
  redact,
  type BySentinelEvent,
} from "@bywaretech/bysentinel-core";
import { analyzeRecord } from "./analyzer.js";
import type { CollectorConfig } from "./config.js";
import {
  DEFAULT_GIT_SETTINGS,
  extractSourceContext,
  normalizeGitSettings,
  publicGitSettings,
  syncRepoAtSha,
} from "./gitops.js";
import { FixedWindowRateLimiter } from "./rateLimit.js";
import { DEFAULT_SANDBOX_SETTINGS, normalizeSandboxSettings, simulateIncident } from "./sandbox.js";
import { normalizeAISettings, publicAISettings } from "./settings.js";
import { FileStore, type IncidentRecord } from "./storage.js";
import {
  DUMMY_PASSWORD_HASH,
  createUser,
  isLastAdmin,
  publicUser,
  verifyPassword,
} from "./users.js";
import { deliverWebhooks } from "./webhooks.js";

export interface BySentinelServer {
  listen(): Promise<void>;
  url(): string;
  close(): Promise<void>;
}

export async function createBySentinelServer(config: CollectorConfig): Promise<BySentinelServer> {
  const store = new FileStore(config.dataDir);
  const rateLimiter = new FixedWindowRateLimiter(config.rateLimitPerMinute);
  // Stricter, separate budget for authentication attempts.
  const loginLimiter = new FixedWindowRateLimiter(config.loginRateLimitPerMinute);
  await store.init(config.ai);

  // First boot: seed the default admin account so the team can sign in with
  // a username/password (change BYSENTINEL_DEFAULT_USER/PASSWORD before
  // installing, or rotate the account from the dashboard afterwards).
  if ((await store.listUsers()).length === 0) {
    try {
      await store.addUser(
        createUser(
          {
            username: config.defaultUser.username,
            password: config.defaultUser.password,
            role: "admin",
          },
          [],
        ),
      );
      console.log(`[bysentinel] seeded default admin user "${config.defaultUser.username}"`);
    } catch (error) {
      console.error(
        "[bysentinel] could not seed the default user:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const server = createServer(async (req, res) => {
    try {
      applyCors(req, res, config);
      applySecurityHeaders(res);
      if (req.method === "OPTIONS") return send(res, 204, "");
      if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true });
      if (req.method === "GET" && req.url === "/") {
        return json(res, 200, {
          ok: true,
          service: "bysentinel-collector",
          message: "Collector API only. Open the BySentinel dashboard service for the UI.",
          ingest: "/v1/events",
          health: "/health",
        });
      }
      // Public (it IS the authentication step): username/password login.
      // Rate limited per-username plus a global backstop, since behind a proxy
      // every attempt shares one source address.
      if (req.method === "POST" && req.url === "/api/auth/login") {
        const body = (await readJson(req, config.maxBodyBytes)) as {
          username?: string;
          password?: string;
        };
        const username =
          typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";

        const perUser = loginLimiter.hit(`login:${username || "unknown"}`);
        const global = loginLimiter.hit("login:*global*");
        if (!perUser.allowed || !global.allowed) {
          return json(res, 429, { error: "too many login attempts, try again in a minute" });
        }

        // Constant-work verification: hash against a dummy when the user is
        // missing so response timing does not reveal whether it exists.
        const user = (await store.listUsers()).find((u) => u.username === username);
        const matches = verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !matches) {
          return json(res, 401, { error: "invalid username or password" });
        }
        return json(res, 200, { ok: true, user: publicUser(user) });
      }

      if (req.url?.startsWith("/api/") && !adminAuthorized(req, config)) return adminChallenge(res);
      if (req.method === "GET" && req.url === "/api/incidents")
        return json(res, 200, await store.listIncidents());

      if (req.method === "GET" && req.url === "/api/users") {
        return json(res, 200, (await store.listUsers()).map(publicUser));
      }
      if (req.method === "POST" && req.url === "/api/users") {
        const body = await readJson(req, config.maxBodyBytes);
        const user = createUser(body, await store.listUsers());
        return json(res, 201, publicUser(await store.addUser(user)));
      }
      const userMatch = req.url?.match(/^\/api\/users\/([^/]+)$/);
      if (req.method === "DELETE" && userMatch?.[1]) {
        const id = decodeURIComponent(userMatch[1]);
        if (isLastAdmin(await store.listUsers(), id)) {
          return json(res, 400, { error: "cannot remove the last admin account" });
        }
        const removed = await store.removeUser(id);
        return removed ? json(res, 200, { ok: true }) : json(res, 404, { error: "user not found" });
      }

      if (req.method === "GET" && req.url === "/api/settings/git") {
        return json(res, 200, publicGitSettings(await store.getGitSettings(DEFAULT_GIT_SETTINGS)));
      }
      if (req.method === "POST" && req.url === "/api/settings/git") {
        const current = await store.getGitSettings(DEFAULT_GIT_SETTINGS);
        const body = await readJson(req, config.maxBodyBytes);
        const settings = normalizeGitSettings(body, current);
        return json(res, 200, publicGitSettings(await store.saveGitSettings(settings)));
      }

      if (req.method === "GET" && req.url === "/api/settings/sandbox") {
        return json(res, 200, await store.getSandboxSettings(DEFAULT_SANDBOX_SETTINGS));
      }
      if (req.method === "POST" && req.url === "/api/settings/sandbox") {
        const current = await store.getSandboxSettings(DEFAULT_SANDBOX_SETTINGS);
        const body = await readJson(req, config.maxBodyBytes);
        const settings = normalizeSandboxSettings(body, current);
        return json(res, 200, await store.saveSandboxSettings(settings));
      }

      const contextMatch = req.url?.match(/^\/api\/incidents\/([^/]+)\/context$/);
      if (req.method === "POST" && contextMatch?.[1]) {
        const incident = await store.getIncident(contextMatch[1]);
        if (!incident) return json(res, 404, { error: "incident not found" });
        const { repo, commitSha } = await resolveRepo(store, incident, config);
        const repoDir = await syncRepoAtSha(repo, commitSha, config.dataDir);
        const context = await extractSourceContext(
          repo,
          repoDir,
          commitSha,
          incident.latestEvent.error?.stack,
          incident.analysis?.result.affectedArea?.file
            ? [incident.analysis.result.affectedArea.file]
            : [],
        );
        return json(res, 200, await store.saveSourceContext(incident.id, context));
      }

      const simulateMatch = req.url?.match(/^\/api\/incidents\/([^/]+)\/simulate$/);
      if (req.method === "POST" && simulateMatch?.[1]) {
        const incident = await store.getIncident(simulateMatch[1]);
        if (!incident) return json(res, 404, { error: "incident not found" });
        const sandbox = await store.getSandboxSettings(DEFAULT_SANDBOX_SETTINGS);
        if (!sandbox.enabled) {
          return json(res, 400, { error: "sandbox is disabled. Enable it in Settings > Sandbox" });
        }
        const { repo, commitSha } = await resolveRepo(store, incident, config);
        const repoDir = await syncRepoAtSha(repo, commitSha, config.dataDir);
        const run = await simulateIncident({
          settings: sandbox,
          repo,
          repoDir,
          commitSha,
          event: incident.latestEvent,
        });
        return json(res, 200, await store.saveSimulation(incident.id, run));
      }

      if (req.method === "GET" && req.url === "/api/settings/ai") {
        const settings = await store.getAISettings(config.ai);
        return json(res, 200, publicAISettings(settings));
      }

      if (req.method === "POST" && req.url === "/api/settings/ai") {
        const current = await store.getAISettings(config.ai);
        const body = await readJson(req, config.maxBodyBytes);
        const settings = normalizeAISettings(body, current);
        return json(res, 200, publicAISettings(await store.saveAISettings(settings)));
      }

      const incidentMatch = req.url?.match(/^\/api\/incidents\/([^/]+)$/);
      if (req.method === "GET" && incidentMatch?.[1]) {
        const incident = await store.getIncident(incidentMatch[1]);
        return incident
          ? json(res, 200, incident)
          : json(res, 404, { error: "incident not found" });
      }

      const analyzeMatch = req.url?.match(/^\/api\/incidents\/([^/]+)\/analyze$/);
      if (req.method === "POST" && analyzeMatch?.[1]) {
        const incident = await store.getIncident(analyzeMatch[1]);
        if (!incident) return json(res, 404, { error: "incident not found" });
        const aiSettings = await store.getAISettings(config.ai);
        const analysis = await analyzeRecord(incident, aiSettings);
        return json(res, 200, await store.saveAnalysis(incident.id, analysis));
      }

      if (req.method === "POST" && req.url === "/v1/events") {
        const apiKey = apiKeyFrom(req);
        if (!apiKey || !authorizedApiKey(apiKey, config))
          return json(res, 401, { error: "invalid api key" });
        const rate = rateLimiter.hit(apiKey);
        res.setHeader("x-ratelimit-limit", String(config.rateLimitPerMinute));
        res.setHeader("x-ratelimit-remaining", String(rate.remaining));
        res.setHeader("x-ratelimit-reset", String(Math.ceil(rate.resetAt / 1000)));
        if (!rate.allowed) return json(res, 429, { error: "rate limit exceeded" });
        const body = await readJson(req, config.maxBodyBytes);
        const event = normalizeEvent(body);
        const clean = redact(event, DEFAULT_SECURITY_OPTIONS) as BySentinelEvent;
        clean.sanitized = true;
        const incidentFingerprint = fingerprint({
          project: clean.project,
          environment: clean.environment,
          error: clean.error,
          functionName: clean.lambda?.functionName,
        });
        const incident = await store.upsertEvent(clean, incidentFingerprint);
        const aiSettings = await store.getAISettings(config.ai);
        const analysis = await analyzeRecord(incident, aiSettings);
        const analyzed = await store.saveAnalysis(incident.id, analysis);
        if (analyzed)
          await deliverWebhooks(config.webhooks, {
            type: "incident.analyzed",
            incident: analyzed,
            analysis,
          });
        return json(res, 202, {
          ok: true,
          incidentId: incident.id,
          fingerprint: incident.fingerprint,
        });
      }

      return json(res, 404, { error: "not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "internal error";
      return json(res, statusFromError(message), { error: message });
    }
  });

  return {
    listen: () =>
      new Promise((resolve) => {
        server.listen(config.port, config.host, resolve);
      }),
    url: () => {
      const address = server.address() as AddressInfo | null;
      return `http://${config.host}:${address?.port ?? config.port}`;
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function resolveRepo(store: FileStore, incident: IncidentRecord, config: CollectorConfig) {
  const settings = await store.getGitSettings(DEFAULT_GIT_SETTINGS);
  const repo = settings.repositories.find((r) => r.project === incident.project);
  if (!repo) {
    throw new Error(
      `no repository configured for project "${incident.project}". Add one in Settings > Git`,
    );
  }
  const commitSha = incident.latestEvent.git?.commitSha;
  if (!commitSha) {
    throw new Error(
      "incident has no commit SHA. Configure git correlation in the SDK (BYSENTINEL_COMMIT_SHA)",
    );
  }
  void config;
  return { repo, commitSha };
}

function apiKeyFrom(req: IncomingMessage): string | undefined {
  const key = req.headers["x-api-key"];
  return typeof key === "string" ? key : undefined;
}

function authorizedApiKey(key: string, config: CollectorConfig): boolean {
  return config.apiKeys.some((candidate) => safeEqual(candidate, key));
}

function adminAuthorized(req: IncomingMessage, config: CollectorConfig): boolean {
  const auth = req.headers.authorization;
  const headerToken = req.headers["x-bysentinel-admin-token"];
  if (typeof headerToken === "string" && safeEqual(config.adminToken, headerToken)) return true;
  if (!auth) return false;
  if (auth.startsWith("Bearer ")) return safeEqual(config.adminToken, auth.slice("Bearer ".length));
  if (!auth.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(auth.slice("Basic ".length), "base64").toString("utf8");
    const token = decoded.includes(":") ? decoded.split(":").slice(1).join(":") : decoded;
    return safeEqual(config.adminToken, token);
  } catch {
    return false;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

function statusFromError(message: string): number {
  if (message.includes("too large")) return 413;
  if (
    message.includes("settings must") ||
    message.includes("unsupported AI provider") ||
    message.includes("requires a base URL") ||
    message.includes("must use http or https") ||
    message.includes("timeout must") ||
    message.includes("too long") ||
    message.includes("username must") ||
    message.includes("username already") ||
    message.includes("password must") ||
    message.includes("user must be") ||
    message.includes("repository") ||
    message.includes("no repository configured") ||
    message.includes("commit SHA") ||
    message.includes("sandbox") ||
    message.includes("ministack") ||
    message.includes("git fetch failed")
  ) {
    return 400;
  }
  return 500;
}

function adminChallenge(res: ServerResponse): void {
  res.setHeader("www-authenticate", 'Basic realm="BySentinel"');
  json(res, 401, { error: "admin authentication required" });
}

async function readJson(req: IncomingMessage, limit: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > limit) throw new Error("request body too large");
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function normalizeEvent(input: unknown): BySentinelEvent {
  if (typeof input !== "object" || input === null) throw new Error("event must be an object");
  const event = input as BySentinelEvent;
  if (
    !event.id ||
    !event.timestamp ||
    !event.project ||
    !event.environment ||
    !event.runtime
  ) {
    throw new Error("invalid BySentinel event");
  }
  if (event.sanitized !== true) throw new Error("event must be sanitized");
  return event;
}

function applyCors(req: IncomingMessage, res: ServerResponse, config: CollectorConfig): void {
  const origin = req.headers.origin;
  const allowAny = config.corsOrigins.includes("*");
  const allowed = typeof origin === "string" && (allowAny || config.corsOrigins.includes(origin));
  res.setHeader(
    "access-control-allow-origin",
    allowed ? origin : allowAny ? "*" : (config.corsOrigins[0] ?? "*"),
  );
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,x-api-key,x-bysentinel-event-id");
}

function applySecurityHeaders(res: ServerResponse): void {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("cross-origin-opener-policy", "same-origin");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  send(res, status, JSON.stringify(body), "application/json; charset=utf-8");
}

function send(
  res: ServerResponse,
  status: number,
  body: string,
  contentType = "text/plain; charset=utf-8",
): void {
  res.writeHead(status, { "content-type": contentType });
  res.end(body);
}
