import { buildEvent, isCaptured, resolveBaseOptions, runWithScope, type ActiveScope } from "./deps.js";
import { nodeRuntime } from "./context.js";
import { dispatch } from "./dispatch.js";
import type { BySentinelNodeOptions } from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => any;

/**
 * Wrap any async function with BySentinel. On an unhandled rejection it captures
 * a sanitized event, then re-throws so the caller still sees the error. Useful
 * for background jobs, queue consumers, cron handlers, or any non-HTTP entry
 * point. For HTTP frameworks prefer {@link bySentinelErrorHandler}.
 *
 * The wrapper never changes the return value and never swallows the error.
 */
export function withBySentinel<F extends AnyAsyncFn>(fn: F, options: BySentinelNodeOptions): F {
  const resolved = resolveBaseOptions(options);
  const runtime = nodeRuntime(options.service);

  const wrapped = async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
    const scope: ActiveScope = { options: resolved, runtime };
    return runWithScope(scope, async () => {
      try {
        return await fn(...args);
      } catch (error) {
        if (!isCaptured(error)) {
          const event = buildEvent({ options: resolved, runtime, error });
          await dispatch(resolved, event);
        }
        throw error;
      }
    });
  };

  return wrapped as unknown as F;
}
