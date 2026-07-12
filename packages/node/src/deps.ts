// Central re-export of the shared SDK runtime so the Node adapter imports from
// one place. The heavy lifting (redaction, event assembly, delivery with auth +
// HMAC signing, scoping, manual capture) lives in @bywaretech/bysentinel-core.
export {
  resolveBaseOptions,
  buildEvent,
  deliver,
  runWithScope,
  currentScope,
  isCaptured,
  createCapture,
  type ActiveScope,
  type BaseOptions,
  type ResolvedBaseOptions,
  type WebhookAuth,
  type WebhookSign,
  type WebhookConfig,
  type DeliveryOptions,
} from "@bywaretech/bysentinel-core/sdk";

export type {
  BySentinelEvent,
  RequestInfo,
  RuntimeInfo,
  CaptureContext,
  Timeline as TimelineType,
} from "@bywaretech/bysentinel-core";

export { Timeline } from "@bywaretech/bysentinel-core";
