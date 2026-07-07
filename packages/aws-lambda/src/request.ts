import type { RequestInfo } from "@bywaretech/bysentinel-core";
import type { ResolvedOptions } from "./types.js";

/**
 * Best-effort extraction of HTTP request context from common Lambda event
 * shapes: API Gateway REST (v1), HTTP API (v2), and ALB. Non-HTTP events yield
 * an empty object.
 *
 * Capture flags decide which parts are collected; strict mode already forced
 * `requestBody`/`headers` to false in `resolveOptions`.
 */
export function extractRequest(event: unknown, options: ResolvedOptions): RequestInfo | undefined {
  if (!event || typeof event !== "object") return undefined;
  const e = event as Record<string, any>;

  const method: string | undefined =
    e.httpMethod ?? e.requestContext?.http?.method ?? e.requestContext?.httpMethod;
  const path: string | undefined = e.path ?? e.rawPath ?? e.requestContext?.http?.path;

  const hasHeaders = e.headers && typeof e.headers === "object";
  const hasBody = e.body != null;

  // If it doesn't look like an HTTP-ish event, skip request context entirely.
  // Some local Lambda invocations provide only `{ body }`, so keep body-only
  // events when explicit body capture is enabled.
  if (!method && !path && !hasHeaders && !(options.capture.requestBody && hasBody)) {
    return undefined;
  }

  const info: RequestInfo = {};
  if (method) info.method = method;
  if (path) info.path = path;

  if (options.capture.query) {
    info.query = normalizeQuery(e);
  }
  if (options.capture.headers && hasHeaders) {
    info.headers = { ...e.headers };
  }
  if (options.capture.requestBody && hasBody) {
    info.body = parseBody(e.body, e.isBase64Encoded);
  }

  return info;
}

function normalizeQuery(e: Record<string, any>): Record<string, unknown> | undefined {
  if (e.multiValueQueryStringParameters && typeof e.multiValueQueryStringParameters === "object") {
    return { ...e.multiValueQueryStringParameters };
  }
  if (e.queryStringParameters && typeof e.queryStringParameters === "object") {
    return { ...e.queryStringParameters };
  }
  return undefined;
}

function parseBody(body: unknown, isBase64?: boolean): unknown {
  if (typeof body !== "string") return body;
  let raw = body;
  if (isBase64) {
    try {
      raw = Buffer.from(body, "base64").toString("utf8");
    } catch {
      return "[unparseable-base64-body]";
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
