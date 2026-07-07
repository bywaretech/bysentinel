import { Timeline } from "@bywaretech/bysentinel-core";
import { currentScope } from "./scope.js";

/**
 * Start an execution timeline for the current invocation (roadmap #1).
 *
 * ```ts
 * const runtime = BySentinel.start();
 * runtime.step("Validate Request");
 * runtime.step("Create Payment");
 * runtime.finish();
 * ```
 *
 * When called inside a `withBySentinel` handler the timeline is attached to the
 * active scope, so it is automatically included in any captured event (and, on
 * an unhandled error, finalized as aborted). Outside a handler it still works as
 * a standalone timer.
 */
export function startRuntime(): Timeline {
  const timeline = new Timeline();
  const scope = currentScope();
  if (scope) scope.timeline = timeline;
  return timeline;
}

/** Spec-facing namespace: `BySentinel.start()`. */
export const BySentinel = {
  start: startRuntime,
};
