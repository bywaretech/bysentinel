import type { LambdaContext, PerformanceInfo, RuntimeInfo } from "@bywaretech/bysentinel-core";

/** Runtime descriptor for events produced by this Lambda adapter. */
export const AWS_RUNTIME: RuntimeInfo = {
  provider: "aws",
  service: "lambda",
  language: "nodejs",
  version: process.version,
};

/** AWS Lambda `Context` — narrowed to what we use (avoids a hard dep). */
export interface AwsLambdaContextLike {
  functionName?: string;
  functionVersion?: string;
  awsRequestId?: string;
  memoryLimitInMB?: string;
  getRemainingTimeInMillis?: () => number;
}

// Module-scoped: the first invocation of a warm container is a cold start.
let isColdStart = true;

/** Reads and then clears the cold-start flag for this container. */
export function consumeColdStart(): boolean {
  const value = isColdStart;
  isColdStart = false;
  return value;
}

/** Test-only reset. */
export function __resetColdStart(): void {
  isColdStart = true;
}

export function extractLambdaContext(
  ctx: AwsLambdaContextLike | undefined,
  coldStart: boolean,
): LambdaContext {
  const remainingTimeMs = safeRemaining(ctx);
  return {
    functionName: ctx?.functionName,
    functionVersion: ctx?.functionVersion,
    requestId: ctx?.awsRequestId,
    memoryLimitMb: ctx?.memoryLimitInMB,
    remainingTimeMs,
    coldStart,
  };
}

function safeRemaining(ctx: AwsLambdaContextLike | undefined): number | undefined {
  try {
    return ctx?.getRemainingTimeInMillis?.();
  } catch {
    return undefined;
  }
}

export interface PerfProbe {
  startMs: number;
  startRemainingMs?: number;
}

export function startPerf(ctx: AwsLambdaContextLike | undefined): PerfProbe {
  return { startMs: Date.now(), startRemainingMs: safeRemaining(ctx) };
}

/**
 * Compute performance metadata. Timeout risk fires when the invocation used up
 * most of its remaining budget; memory pressure inflates severity elsewhere.
 */
export function finishPerf(
  probe: PerfProbe,
  ctx: AwsLambdaContextLike | undefined,
  memoryLimitMb: string | undefined,
): PerformanceInfo {
  const durationMs = Date.now() - probe.startMs;
  const memoryUsedMb = Math.round((process.memoryUsage().rss / (1024 * 1024)) * 10) / 10;

  let timeoutRisk = false;
  if (probe.startRemainingMs != null) {
    const remainingNow = Math.max(0, probe.startRemainingMs - durationMs);
    const threshold = Math.max(1000, probe.startRemainingMs * 0.1);
    timeoutRisk = remainingNow <= threshold;
  }

  return { durationMs, memoryUsedMb, timeoutRisk };
}

/** True when RSS is within 10% of the configured memory limit. */
export function isMemoryPressured(
  memoryUsedMb: number | undefined,
  memoryLimitMb: string | undefined,
): boolean {
  const limit = memoryLimitMb ? Number(memoryLimitMb) : NaN;
  if (!memoryUsedMb || !Number.isFinite(limit) || limit <= 0) return false;
  return memoryUsedMb / limit >= 0.9;
}
