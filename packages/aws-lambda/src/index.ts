export { withBySentinel, type LambdaHandler } from "./withBySentinel.js";
export { captureException, captureMessage } from "./capture.js";
export { startRuntime, BySentinel } from "./runtime.js";
export { resolveOptions } from "./options.js";
export { resolveGitContext } from "./git.js";
export type { AwsLambdaContextLike } from "./context.js";
export type {
  BySentinelOptions,
  ResolvedOptions,
  DeliveryOptions,
  WebhookConfig,
  WebhookAuth,
  WebhookSign,
} from "./types.js";

// Re-export the shared types consumers commonly need.
export type {
  BySentinelEvent,
  CaptureContext,
  CaptureOptions,
  SecurityOptions,
  AIOptions,
  GitContext,
  Timeline,
  ExecutionTimeline,
  TimelineStep,
} from "@bywaretech/bysentinel-core";
