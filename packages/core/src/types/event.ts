/**
 * Canonical event shape produced by the SDK and accepted by the collector.
 * Kept intentionally provider-neutral so non-AWS runtimes can adopt it later.
 */

import type { ExecutionTimeline } from "../timeline/timeline.js";

export type SecuritySignalType =
  | "secret-in-log"
  | "sensitive-data-in-body"
  | "auth-error-spike"
  | "suspicious-user-agent"
  | "admin-route-access"
  | "excessive-failed-attempts"
  | "unsafe-headers"
  | "ssrf-like-url"
  | "sql-error-leakage"
  | "command-injection"
  | "path-traversal";

export type SecuritySignalSeverity = "low" | "medium" | "high" | "critical";

export interface SecuritySignal {
  type: SecuritySignalType;
  severity: SecuritySignalSeverity;
  /** Short human description. Must never embed the raw sensitive value. */
  message: string;
  /** Where it was seen, e.g. "request.headers.authorization". */
  location?: string;
}

export interface RuntimeInfo {
  provider: "aws";
  service: "lambda";
  language: "nodejs";
  version: string;
}

/** Deployment/source correlation. Enables release-vs-incident analysis. */
export interface GitContext {
  commitSha?: string;
  branch?: string;
  version?: string;
  release?: string;
  buildTimestamp?: string;
  repositoryUrl?: string;
}

export interface LambdaContext {
  functionName?: string;
  functionVersion?: string;
  requestId?: string;
  memoryLimitMb?: string;
  remainingTimeMs?: number;
  coldStart?: boolean;
}

export interface ErrorInfo {
  type: string;
  message: string;
  stack?: string;
}

export interface PerformanceInfo {
  durationMs?: number;
  timeoutRisk?: boolean;
  memoryUsedMb?: number;
}

export interface RequestInfo {
  method?: string;
  path?: string;
  headers?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface BySentinelEvent {
  id: string;
  timestamp: string;

  project: string;
  environment: string;
  release?: string;

  runtime: RuntimeInfo;
  lambda: LambdaContext;
  git?: GitContext;

  error?: ErrorInfo;
  performance?: PerformanceInfo;
  request?: RequestInfo;

  /** Execution timeline / bottleneck data (see `ExecutionTimeline`). */
  timeline?: ExecutionTimeline;

  customContext?: Record<string, unknown>;
  securitySignals?: SecuritySignal[];

  /** True once redaction has run. The collector rejects events with `false`. */
  sanitized: boolean;
}

/** Optional manual-capture metadata merged into `customContext`. */
export interface CaptureContext {
  severity?: SecuritySignalSeverity | "warning" | "info";
  [key: string]: unknown;
}
