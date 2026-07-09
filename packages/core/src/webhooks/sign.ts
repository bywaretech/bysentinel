import { createHmac, randomUUID } from "node:crypto";

/**
 * Compute the HMAC-SHA256 signature for a webhook payload. The signed string is
 * `${timestamp}.${body}` so the receiver can bind the signature to both the
 * exact payload and the moment it was sent (replay protection).
 *
 * This is the single source of truth for BySentinel webhook signing — both the
 * collector's outbound webhooks and the SDK's direct webhooks use it, so a
 * receiver validates either the same way.
 */
export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** Reserved signature headers attached to a signed webhook request. */
export interface WebhookSignatureHeaders {
  "x-bysentinel-timestamp": string;
  "x-bysentinel-signature": string;
  "x-bysentinel-idempotency-key": string;
}

/**
 * Build the full set of signature headers for a payload: a unix-seconds
 * timestamp, the `sha256=`-prefixed HMAC, and a unique idempotency key so the
 * receiver can drop duplicate deliveries.
 */
export function buildWebhookSignatureHeaders(
  secret: string,
  body: string,
  now: number = Date.now(),
): WebhookSignatureHeaders {
  const timestamp = Math.floor(now / 1000).toString();
  return {
    "x-bysentinel-timestamp": timestamp,
    "x-bysentinel-signature": `sha256=${signWebhookPayload(secret, timestamp, body)}`,
    "x-bysentinel-idempotency-key": randomUUID(),
  };
}
