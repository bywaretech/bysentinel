// Option resolution (env fallbacks, defaults, webhook normalization, strict
// mode) is shared. `resolveOptions` is the Lambda-facing name.
export { resolveBaseOptions as resolveOptions, normalizeWebhooks } from "@bywaretech/bysentinel-core/sdk";
