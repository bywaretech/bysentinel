import { AsyncLocalStorage } from "node:async_hooks";
import type { Timeline } from "@bywaretech/bysentinel-core";
import type { AwsLambdaContextLike } from "./context.js";
import type { ResolvedOptions } from "./types.js";

export interface ActiveScope {
  options: ResolvedOptions;
  lambdaEvent?: unknown;
  lambdaContext?: AwsLambdaContextLike;
  coldStart: boolean;
  /** Optional execution timeline started via `startRuntime()`. */
  timeline?: Timeline;
}

const storage = new AsyncLocalStorage<ActiveScope>();

export function runWithScope<T>(scope: ActiveScope, fn: () => Promise<T>): Promise<T> {
  return storage.run(scope, fn);
}

export function currentScope(): ActiveScope | undefined {
  return storage.getStore();
}
