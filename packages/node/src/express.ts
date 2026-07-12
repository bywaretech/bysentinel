import { buildEvent, isCaptured, resolveBaseOptions, runWithScope } from "./deps.js";
import { nodeRuntime } from "./context.js";
import { dispatch } from "./dispatch.js";
import { extractHttpRequest, type HttpRequestLike } from "./request.js";
import type { BySentinelNodeOptions } from "./types.js";

// Minimal structural types so we don't take a hard dependency on `express`.
type NextFunction = (err?: unknown) => void;
export type BySentinelRequestHandler = (req: HttpRequestLike, res: unknown, next: NextFunction) => void;
export type BySentinelErrorHandler = (
  err: unknown,
  req: HttpRequestLike,
  res: unknown,
  next: NextFunction,
) => void;

export interface BySentinelExpress {
  /**
   * Request-scoped middleware. Register it early so manual `captureException`
   * calls inside route handlers inherit the active config and request context.
   */
  scope: BySentinelRequestHandler;
  /**
   * Error-handling middleware. Register it last (after your routes) so unhandled
   * errors are captured and then re-propagated via `next(err)`.
   */
  errorHandler: BySentinelErrorHandler;
}

/**
 * Build BySentinel Express/Connect middleware. Both middlewares share one
 * resolved config and runtime.
 *
 * ```ts
 * const bysentinel = bySentinelExpress({ project: "api", environment: "production" });
 * app.use(bysentinel.scope);      // early
 * // ... routes ...
 * app.use(bysentinel.errorHandler); // last
 * ```
 *
 * The error handler dispatches in the background so the error response is never
 * delayed by delivery.
 */
export function bySentinelExpress(options: BySentinelNodeOptions): BySentinelExpress {
  const resolved = resolveBaseOptions(options);
  const runtime = nodeRuntime(options.service ?? "express");

  const scope: BySentinelRequestHandler = (req, _res, next) => {
    const request = extractHttpRequest(req, resolved);
    // Establish the AsyncLocalStorage scope for the rest of the request chain.
    void runWithScope({ options: resolved, runtime, request }, async () => {
      next();
    });
  };

  const errorHandler: BySentinelErrorHandler = (err, req, _res, next) => {
    try {
      if (!isCaptured(err)) {
        const request = extractHttpRequest(req, resolved);
        const event = buildEvent({ options: resolved, runtime, request, error: err });
        void dispatch(resolved, event);
      }
    } catch {
      /* never let capture break the error pipeline */
    }
    next(err);
  };

  return { scope, errorHandler };
}

/** Convenience: just the error handler, when you don't need the request scope. */
export function bySentinelErrorHandler(options: BySentinelNodeOptions): BySentinelErrorHandler {
  return bySentinelExpress(options).errorHandler;
}
