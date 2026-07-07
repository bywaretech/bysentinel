import {
  detectSecuritySignals,
  newEventId,
  nowIso,
  redact,
  type ErrorInfo,
  type ExecutionTimeline,
  type PerformanceInfo,
  type RequestInfo,
  type BySentinelEvent,
  type SecuritySignal,
} from "@bysentinel/core";
import { extractLambdaContext, type AwsLambdaContextLike } from "./context.js";
import { extractRequest } from "./request.js";
import type { ResolvedOptions } from "./types.js";

const RUNTIME_VERSION = process.version;

export function errorToInfo(error: unknown, includeStack: boolean): ErrorInfo {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      message: error.message,
      stack: includeStack ? error.stack : undefined,
    };
  }
  return { type: "NonError", message: String(error) };
}

export interface BuildEventParams {
  options: ResolvedOptions;
  lambdaEvent?: unknown;
  lambdaContext?: AwsLambdaContextLike;
  coldStart: boolean;
  error?: unknown;
  performance?: PerformanceInfo;
  timeline?: ExecutionTimeline;
  customContext?: Record<string, unknown>;
}

/**
 * Assemble a fully-sanitized BySentinelEvent. Security signals are detected on
 * the RAW request (before redaction) so patterns are visible, then the request
 * and custom context are redacted. `sanitized` is always true on the result.
 */
export function buildEvent(params: BuildEventParams): BySentinelEvent {
  const { options, coldStart } = params;
  const security = options.security;

  const rawRequest = extractRequest(params.lambdaEvent, options);
  const error = params.error !== undefined ? errorToInfo(params.error, options.capture.stackTrace) : undefined;

  // Detect signals on raw data before it is redacted away.
  const securitySignals: SecuritySignal[] = detectSecuritySignals({ request: rawRequest, error });

  // Second: redact the request + custom context.
  const request: RequestInfo | undefined =
    security.sanitize && rawRequest ? redact(rawRequest, security) : rawRequest;

  const customContext =
    params.customContext && security.sanitize
      ? redact(params.customContext, security)
      : params.customContext;

  const lambda = extractLambdaContext(params.lambdaContext, coldStart);
  const performance = params.performance;

  // Timeline step metadata is developer-supplied and may contain secrets/PII.
  const timeline =
    params.timeline && security.sanitize ? redact(params.timeline, security) : params.timeline;

  return {
    id: newEventId(),
    timestamp: nowIso(),
    project: options.project,
    environment: options.environment,
    release: options.release,
    runtime: { provider: "aws", service: "lambda", language: "nodejs", version: RUNTIME_VERSION },
    lambda,
    git: options.git,
    error,
    performance,
    timeline,
    request,
    customContext: mergeAiMeta(customContext, options),
    securitySignals: securitySignals.length ? securitySignals : undefined,
    sanitized: true,
  };
}

/** Forward the SDK's AI preferences as metadata the collector/worker can honor. */
function mergeAiMeta(
  customContext: Record<string, unknown> | undefined,
  options: ResolvedOptions,
): Record<string, unknown> | undefined {
  if (!options.ai) return customContext;
  return {
    ...customContext,
    __bysentinel: {
      ai: {
        enabled: options.ai.enabled,
        mode: options.ai.mode,
        provider: options.ai.provider,
        model: options.ai.model,
        sendBodyToAI: options.ai.sendBodyToAI ?? false,
        sendHeadersToAI: options.ai.sendHeadersToAI ?? false,
      },
    },
  };
}
