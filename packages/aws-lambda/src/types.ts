// The SDK's option types are shared across adapters and live in core/sdk.
// Re-exported here so the Lambda package's public API and internal imports stay
// stable. `BySentinelOptions`/`ResolvedOptions` are the Lambda-facing names for
// the platform-neutral base options.
export type {
  WebhookAuth,
  WebhookSign,
  WebhookConfig,
  DeliveryOptions,
  BaseOptions as BySentinelOptions,
  ResolvedBaseOptions as ResolvedOptions,
} from "@bywaretech/bysentinel-core/sdk";
