import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { BySentinelEvent } from "@bywaretech/bysentinel-core";
import type { GitRepositoryConfig } from "./gitops.js";

export interface SandboxSettings {
  enabled: boolean;
  /** LocalStack-compatible endpoint, e.g. http://ministack:4566 */
  ministackUrl: string;
  region: string;
  /** Lambda runtime used for simulated functions. */
  runtime: string;
  timeoutMs: number;
}

export interface SimulationRun {
  status: "ok" | "error";
  functionName: string;
  commitSha: string;
  handler: string;
  /** Payload sent to the simulated function. */
  payload: unknown;
  /** Raw (truncated) function response body. */
  response?: string;
  functionError?: string;
  /** Tail of the CloudWatch-style execution log. */
  logs?: string;
  error?: string;
  durationMs: number;
  createdAt: string;
}

export const DEFAULT_SANDBOX_SETTINGS: SandboxSettings = {
  enabled: false,
  ministackUrl: "http://ministack:4566",
  region: "us-east-1",
  runtime: "nodejs20.x",
  timeoutMs: 60_000,
};

export function normalizeSandboxSettings(input: unknown, current: SandboxSettings): SandboxSettings {
  if (typeof input !== "object" || input === null) throw new Error("settings must be an object");
  const r = input as Record<string, unknown>;
  const url = typeof r.ministackUrl === "string" ? r.ministackUrl.trim() : current.ministackUrl;
  if (url) {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("ministack URL must use http or https");
    }
  }
  const timeoutMs = Number(r.timeoutMs ?? current.timeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 5000 || timeoutMs > 300_000) {
    throw new Error("timeout must be between 5000 and 300000 ms");
  }
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : current.enabled,
    ministackUrl: url.replace(/\/$/, ""),
    region: typeof r.region === "string" && r.region.trim() ? r.region.trim() : current.region,
    runtime: typeof r.runtime === "string" && r.runtime.trim() ? r.runtime.trim() : current.runtime,
    timeoutMs: Math.trunc(timeoutMs),
  };
}

/**
 * Package the repository source and run it once on ministack with the
 * incident's sanitized request payload, so the failure can be reproduced
 * locally without touching production.
 */
export async function simulateIncident(options: {
  settings: SandboxSettings;
  repo: GitRepositoryConfig;
  repoDir: string;
  commitSha: string;
  event: BySentinelEvent;
}): Promise<SimulationRun> {
  const { settings, repo, repoDir, commitSha, event } = options;
  const startedAt = Date.now();
  const handler = repo.handler || "index.handler";
  const functionName = `bs-sim-${safeName(event.project)}-${commitSha.slice(0, 8)}`;
  const payload = buildInvokePayload(event);

  const base: Omit<SimulationRun, "status"> = {
    functionName,
    commitSha,
    handler,
    payload,
    durationMs: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    const sourceRoot = repo.sourceDir ? join(repoDir, repo.sourceDir) : repoDir;
    const zip = await zipDirectory(sourceRoot);
    const client = new MinistackLambdaClient(settings);

    await client.ensureFunction(functionName, handler, zip);
    await client.waitUntilActive(functionName);
    const result = await client.invoke(functionName, payload);

    return {
      ...base,
      status: result.functionError ? "error" : "ok",
      response: truncate(result.body, 8_000),
      functionError: result.functionError,
      logs: truncate(result.logs, 12_000),
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ...base,
      status: "error",
      error: error instanceof Error ? error.message : "simulation failed",
      durationMs: Date.now() - startedAt,
    };
  }
}

/** Shape the sanitized request info as an API Gateway-style proxy event. */
function buildInvokePayload(event: BySentinelEvent): unknown {
  const request = event.request;
  if (!request) return { bysentinelReplay: true, incidentId: event.id };
  return {
    bysentinelReplay: true,
    httpMethod: request.method ?? "POST",
    path: request.path ?? "/",
    headers: request.headers ?? {},
    queryStringParameters: request.query ?? {},
    body: typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? null),
  };
}

class MinistackLambdaClient {
  constructor(private readonly settings: SandboxSettings) {}

