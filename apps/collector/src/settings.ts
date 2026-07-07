import type { ProviderName } from "@bywaretech/bysentinel-providers";

export const AI_PROVIDERS = [
  "openai",
  "openrouter",
  "anthropic",
  "deepseek",
  "ollama",
  "custom-http",
] as const;

export interface AISettings {
  enabled: boolean;
  provider: ProviderName;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs: number;
}

export interface PublicAISettings extends Omit<AISettings, "apiKey"> {
  hasApiKey: boolean;
}

export function defaultModel(provider: ProviderName): string {
  if (provider === "openai") return "gpt-4.1-mini";
  if (provider === "openrouter") return "openai/gpt-4.1-mini";
  if (provider === "anthropic") return "claude-3-5-haiku-latest";
  if (provider === "deepseek") return "deepseek-v4-flash";
  if (provider === "ollama") return "qwen2.5:7b";
  return "runtime-analyzer";
}

export function publicAISettings(settings: AISettings): PublicAISettings {
  return {
    enabled: settings.enabled,
    provider: settings.provider,
    model: settings.model,
    baseUrl: settings.baseUrl,
    timeoutMs: settings.timeoutMs,
    hasApiKey: Boolean(settings.apiKey),
  };
}

export function normalizeAISettings(input: unknown, current: AISettings): AISettings {
  if (typeof input !== "object" || input === null) throw new Error("settings must be an object");
  const record = input as Record<string, unknown>;
  const provider = normalizeProvider(record.provider, current.provider);
  const model = normalizeText(record.model, current.model || defaultModel(provider), 160);
  const apiKey = normalizeSecret(record.apiKey, current.apiKey);
  const baseUrl = normalizeOptionalUrl(record.baseUrl, current.baseUrl);
  const timeoutMs = normalizeTimeout(record.timeoutMs, current.timeoutMs);
  const enabled = typeof record.enabled === "boolean" ? record.enabled : current.enabled;

  return {
    enabled,
    provider,
    model: model || defaultModel(provider),
    apiKey,
    baseUrl: requireUrlWhenEnabled(provider, baseUrl, enabled),
    timeoutMs,
  };
}

function requireUrlWhenEnabled(
  provider: ProviderName,
  baseUrl: string | undefined,
  enabled: boolean,
): string | undefined {
  if (enabled && (provider === "ollama" || provider === "custom-http") && !baseUrl) {
    throw new Error(`${provider} provider requires a base URL`);
  }
  return baseUrl;
}

function normalizeProvider(value: unknown, fallback: ProviderName): ProviderName {
  if (typeof value !== "string") return fallback;
  if ((AI_PROVIDERS as readonly string[]).includes(value)) return value as ProviderName;
  throw new Error("unsupported AI provider");
}

function normalizeText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error("value is too long");
  return trimmed;
}

function normalizeSecret(value: unknown, fallback: string | undefined): string | undefined {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 4096) throw new Error("api key is too long");
  return trimmed;
}

function normalizeOptionalUrl(value: unknown, fallback: string | undefined): string | undefined {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 2048) throw new Error("base URL is too long");
  const parsed = new URL(trimmed);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("base URL must use http or https");
  return parsed.toString().replace(/\/$/, "");
}

function normalizeTimeout(value: unknown, fallback: number): number {
  const timeout = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(timeout)) return fallback;
  if (timeout < 1000 || timeout > 120_000)
    throw new Error("timeout must be between 1000 and 120000 ms");
  return Math.trunc(timeout);
}
