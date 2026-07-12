import { buildWebhookSignatureHeaders } from "../webhooks/sign.js";
import type { BySentinelEvent } from "../types/event.js";
import type { ResolvedBaseOptions, WebhookAuth, WebhookSign } from "./types.js";

/**
 * Deliver an event to the collector and/or direct webhooks. Always fails
 * silently — a broken target must never break the caller. Delivery is bounded
 * by `delivery.timeoutMs`.
 */
export async function sendEvent(
  options: ResolvedBaseOptions,
  event: BySentinelEvent,
): Promise<{ delivered: boolean }> {
  const body = JSON.stringify(event);
  if (Buffer.byteLength(body, "utf8") > options.delivery.maxEventBytes) {
    options.onError(
      new Error(`event exceeds maxEventBytes (${options.delivery.maxEventBytes}); event dropped`),
    );
    return { delivered: false };
  }

  const targets = deliveryTargets(options, event, body);
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

function deliveryTargets(
  options: ResolvedBaseOptions,
  event: BySentinelEvent,
  body: string,
): DeliveryTarget[] {
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

  for (const webhook of options.delivery.webhooks) {
    targets.push({
      url: webhook.url,
      headers: {
        // Caller-supplied static headers have the lowest precedence so they can
        // never clobber the reserved/auth/signature headers below.
        ...(webhook.headers ?? {}),
        ...authHeaders(webhook.auth),
        ...signatureHeaders(webhook.sign, body),
        "content-type": "application/json",
        "x-bysentinel-event-id": event.id,
        "x-bysentinel-delivery": "sdk-webhook",
      },
    });
  }

  return targets;
}

/** Build the auth header(s) for a webhook, if any. */
function authHeaders(auth: WebhookAuth | undefined): Record<string, string> {
  if (!auth) return {};
  switch (auth.type) {
    case "basic": {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`, "utf8").toString("base64");
      return { authorization: `Basic ${encoded}` };
    }
    case "bearer":
      return { authorization: `Bearer ${auth.token}` };
    case "apiKey":
      return { [(auth.header ?? "x-api-key").toLowerCase()]: auth.value };
    default:
      return {};
  }
}

/** Build HMAC signature headers for a webhook, if signing is configured. */
function signatureHeaders(sign: WebhookSign | undefined, body: string): Record<string, string> {
  if (!sign?.secret) return {};
  return { ...buildWebhookSignatureHeaders(sign.secret, body) };
}

async function sendToTarget(
  options: ResolvedBaseOptions,
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
 * Deliver an event, swallowing errors. In "background" mode the caller may
 * choose not to await this promise; in "blocking" mode it should await it. The
 * send itself is always bounded by `timeoutMs`.
 */
export async function deliver(
  options: ResolvedBaseOptions,
  event: BySentinelEvent,
): Promise<void> {
  try {
    await sendEvent(options, event);
  } catch (error) {
    options.onError(error);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