  private headers(): Record<string, string> {
    // LocalStack-compatible endpoints parse but do not verify SigV4.
    const date = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
    return {
      "content-type": "application/json",
      "x-amz-date": date,
      authorization: `AWS4-HMAC-SHA256 Credential=bysentinel/${date.slice(0, 8)}/${this.settings.region}/lambda/aws4_request, SignedHeaders=host;x-amz-date, Signature=bysentinel-simulated`,
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.settings.timeoutMs);
    try {
      return await fetch(`${this.settings.ministackUrl}${path}`, {
        method,
        headers: { ...this.headers(), ...extraHeaders },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "network error";
      throw new Error(`cannot reach ministack at ${this.settings.ministackUrl}: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async ensureFunction(name: string, handler: string, zip: Buffer): Promise<void> {
    const create = await this.request("POST", "/2015-03-31/functions", {
      FunctionName: name,
      Runtime: this.settings.runtime,
      Handler: handler,
      Role: "arn:aws:iam::000000000000:role/bysentinel-sim",
      Timeout: 30,
      MemorySize: 512,
      Code: { ZipFile: zip.toString("base64") },
    });
    if (create.ok) return;
    if (create.status === 409) {
      const update = await this.request(
        "PUT",
        `/2015-03-31/functions/${encodeURIComponent(name)}/code`,
        { ZipFile: zip.toString("base64") },
      );
      if (!update.ok) throw new Error(`ministack rejected code update (${update.status})`);
      return;
    }
    throw new Error(`ministack rejected function create (${create.status}): ${truncate(await create.text(), 300)}`);
  }

  async waitUntilActive(name: string): Promise<void> {
    for (let attempt = 0; attempt < 30; attempt++) {
      const res = await this.request("GET", `/2015-03-31/functions/${encodeURIComponent(name)}`);
      if (res.ok) {
        const info = (await res.json()) as { Configuration?: { State?: string; LastUpdateStatus?: string } };
        const state = info.Configuration?.State;
        const update = info.Configuration?.LastUpdateStatus;
        if (state === "Active" && update !== "InProgress") return;
        if (state === "Failed") throw new Error("simulated function failed to start on ministack");
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    throw new Error("timed out waiting for the simulated function to become active");
  }

  async invoke(
    name: string,
    payload: unknown,
  ): Promise<{ body: string; logs?: string; functionError?: string }> {
    const res = await this.request(
      "POST",
      `/2015-03-31/functions/${encodeURIComponent(name)}/invocations`,
      payload,
      { "x-amz-log-type": "Tail" },
    );
    const body = await res.text();
    if (!res.ok && res.status !== 200) {
      throw new Error(`invoke failed (${res.status}): ${truncate(body, 300)}`);
    }
    const logsHeader = res.headers.get("x-amz-log-result");
    return {
      body,
      logs: logsHeader ? Buffer.from(logsHeader, "base64").toString("utf8") : undefined,
      functionError: res.headers.get("x-amz-function-error") ?? undefined,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Minimal ZIP writer (STORE method, no external deps).                */
/* ------------------------------------------------------------------ */

const MAX_ZIP_BYTES = 8 * 1024 * 1024;
const SKIP_DIRS = new Set(["node_modules", ".git", ".turbo", "dist-packs", "coverage"]);

export async function zipDirectory(root: string): Promise<Buffer> {
  const entries: { path: string; data: Buffer }[] = [];
  let total = 0;

  async function walk(dir: string): Promise<void> {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      if (item.isDirectory()) {
        if (!SKIP_DIRS.has(item.name)) await walk(join(dir, item.name));
        continue;
      }
      if (!item.isFile()) continue;
      const full = join(dir, item.name);
      const info = await stat(full);
      if (total + info.size > MAX_ZIP_BYTES) {
        throw new Error("source directory exceeds the 8MB sandbox package limit");
      }
      total += info.size;
      entries.push({ path: relative(root, full).replace(/\\/g, "/"), data: await readFile(full) });
    }
  }
  await walk(root);
  if (!entries.length) throw new Error("no files found to package for the sandbox");

  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.path, "utf8");
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // utf-8 flag
    local.writeUInt16LE(0, 8); // method: store
    local.writeUInt32LE(0, 10); // dos time/date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attrs (unix perms)
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + entry.data.length;
  }

  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, ...centrals, end]);
}

let CRC_TABLE: Uint32Array | undefined;
function crc32(data: Buffer): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  return value.length > max ? value.slice(0, max) + "\n... [truncated]" : value;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 40);
}
