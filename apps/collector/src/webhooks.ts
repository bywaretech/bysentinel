import { createHmac, randomUUID } from "node:crypto";
import type { IncidentRecord, StoredAnalysis } from "./storage.js";

export interface WebhookConfig {
  urls: string[];
  secret: string;
  timeoutMs: number;
}

export interface WebhookPayload {
  type: "incident.analyzed";
  incident: IncidentRecord;
  analysis: StoredAnalysis;
}

export async function deliverWebhooks(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
  if (!config.urls.length) return;
  await Promise.allSettled(config.urls.map((url) => deliverWebhook(url, config, payload)));
}

export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

async function deliverWebhook(url: string, config: WebhookConfig, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signWebhookPayload(config.secret, timestamp, body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "BySentinel-Webhook/0.1",
        "x-bysentinel-event": payload.type,
        "x-bysentinel-timestamp": timestamp,
        "x-bysentinel-signature": `sha256=${signature}`,
        "x-bysentinel-idempotency-key": randomUUID(),
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
