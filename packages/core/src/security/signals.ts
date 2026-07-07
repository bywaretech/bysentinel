import type { RequestInfo, ErrorInfo, SecuritySignal } from "../types/event.js";
import { VALUE_PATTERNS } from "../redaction/patterns.js";

interface DetectInput {
  request?: RequestInfo;
  error?: ErrorInfo;
}

const SUSPICIOUS_UA =
  /\b(sqlmap|nikto|nmap|masscan|acunetix|nessus|dirbuster|gobuster|wpscan|havij|hydra)\b/i;

const SQL_ERROR =
  /\b(sql syntax|syntax error at or near|unclosed quotation mark|ora-\d{5}|pg_query|mysqli?_|sqlstate|unterminated quoted string|column .* does not exist)\b/i;

const COMMAND_INJECTION = /(;|\||&&|`|\$\(|\|\||>\s*\/|<\s*\/)\s*(cat|ls|rm|curl|wget|bash|sh|nc|whoami|id)\b/i;

const PATH_TRAVERSAL = /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\/etc\/passwd|\/proc\/self)/i;

// Private ranges + AWS/GCP metadata endpoints commonly hit by SSRF.
const SSRF_URL =
  /https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0|169\.254\.169\.254|metadata\.google\.internal|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})/i;

const SECRET_PATTERNS = VALUE_PATTERNS.filter((p) => p.category === "secret");

function flatten(value: unknown, out: string[], depth = 0): void {
  if (depth > 8 || value == null) return;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => flatten(v, out, depth + 1));
  else if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) flatten(v, out, depth + 1);
  }
}

/**
 * Scan (pre-redaction) request/error data for attack indicators and accidental
 * secret exposure. Returns signals with descriptions only — never raw values.
 */
export function detectSecuritySignals(input: DetectInput): SecuritySignal[] {
  const signals: SecuritySignal[] = [];
  const { request, error } = input;

  const bodyStrings: string[] = [];
  flatten(request?.body, bodyStrings);
  flatten(request?.query, bodyStrings);
  const headerStrings: string[] = [];
  flatten(request?.headers, headerStrings);
  const allInput = [...bodyStrings, ...headerStrings];

  // Accidental secret in body/headers.
  for (const pattern of SECRET_PATTERNS) {
    if (bodyStrings.some((s) => testOnce(pattern.regex, s))) {
      signals.push({
        type: "sensitive-data-in-body",
        severity: "high",
        message: `Possible ${pattern.name} present in request body`,
        location: "request.body",
      });
      break;
    }
  }
  for (const pattern of SECRET_PATTERNS) {
    if (
      headerStrings.some((s) => testOnce(pattern.regex, s)) &&
      pattern.name !== "bearer-token" &&
      pattern.name !== "basic-auth"
    ) {
      signals.push({
        type: "secret-in-log",
        severity: "high",
        message: `Possible ${pattern.name} present in request headers`,
        location: "request.headers",
      });
      break;
    }
  }

  const ua = getHeader(request?.headers, "user-agent");
  if (ua && SUSPICIOUS_UA.test(ua)) {
    signals.push({
      type: "suspicious-user-agent",
      severity: "medium",
      message: "Request user-agent matches a known scanning tool",
      location: "request.headers.user-agent",
    });
  }

  if (request?.path && /\/(admin|internal|_debug|actuator)\b/i.test(request.path)) {
    signals.push({
      type: "admin-route-access",
      severity: "medium",
      message: "Access to an administrative/internal route",
      location: "request.path",
    });
  }

  if (error?.message && SQL_ERROR.test(error.message)) {
    signals.push({
      type: "sql-error-leakage",
      severity: "high",
      message: "Database error text leaked in the error message",
      location: "error.message",
    });
  }

  if (allInput.some((s) => COMMAND_INJECTION.test(s))) {
    signals.push({
      type: "command-injection",
      severity: "critical",
      message: "Input contains shell command-injection patterns",
      location: "request",
    });
  }
  if (allInput.some((s) => PATH_TRAVERSAL.test(s))) {
    signals.push({
      type: "path-traversal",
      severity: "high",
      message: "Input contains path-traversal sequences",
      location: "request",
    });
  }
  if (allInput.some((s) => SSRF_URL.test(s))) {
    signals.push({
      type: "ssrf-like-url",
      severity: "high",
      message: "Input references an internal/metadata URL (possible SSRF)",
      location: "request",
    });
  }

  return signals;
}

function testOnce(regex: RegExp, value: string): boolean {
  regex.lastIndex = 0;
  return regex.test(value);
}

function getHeader(headers: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === name && typeof v === "string") return v;
  }
  return undefined;
}
