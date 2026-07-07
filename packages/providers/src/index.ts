import type {
  AICompletionRequest,
  AICompletionResult,
  AIProvider,
  ProviderConfig,
} from "@bywaretech/bysentinel-core";

export type ProviderName =
  "openai" | "openrouter" | "anthropic" | "deepseek" | "ollama" | "custom-http";

export interface BySentinelProviderConfig extends ProviderConfig {
  provider: ProviderName;
}

export function createProvider(config: BySentinelProviderConfig): AIProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config);
    case "openrouter":
      return new OpenRouterProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "deepseek":
      return new DeepSeekProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    case "custom-http":
      return new CustomHttpProvider(config);
  }
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly isLocal = false;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = requireApiKey(config, "OpenAI");
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? "https://api.openai.com/v1");
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const body = {
      model: request.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      response_format: request.jsonMode ? { type: "json_object" } : undefined,
    };
    const json = await postJson(`${this.baseUrl}/chat/completions`, body, {
      authorization: `Bearer ${this.apiKey}`,
      signal: request.signal,
    });
    return parseOpenAICompatible(json, request.model);
  }
}

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  readonly isLocal = false;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly referer?: string;
  private readonly title?: string;

  constructor(config: ProviderConfig) {
    this.apiKey = requireApiKey(config, "OpenRouter");
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? "https://openrouter.ai/api/v1");
    this.referer = typeof config.referer === "string" ? config.referer : undefined;
    this.title = typeof config.title === "string" ? config.title : "BySentinel";
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const json = await postJson(
      `${this.baseUrl}/chat/completions`,
      {
        model: request.model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        response_format: request.jsonMode ? { type: "json_object" } : undefined,
      },
      {
        authorization: `Bearer ${this.apiKey}`,
        headers: {
          ...(this.referer ? { "HTTP-Referer": this.referer } : {}),
          ...(this.title ? { "X-Title": this.title } : {}),
        },
        signal: request.signal,
      },
    );
    return parseOpenAICompatible(json, request.model);
  }
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly isLocal = false;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = requireApiKey(config, "Anthropic");
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? "https://api.anthropic.com/v1");
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const json = await postJson(
      `${this.baseUrl}/messages`,
      {
        model: request.model,
        system: request.systemPrompt,
        messages: [{ role: "user", content: request.userPrompt }],
        temperature: request.temperature,
        max_tokens: request.maxTokens ?? 1_500,
      },
      {
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: request.signal,
      },
    );
    const o = asRecord(json);
    const content = Array.isArray(o.content)
      ? o.content
          .map((part) => asRecord(part).text)
          .filter((part): part is string => typeof part === "string")
          .join("")
      : "";
    const usage = asRecord(o.usage);
    return {
      content,
      model: typeof o.model === "string" ? o.model : request.model,
      usage: {
        promptTokens: numberOrUndefined(usage.input_tokens),
        completionTokens: numberOrUndefined(usage.output_tokens),
      },
    };
  }
}

export class DeepSeekProvider implements AIProvider {
  readonly name = "deepseek";
  readonly isLocal = false;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = requireApiKey(config, "DeepSeek");
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? "https://api.deepseek.com");
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const body = {
      model: request.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      response_format: request.jsonMode ? { type: "json_object" } : undefined,
    };
    const json = await postJson(`${this.baseUrl}/chat/completions`, body, {
      authorization: `Bearer ${this.apiKey}`,
      signal: request.signal,
    });
    return parseOpenAICompatible(json, request.model);
  }
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly isLocal = true;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig = {}) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? "http://127.0.0.1:11434");
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const json = await postJson(
      `${this.baseUrl}/api/chat`,
      {
        model: request.model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        stream: false,
        format: request.jsonMode ? "json" : undefined,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens,
        },
      },
      { signal: request.signal },
    );
    const o = asRecord(json);
    const message = asRecord(o.message);
    return {
      content: typeof message.content === "string" ? message.content : "",
      model: typeof o.model === "string" ? o.model : request.model,
      usage: {
        promptTokens: numberOrUndefined(o.prompt_eval_count),
        completionTokens: numberOrUndefined(o.eval_count),
      },
    };
  }
}

export class CustomHttpProvider implements AIProvider {
  readonly name = "custom-http";
  readonly isLocal: boolean;
  private readonly url: string;
  private readonly apiKey?: string;

  constructor(config: ProviderConfig) {
    if (!config.baseUrl) throw new Error("custom-http provider requires baseUrl");
    this.url = config.baseUrl;
    this.apiKey = config.apiKey;
    this.isLocal = Boolean(config.isLocal);
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const json = await postJson(
      this.url,
      {
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        jsonMode: request.jsonMode,
      },
      {
        authorization: this.apiKey ? `Bearer ${this.apiKey}` : undefined,
        signal: request.signal,
      },
    );
    const o = asRecord(json);
    const usage = asRecord(o.usage);
    return {
      content: stringFrom(o.content) ?? stringFrom(o.text) ?? stringFrom(o.response) ?? "",
      model: stringFrom(o.model) ?? request.model,
      usage: {
        promptTokens: numberOrUndefined(usage.promptTokens ?? usage.prompt_tokens),
        completionTokens: numberOrUndefined(usage.completionTokens ?? usage.completion_tokens),
      },
    };
  }
}

function parseOpenAICompatible(json: unknown, fallbackModel: string): AICompletionResult {
  const o = asRecord(json);
  const choice = Array.isArray(o.choices) ? asRecord(o.choices[0]) : {};
  const message = asRecord(choice.message);
  const usage = asRecord(o.usage);
  return {
    content: typeof message.content === "string" ? message.content : "",
    model: typeof o.model === "string" ? o.model : fallbackModel,
    usage: {
      promptTokens: numberOrUndefined(usage.prompt_tokens),
      completionTokens: numberOrUndefined(usage.completion_tokens),
    },
  };
}

async function postJson(
  url: string,
  body: unknown,
  options: { authorization?: string; headers?: Record<string, string>; signal?: AbortSignal } = {},
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.authorization ? { authorization: options.authorization } : {}),
      ...options.headers,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = stringFrom(asRecord(json).error) ?? text ?? response.statusText;
    throw new Error(`AI provider request failed (${response.status}): ${message}`);
  }
  return json;
}

function requireApiKey(config: ProviderConfig, provider: string): string {
  if (!config.apiKey) throw new Error(`${provider} provider requires apiKey`);
  return config.apiKey;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
