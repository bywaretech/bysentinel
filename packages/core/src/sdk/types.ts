import type { AIOptions, CaptureOptions, SecurityOptions } from "../types/config.js";
import type { GitContext } from "../types/event.js";

/**
 * Authentication applied to an outgoing direct-webhook request.
 * - `basic`: sends `Authorization: Basic base64(username:password)`.
 * - `bearer`: sends `Authorization: Bearer <token>`.
 * - `apiKey`: sends the value in `header` (default `x-api-key`).
 */
export type WebhookAuth =
  | { type: "basic"; username: string; password: string }
  | { type: "bearer"; token: string }
  | { type: "apiKey"; value: string; header?: string };

/**
 * HMAC signing for a direct webhook. When set, the SDK signs the exact payload
 * with the same scheme as the collector's outbound webhooks, so the receiver can
 * verify authenticity and integrity (not just possession of a credential).
 */
export interface WebhookSign {
  /** Shared secret used to compute the HMAC-SHA256 signature. */
  secret: string;
}

/** A single direct-webhook target with optional auth, signing and headers. */
export interface WebhookConfig {
  /** Absolute URL that receives the sanitized event via POST. */
  url: string;
  /** Optional authentication applied to the request. */
  auth?: WebhookAuth;
  /**
   * Optional HMAC signing. Adds `x-bysentinel-timestamp`,
   * `x-bysentinel-signature` and `x-bysentinel-idempotency-key` — the same
   * headers (and verification) as the collector's outbound webhooks.
   */
  sign?: WebhookSign;
  /**
   * Extra static headers merged into the request. Reserved headers
   * (`content-type`, `x-bysentinel-*`), the auth header and the signature
   * headers take precedence.
   */
  headers?: Record<string, string>;
}

export interface DeliveryOptions {
  /**
   * Delivery mode. Honored by long-running adapters (e.g. the Node SDK):
   * - "blocking": await delivery fully before returning (still bounded).
   * - "background": fire-and-forget, so the response is not delayed by delivery.
   *
   * The AWS Lambda wrapper always awaits (bounded by `timeoutMs`) regardless of
   * this value, because an unawaited send can be frozen before it leaves the
   * container.
   */
  mode?: "background" | "blocking";
  /** Hard cap on how long delivery may take. Default 2000ms. */
  timeoutMs?: number;
  /** Retries on network failure (exponential backoff). Default 0. */
  retries?: number;
  /** Drop events larger than this serialized size. Default 256 KiB. */
  maxEventBytes?: number;
  /**
   * Path appended to `collectorUrl`. Defaults to `/v1/events` for the
   * BySentinel collector. Use an empty string for exact webhook URLs.
   */
  endpointPath?: string;
  /**
   * Optional direct webhooks that receive the same sanitized event from the SDK.
   * Each entry is either a plain URL string (legacy form) or a
   * {@link WebhookConfig} object with per-webhook auth, signing and headers.
   * Both forms can be mixed in the same array.
   */
  webhooks?: Array<string | WebhookConfig>;
}

/** Platform-neutral SDK options shared by every adapter (Lambda, Node, ...). */
export interface BaseOptions {
  project: string;
  environment: string;
  release?: string;

  /** Collector base URL. Falls back to BYSENTINEL_COLLECTOR_URL. */
  collectorUrl?: string;
  /** Project API key. Falls back to BYSENTINEL_API_KEY. */
  apiKey?: string;

  capture?: CaptureOptions;
  security?: SecurityOptions;
  /** AI preferences forwarded to the collector as event metadata. */
  ai?: AIOptions;

  /** Explicit Git/release correlation. Falls back to env/CI detection. */
  git?: GitContext;

  delivery?: DeliveryOptions;

  /** Called with internal errors instead of throwing. Off by default. */
  onError?: (error: unknown) => void;
  /** When true, internal diagnostics are logged with console.debug. */
  debug?: boolean;
}

/** Fully-resolved base options with env fallbacks + defaults applied. */
export interface ResolvedBaseOptions {
  project: string;
  environment: string;
  release?: string;
  collectorUrl?: string;
  apiKey?: string;
  capture: Required<CaptureOptions>;
  security: Required<SecurityOptions>;
  ai?: AIOptions;
  git?: GitContext;
  delivery: Required<Omit<DeliveryOptions, "webhooks">> & { webhooks: WebhookConfig[] };
  onError: (error: unknown) => void;
  debug: boolean;
}
