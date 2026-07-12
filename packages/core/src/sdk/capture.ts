import type { CaptureContext, RuntimeInfo } from "../types/event.js";
import { markCaptured } from "./dedupe.js";
import { buildEvent } from "./event.js";
import { resolveBaseOptions } from "./options.js";
import { currentScope } from "./scope.js";
import { deliver } from "./transport.js";
import type { BaseOptions } from "./types.js";

export interface CaptureApi {
  captureException: (
    error: unknown,
    context?: CaptureContext,
    overrides?: Partial<BaseOptions>,
  ) => Promise<void>;
  captureMessage: (
    message: string,
    context?: CaptureContext,
    overrides?: Partial<BaseOptions>,
  ) => Promise<void>;
}

/**
 * Build `captureException` / `captureMessage` bound to a default runtime. Inside
 * a wrapped handler the active scope's config/runtime/context are used; outside
 * one, config falls back to env vars (+ `overrides`) and the `defaultRuntime`.
 * Both helpers never throw — capture failures are swallowed.
 */
export function createCapture(defaultRuntime: RuntimeInfo): CaptureApi {
  async function captureException(
    error: unknown,
    context: CaptureContext = {},
    overrides?: Partial<BaseOptions>,
  ): Promise<void> {
    try {
      const scope = currentScope();
      const options =
        scope?.options ??
        resolveBaseOptions({ project: "unknown", environment: "development", ...overrides });

      // Capturing an exception implies the current timeline step failed.
      let timeline;
      if (scope?.timeline?.hasSteps) {
        scope.timeline.fail();
        timeline = scope.timeline.toJSON(true);
      }

      // Prevent a wrapper from re-capturing the same error when it re-propagates.
      markCaptured(error);

      const event = buildEvent({
        options,
        runtime: scope?.runtime ?? defaultRuntime,
        lambda: scope?.lambda,
        request: scope?.request,
        error,
        timeline,
        customContext: context as Record<string, unknown>,
      });
      await deliver(options, event);
    } catch (err) {
      try {
        currentScope()?.options.onError(err);
      } catch {
        /* ignore */
      }
    }
  }

  async function captureMessage(
    message: string,
    context: CaptureContext = {},
    overrides?: Partial<BaseOptions>,
  ): Promise<void> {
    try {
      const scope = currentScope();
      const options =
        scope?.options ??
        resolveBaseOptions({ project: "unknown", environment: "development", ...overrides });

      const event = buildEvent({
        options,
        runtime: scope?.runtime ?? defaultRuntime,
        lambda: scope?.lambda,
        request: scope?.request,
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

  return { captureException, captureMessage };
}
