import { Timeline, currentScope } from "./deps.js";

/**
 * Start an execution timeline for the current scope.
 *
 * ```ts
 * const rt = BySentinel.start();
 * rt.step("Validate input");
 * rt.step("Charge card");
 * rt.finish();
 * ```
 *
 * When called inside a wrapped function or Express request scope, the timeline
 * is attached to the active scope and included in any captured event (finalized
 * as aborted on error). Outside a scope it still works as a standalone timer.
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
