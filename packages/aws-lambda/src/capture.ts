import type { CaptureContext } from "@bysentinel/core";
import { markCaptured } from "./dedupe.js";
import { buildEvent } from "./event.js";
import { resolveOptions } from "./options.js";
import { currentScope } from "./scope.js";
import { deliver } from "./transport.js";
import type { BySentinelOptions } from "./types.js";

/**
 * Manually capture an exception. Inside a `withBySentinel` handler the active
 * project/environment/collector config is picked up automatically. Outside one,
 * config falls back to environment variables (and `overrides` if provided).
 *
 * Never throws — capture failures are swallowed so business code is unaffected.
 */
export async function captureException(
  error: unknown,
  context: CaptureContext = {},
  overrides?: Partial<BySentinelOptions>,
): Promise<void> {
  try {
    const scope = currentScope();
    const options =
      scope?.options ??
      resolveOptions({ project: "unknown", environment: "development", ...overrides });

    // Capturing an exception implies the current timeline step failed.
    let timeline;
    if (scope?.timeline?.hasSteps) {
      scope.timeline.fail();
      timeline = scope.timeline.toJSON(true);
    }

    // Prevent the wrapper from re-capturing the same error when it re-propagates.
    markCaptured(error);

    const event = buildEvent({
      options,
      lambdaEvent: scope?.lambdaEvent,
      lambdaContext: scope?.lambdaContext,
      coldStart: scope?.coldStart ?? false,
      error,
      timeline,
      customContext: context as Record<string, unknown>,
    });
    await deliver(options, event);
  } catch (err) {
    // Last-resort guard: manual capture must not break the caller.
    try {
      currentScope()?.options.onError(err);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Capture a standalone message/breadcrumb (no exception). Severity defaults to
 * "info" and is stored in custom context.
 */
export async function captureMessage(
  message: string,
  context: CaptureContext = {},
  overrides?: Partial<BySentinelOptions>,
): Promise<void> {
  try {
    const scope = currentScope();
    const options =
      scope?.options ??
      resolveOptions({ project: "unknown", environment: "development", ...overrides });

    const event = buildEvent({
      options,
      lambdaEvent: scope?.lambdaEvent,
      lambdaContext: scope?.lambdaContext,
      coldStart: scope?.coldStart ?? false,
      customContext: { severity: context.severity ?? "info", ...context },
    });
    // Model messages as a distinct "Message" event so the collector can tell
    // them apart from thrown exceptions.
    event.error = { type: "Message", message };
    await deliver(options, event);
  } catch (err) {
    try {
      currentScope()?.options.onError(err);
    } catch {
      /* ignore */
    }
  }
}
