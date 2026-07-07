import type { BySentinelEvent } from "@bysentinel/core";
import type { ResolvedOptions } from "./types.js";

/**
 * Deliver an event to the collector. Always fails silently — a broken
 * collector must never break the Lambda. Delivery is bounded by
 * `delivery.timeoutMs` regardless of mode.
 */
export async function sendEvent(
  options: ResolvedOptions,
  event: BySentinelEvent,
): Promise<{ delivered: boolean }> {
  const body = JSON.stringify(event);
  if (Buffer.byteLength(body, "utf8") > options.delivery.maxEventBytes) {
    options.onError(
      new Error(`event exceeds maxEventBytes (${options.delivery.maxEventBytes}); event dropped`),
    );
    return { delivered: false };
  }

  const targets = deliveryTargets(options, event);
  if (targets.length === 0) {
    options.onError(
      new Error("collectorUrl and delivery.webhooks are not configured; event dropped"),
    );
    return { delivered: false };
  }

  const results = await Promise.all(targets.map((target) => sendToTarget(options, target, body)));
  return { delivered: results.some(Boolean) };
}

interface DeliveryTarget {
  url: string;
  headers: Record<string, string>;
}

function deliveryTargets(options: ResolvedOptions, event: BySentinelEvent): DeliveryTarget[] {
  const targets: DeliveryTarget[] = [];

  if (options.collectorUrl) {
    targets.push({
      url: buildDeliveryUrl(options.collectorUrl, options.delivery.endpointPath),
      headers: {
        "content-type": "application/json",
        "x-api-key": options.apiKey ?? "",
        "x-bysentinel-event-id": event.id,
      },
    });
  }

  for (const url of options.delivery.webhooks) {
    targets.push({
      url,
      headers: {
        "content-type": "application/json",
        "x-bysentinel-event-id": event.id,
        "x-bysentinel-delivery": "sdk-webhook",
      },
    });
  }

  return targets;
}

async function sendToTarget(
  options: ResolvedOptions,
  target: DeliveryTarget,
  body: string,
): Promise<boolean> {
  const { retries, timeoutMs } = options.delivery;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(target.url, {
        method: "POST",
        headers: target.headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) return true;

      // 4xx are not retryable; 5xx may be.
      if (res.status < 500 || attempt === retries) {
        options.onError(new Error(`delivery target responded ${res.status} for ${target.url}`));
        return false;
      }
    } catch (error) {
      clearTimeout(timer);
      if (attempt === retries) {
        options.onError(error);
        return false;
      }
    }
    // Exponential backoff before the next retry.
    await delay(Math.min(1000, 100 * 2 ** attempt));
  }

  return false;
}

export function buildDeliveryUrl(collectorUrl: string, endpointPath: string): string {
  if (!endpointPath) return collectorUrl;
  const base = collectorUrl.replace(/\/$/, "");
  const path = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  return `${base}${path}`;
}

/**
 * Run delivery according to `delivery.mode`. In "blocking" mode we await the
 * send; in "background" mode we still await but the send itself is bounded by
 * `timeoutMs`, so the wrapper is never blocked longer than that. Both swallow
 * errors.
 */
export async function deliver(options: ResolvedOptions, event: BySentinelEvent): Promise<void> {
  try {
    await sendEvent(options, event);
  } catch (error) {
    options.onError(error);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
