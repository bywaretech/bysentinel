import { AsyncLocalStorage } from "node:async_hooks";
import type { LambdaContext, RequestInfo, RuntimeInfo } from "../types/event.js";
import type { Timeline } from "../timeline/timeline.js";
import type { ResolvedBaseOptions } from "./types.js";

/**
 * Ambient per-invocation state, shared across an adapter's async execution via
 * `AsyncLocalStorage`. Adapters (Lambda, Node, ...) populate it at wrap time so
 * `captureException`/`captureMessage` inherit the active config and context.
 */
export interface ActiveScope {
  options: ResolvedBaseOptions;
  /** Runtime descriptor for the active invocation (provider/service/...). */
  runtime?: RuntimeInfo;
  /** Pre-extracted, not-yet-redacted request context, if any. */
  request?: RequestInfo;
  /** AWS Lambda execution context, when the adapter is Lambda. */
  lambda?: LambdaContext;
  /** Whether this invocation is a cold start (Lambda-only). */
  coldStart?: boolean;
  /** Optional execution timeline started via the adapter's runtime helper. */
  timeline?: Timeline;
}

const storage = new AsyncLocalStorage<ActiveScope>();

export function runWithScope<T>(scope: ActiveScope, fn: () => Promise<T>): Promise<T> {
  return storage.run(scope, fn);
}

export function currentScope(): ActiveScope | undefined {
  return storage.getStore();
}
