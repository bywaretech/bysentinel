import { createCapture } from "./deps.js";
import { nodeRuntime } from "./context.js";

/**
 * Manual capture bound to the Node runtime. Inside a wrapped function or an
 * Express request scope the active config and request context are picked up
 * automatically; outside one, config falls back to environment variables (and
 * `overrides` if provided). Never throws.
 */
export const { captureException, captureMessage } = createCapture(nodeRuntime());
