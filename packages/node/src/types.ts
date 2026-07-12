import type { BaseOptions } from "./deps.js";

/**
 * Options for the Node SDK. Identical to the shared base options plus a
 * `service` label used as the runtime service name (e.g. "express", "worker").
 */
export interface BySentinelNodeOptions extends BaseOptions {
  /** Runtime service name recorded on events. Defaults to "node". */
  service?: string;
}

export type {
  BaseOptions,
  ResolvedBaseOptions,
  WebhookAuth,
  WebhookSign,
  WebhookConfig,
  DeliveryOptions,
} from "./deps.js";
