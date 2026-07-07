import { DEFAULT_CAPTURE_OPTIONS, DEFAULT_SECURITY_OPTIONS } from "@bywaretech/bysentinel-core";
import { resolveGitContext } from "./git.js";
import type { ResolvedOptions, BySentinelOptions } from "./types.js";

const env = (key: string): string | undefined => {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
};

const splitList = (value: string | undefined): string[] =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

/** Merge user options with environment variables and secure defaults. */
export function resolveOptions(options: BySentinelOptions): ResolvedOptions {
  const security = { ...DEFAULT_SECURITY_OPTIONS, ...options.security };
  const capture = { ...DEFAULT_CAPTURE_OPTIONS, ...options.capture };

  // Strict mode overrides capture flags: bodies/headers never leave the process.
  if (security.strictMode) {
    capture.requestBody = false;
    capture.headers = false;
  }

  return {
    project: options.project ?? env("BYSENTINEL_PROJECT") ?? "unknown",
    environment: options.environment ?? env("BYSENTINEL_ENVIRONMENT") ?? "development",
    release: options.release ?? env("BYSENTINEL_RELEASE"),
    collectorUrl: options.collectorUrl ?? env("BYSENTINEL_COLLECTOR_URL"),
    apiKey: options.apiKey ?? env("BYSENTINEL_API_KEY"),
    capture,
    security,
    ai: options.ai,
    git: resolveGitContext(options.git),
    delivery: {
      mode: options.delivery?.mode ?? "background",
      timeoutMs: options.delivery?.timeoutMs ?? 2000,
      retries: options.delivery?.retries ?? 0,
      maxEventBytes: options.delivery?.maxEventBytes ?? 262_144,
      endpointPath: options.delivery?.endpointPath ?? "/v1/events",
      webhooks: options.delivery?.webhooks ?? splitList(env("BYSENTINEL_DIRECT_WEBHOOK_URLS")),
    },
    onError:
      options.onError ??
      ((error) => {
        if (options.debug) console.debug("[bysentinel] internal error:", error);
      }),
    debug: options.debug ?? false,
  };
}
