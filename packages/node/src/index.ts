export { withBySentinel } from "./withBySentinel.js";
export { captureException, captureMessage } from "./capture.js";
export { startRuntime, BySentinel } from "./runtime.js";
export { nodeRuntime } from "./context.js";
export { extractHttpRequest, type HttpRequestLike } from "./request.js";
export {
  bySentinelExpress,
  bySentinelErrorHandler,
  type BySentinelExpress,
  type BySentinelRequestHandler,
  type BySentinelErrorHandler,
} from "./express.js";

export type {
  BySentinelNodeOptions,
  BaseOptions,
  ResolvedBaseOptions,
  WebhookAuth,
  WebhookSign,
  WebhookConfig,
  DeliveryOptions,
} from "./types.js";

// Re-export the shared types consumers commonly need.
export type {
  BySentinelEvent,
  CaptureContext,
  CaptureOptions,
  SecurityOptions,
  AIOptions,
  GitContext,
  RuntimeInfo,
  RequestInfo,
  Timeline,
  ExecutionTimeline,
  TimelineStep,
} from "@bywaretech/bysentinel-core";
