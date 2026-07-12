/**
 * Shared, platform-neutral SDK runtime. Adapters (AWS Lambda, Node, ...) build
 * on these primitives so redaction, event assembly, delivery (auth + HMAC
 * signing), scoping and manual capture are implemented once.
 */

export type {
  WebhookAuth,
  WebhookSign,
  WebhookConfig,
  DeliveryOptions,
  BaseOptions,
  ResolvedBaseOptions,
} from "./types.js";

export { resolveBaseOptions, normalizeWebhooks } from "./options.js";
export { resolveGitContext } from "./git.js";
export { markCaptured, isCaptured } from "./dedupe.js";
export { runWithScope, currentScope, type ActiveScope } from "./scope.js";
export { sendEvent, deliver, buildDeliveryUrl } from "./transport.js";
export { buildEvent, errorToInfo, type BuildEventParams } from "./event.js";
export { createCapture, type CaptureApi } from "./capture.js";
