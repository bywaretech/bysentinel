import type { RequestInfo } from "@bywaretech/bysentinel-core";
import type { ResolvedBaseOptions } from "@bywaretech/bysentinel-core/sdk";

/** A minimal HTTP request shape covering Express, Fastify and Node's http. */
export interface HttpRequestLike {
  method?: string;
  /** Express uses `path`/`originalUrl`; Node's http uses `url`. */
  path?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, unknown>;
  /** Express/Fastify parsed query; may be absent on raw http. */
  query?: Record<string, unknown>;
  /** Parsed body (requires a body parser upstream). */
  body?: unknown;
}

/**
 * Best-effort extraction of request context from a framework request. Capture
 * flags decide which parts are collected; strict mode already forced
 * `requestBody`/`headers` to false in `resolveBaseOptions`. Returns undefined
 * when there is nothing HTTP-ish to record.
 */
export function extractHttpRequest(
  req: HttpRequestLike | undefined,
  options: ResolvedBaseOptions,
): RequestInfo | undefined {
  if (!req || typeof req !== "object") return undefined;

  const method = typeof req.method === "string" ? req.method : undefined;
  const rawPath = req.path ?? req.originalUrl ?? req.url;
  const path = typeof rawPath === "string" ? rawPath.split("?")[0] : undefined;
  const hasHeaders = req.headers && typeof req.headers === "object";
  const hasBody = req.body != null;

  if (!method && !path && !hasHeaders && !(options.capture.requestBody && hasBody)) {
    return undefined;
  }

  const info: RequestInfo = {};
  if (method) info.method = method;
  if (path) info.path = path;

  if (options.capture.query && req.query && typeof req.query === "object") {
    info.query = { ...req.query };
  }
  if (options.capture.headers && hasHeaders) {
    info.headers = { ...(req.headers as Record<string, unknown>) };
  }
  if (options.capture.requestBody && hasBody) {
    info.body = req.body;
  }

  return info;
}
