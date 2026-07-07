import type { AIAnalysisResult } from "../types/analysis.js";

export interface AICompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  /** 0..1, lower is more deterministic. */
  temperature?: number;
  maxTokens?: number;
  /** Ask the provider for JSON output when supported. */
  jsonMode?: boolean;
  signal?: AbortSignal;
}

export interface AICompletionResult {
  /** Raw text returned by the model (still needs validation). */
  content: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

/**
 * Common surface every provider (OpenAI, OpenRouter, Anthropic, Ollama, custom)
 * implements. Providers only do transport; JSON parsing/validation lives in the
 * worker via `validateAnalysis`.
 */
export interface AIProvider {
  readonly name: string;
  /** True for providers that run locally (Ollama/LM Studio). Used by strict mode. */
  readonly isLocal: boolean;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}

export interface ProviderFactory {
  (config: ProviderConfig): AIProvider;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  /** Provider-specific extras. */
  [key: string]: unknown;
}

/** Result type helper the worker uses after validation. */
export interface AnalyzeOutcome {
  raw: string;
  analysis?: AIAnalysisResult;
  errors?: string[];
  provider?: string;
  model?: string;
  usage?: AICompletionResult["usage"];
}
