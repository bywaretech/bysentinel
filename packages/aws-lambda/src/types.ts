import type { AIOptions, CaptureOptions, GitContext, SecurityOptions } from "@bywaretech/bysentinel-core";

export interface DeliveryOptions {
  /**
   * "background" (default): the event send is fire-and-forget, bounded by
   * `timeoutMs`, and the wrapper does not block on it beyond that bound.
   * "blocking": await delivery fully before returning (still bounded).
   */
  mode?: "background" | "blocking";
  /** Hard cap on how long delivery may take. Default 2000ms. */
  timeoutMs?: number;
  /** Retries on network failure (exponential backoff). Default 0 in Lambda. */
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
   * Useful when you want BySentinel plus an external raw notification, or when
   * you are not running the dashboard/collector yet.
   */
  webhooks?: string[];
}

export interface BySentinelOptions {
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

/** Fully-resolved options with env fallbacks + defaults applied. */
export interface ResolvedOptions {
  project: string;
  environment: string;
  release?: string;
  collectorUrl?: string;
  apiKey?: string;
  capture: Required<CaptureOptions>;
  security: Required<SecurityOptions>;
  ai?: AIOptions;
  git?: GitContext;
  delivery: Required<DeliveryOptions>;
  onError: (error: unknown) => void;
  debug: boolean;
}
