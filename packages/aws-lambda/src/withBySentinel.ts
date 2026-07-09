import {
  AWS_RUNTIME,
  consumeColdStart,
  extractLambdaContext,
  finishPerf,
  startPerf,
  type AwsLambdaContextLike,
} from "./context.js";
import { isCaptured } from "./dedupe.js";
import { buildEvent } from "./event.js";
import { resolveOptions } from "./options.js";
import { extractRequest } from "./request.js";
import { runWithScope, type ActiveScope } from "./scope.js";
import { deliver } from "./transport.js";
import type { BySentinelOptions } from "./types.js";

export type LambdaHandler<
  TEvent = any,
  TResult = any,
  TContext extends AwsLambdaContextLike = AwsLambdaContextLike,
> = (event: TEvent, context: TContext) => Promise<TResult> | TResult;

/**
 * Wrap a Lambda handler with BySentinel. On an unhandled exception it captures
 * a sanitized event, then re-throws so the Lambda still fails as expected. On
 * success it optionally reports performance metadata (timeout risk / memory).
 *
 * The wrapper never changes the handler's return value and never swallows the
 * business error.
 */
export function withBySentinel<
  TEvent = any,
  TResult = any,
  TContext extends AwsLambdaContextLike = AwsLambdaContextLike,
>(
  handler: LambdaHandler<TEvent, TResult, TContext>,
  options: BySentinelOptions,
): LambdaHandler<TEvent, TResult, TContext> {
  const resolved = resolveOptions(options);

  return async function bySentinelHandler(event, context) {
    const coldStart = consumeColdStart();
    const probe = startPerf(context);
    const request = extractRequest(event, resolved);
    const lambda = extractLambdaContext(context, coldStart);

    const scope: ActiveScope = {
      options: resolved,
      runtime: AWS_RUNTIME,
      request,
      lambda,
      coldStart,
    };

    return runWithScope(scope, async () => {
      try {
        const result = await handler(event, context);

        // Success path: only emit an event when performance capture is on and a
        // risk was detected, to avoid flooding the collector with healthy runs.
        if (resolved.capture.performance) {
          const performance = finishPerf(probe, context, context?.memoryLimitInMB);
          if (performance.timeoutRisk) {
            const perfEvent = buildEvent({
              options: resolved,
              runtime: AWS_RUNTIME,
              lambda,
              request,
              performance,
              timeline: scope.timeline?.hasSteps ? scope.timeline.finish() : undefined,
              customContext: { kind: "performance-warning" },
            });
            await deliver(resolved, perfEvent);
          }
        }

        return result;
      } catch (error) {
        // Already reported by a manual captureException in the handler — don't
        // double-count. Re-throw so the Lambda still fails.
        if (isCaptured(error)) throw error;

        const performance = resolved.capture.performance
          ? finishPerf(probe, context, context?.memoryLimitInMB)
          : undefined;

        // Finalize the timeline as aborted so the failed step is visible.
        const timeline = scope.timeline?.hasSteps
          ? (scope.timeline.fail(), scope.timeline.toJSON(true))
          : undefined;

        const errorEvent = buildEvent({
          options: resolved,
          runtime: AWS_RUNTIME,
          lambda,
          request,
          error,
          performance,
          timeline,
        });

        // Bounded, fail-silent delivery. We await so the event actually leaves
        // the container before Lambda freezes it, but delivery is time-capped.
        await deliver(resolved, errorEvent);

        // Never swallow the business error.
        throw error;
      }
    });
  };
}
