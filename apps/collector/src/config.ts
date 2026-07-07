import type { ProviderName } from "@bywaretech/bysentinel-providers";
import { defaultModel, type AISettings } from "./settings.js";

/**
 * Well-known development defaults. The production boot guard refuses to start
 * when any of these are left unchanged (see security.ts). Keep in sync with
 * .env.example and the compose files.
 */
export const DEV_ADMIN_TOKEN = "bs_admin_dev_token";
export const DEV_API_KEY = "bsk_local_dev_key";
export const DEV_DEFAULT_PASSWORD = "adminbysentinel";
export const DEV_WEBHOOK_SECRET = "bswhsec_change_me";

export interface CollectorConfig {
  host: string;
  port: number;
  dataDir: string;
  apiKeys: string[];
  adminToken: string;
  /** Seeded on first boot when no accounts exist yet. */
  defaultUser: {
    username: string;
    password: string;
  };
  maxBodyBytes: number;
  rateLimitPerMinute: number;
  /** Separate, stricter budget for login attempts. */
  loginRateLimitPerMinute: number;
  corsOrigins: string[];
  webhooks: {
    urls: string[];
    secret: string;
    timeoutMs: number;
  };
  ai: AISettings;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CollectorConfig {
  const provider = (env.BYSENTINEL_AI_PROVIDER ?? "openai") as ProviderName;
  return {
    host: env.COLLECTOR_HOST ?? "0.0.0.0",
    port: numberFrom(env.COLLECTOR_PORT, 4000),
    dataDir: env.BYSENTINEL_DATA_DIR ?? "/data",
    apiKeys: splitList(env.BYSENTINEL_API_KEYS ?? env.BYSENTINEL_API_KEY ?? DEV_API_KEY),
    adminToken: env.BYSENTINEL_ADMIN_TOKEN ?? DEV_ADMIN_TOKEN,
    defaultUser: {
      username: env.BYSENTINEL_DEFAULT_USER ?? "bysentinel",
      password: env.BYSENTINEL_DEFAULT_PASSWORD ?? DEV_DEFAULT_PASSWORD,
    },
    maxBodyBytes: numberFrom(env.COLLECTOR_MAX_BODY_BYTES, 262_144),
    rateLimitPerMinute: numberFrom(env.COLLECTOR_RATE_LIMIT_PER_MINUTE, 120),
    loginRateLimitPerMinute: numberFrom(env.COLLECTOR_LOGIN_RATE_LIMIT_PER_MINUTE, 10),
    corsOrigins: splitList(env.COLLECTOR_CORS_ORIGINS ?? "*"),
    webhooks: {
      urls: splitList(env.BYSENTINEL_WEBHOOK_URLS ?? ""),
      secret: env.BYSENTINEL_WEBHOOK_SECRET ?? DEV_WEBHOOK_SECRET,
      timeoutMs: numberFrom(env.BYSENTINEL_WEBHOOK_TIMEOUT_MS, 3000),
    },
    ai: {
      enabled: env.BYSENTINEL_AI_ENABLED !== "false",
      provider,
      model: env.BYSENTINEL_AI_MODEL ?? defaultModel(provider),
      apiKey: apiKeyFor(provider, env),
      baseUrl: baseUrlFor(provider, env),
      timeoutMs: numberFrom(env.BYSENTINEL_AI_TIMEOUT_MS, 20_000),
    },
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function numberFrom(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function apiKeyFor(provider: ProviderName, env: NodeJS.ProcessEnv): string | undefined {
  return env.BYSENTINEL_AI_API_KEY;
}

function baseUrlFor(_provider: ProviderName, env: NodeJS.ProcessEnv): string | undefined {
  return env.BYSENTINEL_AI_BASE_URL;
}
