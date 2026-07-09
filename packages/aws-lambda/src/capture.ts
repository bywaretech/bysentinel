import { createCapture } from "@bywaretech/bysentinel-core/sdk";
import { AWS_RUNTIME } from "./context.js";

/**
 * Manual capture bound to the AWS Lambda runtime. Inside a `withBySentinel`
 * handler the active project/environment/collector config and request context
 * are picked up automatically; outside one, config falls back to environment
 * variables (and `overrides` if provided). Never throws.
 */
export const { captureException, captureMessage } = createCapture(AWS_RUNTIME);
