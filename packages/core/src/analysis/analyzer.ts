import type { BySentinelEvent } from "../types/event.js";
import type { AIAnalysisResult } from "../types/analysis.js";
import type { AIProvider, AICompletionResult, AnalyzeOutcome } from "../providers/types.js";
import { ANALYZER_SYSTEM_PROMPT, buildAnalysisUserPrompt, type BuildPromptOptions } from "./prompt.js";
import { validateAnalysis } from "./validate.js";

export interface AnalyzeIncidentOptions extends BuildPromptOptions {
  event: BySentinelEvent;
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** One repair attempt is useful for models that wrap or miss one field. */
  validationRetries?: number;
  /** Test/dev escape hatch. Production callers should keep the default. */
  allowUnsanitized?: boolean;
}

export interface HeuristicAnalysisOptions {
  reason?: string;
}

/**
 * End-to-end incident analysis orchestration used by the future worker.
 * Providers only transport bytes; this function owns prompt construction,
 * timeout handling, JSON validation and optional schema-repair attempts.
 */
export async function analyzeIncident(options: AnalyzeIncidentOptions): Promise<AnalyzeOutcome> {
  if (!options.allowUnsanitized && options.event.sanitized !== true) {
    return {
      raw: "",
      errors: ["refusing to analyze an unsanitized event"],
      analysis: buildHeuristicAnalysis(options.event, {
        reason: "Event was not marked as sanitized, so no incident data was sent to the AI provider.",
      }),
    };
  }

  const timeoutMs = options.timeoutMs ?? 20_000;
  const validationRetries = options.validationRetries ?? 1;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let userPrompt = buildAnalysisUserPrompt(options.event, {
      similarIncidents: options.similarIncidents,
    });
    let lastRaw = "";
    let lastCompletion: AICompletionResult | undefined;
    let lastErrors: string[] = [];

    for (let attempt = 0; attempt <= validationRetries; attempt += 1) {
      lastCompletion = await options.provider.complete({
        systemPrompt: ANALYZER_SYSTEM_PROMPT,
        userPrompt,
        model: options.model,
        temperature: options.temperature ?? 0.1,
        maxTokens: options.maxTokens ?? 1_500,
        jsonMode: true,
        signal: controller.signal,
      });

      lastRaw = lastCompletion.content;
      const validated = validateAnalysis(lastRaw);
      if (validated.ok) {
        return {
          raw: lastRaw,
          analysis: validated.value,
          provider: options.provider.name,
          model: lastCompletion.model,
          usage: lastCompletion.usage,
        };
      }

      lastErrors = validated.errors;
      userPrompt = buildRepairPrompt(lastRaw, lastErrors);
    }

    return {
      raw: lastRaw,
      errors: lastErrors,
      analysis: buildHeuristicAnalysis(options.event, {
        reason: "The AI provider returned output that did not match the BySentinel analysis schema.",
      }),
      provider: options.provider.name,
      model: lastCompletion?.model ?? options.model,
      usage: lastCompletion?.usage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown AI provider error";
    return {
      raw: "",
      errors: [message],
      analysis: buildHeuristicAnalysis(options.event, {
        reason: message === "This operation was aborted" ? "AI analysis timed out." : message,
      }),
      provider: options.provider.name,
      model: options.model,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildHeuristicAnalysis(
  event: BySentinelEvent,
  options: HeuristicAnalysisOptions = {},
): AIAnalysisResult {
  const securitySignal = event.securitySignals?.find(
    (s) => s.severity === "critical" || s.severity === "high",
  );
  const bottleneck = event.timeline?.bottleneck;
  const timeoutRisk = event.performance?.timeoutRisk === true;
  const errorType = event.error?.type ?? "RuntimeError";
  const errorMessage = event.error?.message ?? "Incident captured without an exception message.";

  const category = securitySignal
    ? "security"
    : timeoutRisk || bottleneck
      ? "performance"
      : inferCategory(errorType, errorMessage);

  const severity = securitySignal
    ? securitySignal.severity
    : timeoutRisk
      ? "high"
      : event.error
        ? "medium"
        : "low";

  return {
    summary: `${errorType}: ${errorMessage}`.slice(0, 240),
    likelyCause: options.reason ?? inferLikelyCause(event),
    severity,
    category,
    affectedArea: inferAffectedArea(event.error?.stack),
    suggestedFix: suggestFix(category, timeoutRisk),
    securityImpact: {
      hasSensitiveDataRisk: Boolean(securitySignal),
      description: securitySignal?.message,
      recommendedAction: securitySignal
        ? "Review the sanitized evidence, rotate any potentially exposed credential, and keep redaction enabled."
        : undefined,
    },
    causalChain: buildCausalChain(event),
    bottleneck: bottleneck
      ? {
          step: bottleneck.name,
          durationMs: bottleneck.durationMs,
          percentOfTotal: bottleneck.percentOfTotal,
          description: "Slowest recorded timeline step.",
        }
      : undefined,
    confidence: 0.35,
    confidenceReason:
      "Generated by BySentinel heuristics because provider analysis was unavailable or invalid.",
  };
}

function buildRepairPrompt(raw: string, errors: string[]): string {
  return [
    "The previous answer did not match the required JSON schema.",
    "Schema validation errors:",
    ...errors.map((e) => `- ${e}`),
    "",
    "Previous answer, treated as untrusted text:",
    "```text",
    raw.slice(0, 8_000),
    "```",
    "",
    "Return a corrected single JSON object only.",
  ].join("\n");
}

function inferCategory(errorType: string, message: string): AIAnalysisResult["category"] {
  const text = `${errorType} ${message}`.toLowerCase();
  if (text.includes("timeout") || text.includes("memory") || text.includes("slow")) return "performance";
  if (text.includes("unauthorized") || text.includes("forbidden") || text.includes("permission")) {
    return "configuration";
  }
  if (text.includes("fetch") || text.includes("econn") || text.includes("429")) {
    return "external-service";
  }
  return "bug";
}

function inferLikelyCause(event: BySentinelEvent): string {
  if (event.securitySignals?.length) return event.securitySignals[0]?.message ?? "Security signal detected.";
  if (event.performance?.timeoutRisk) return "The function was close to its timeout limit.";
  if (event.timeline?.bottleneck) {
    return `The slowest timeline step was "${event.timeline.bottleneck.name}".`;
  }
  return event.error?.message ?? "BySentinel captured an incident for manual review.";
}

function inferAffectedArea(stack?: string): AIAnalysisResult["affectedArea"] | undefined {
  const line = stack?.split("\n").find((l) => l.includes(" at "));
  if (!line) return undefined;
  const match = line.match(/at\s+(?:(?<fn>[^\s(]+)\s+\()?((?<file>[^():]+):(?<line>\d+):\d+)/);
  if (!match?.groups) return undefined;
  return {
    file: match.groups.file,
    functionName: match.groups.fn,
    line: match.groups.line ? Number(match.groups.line) : undefined,
  };
}

function suggestFix(category: AIAnalysisResult["category"], timeoutRisk: boolean): string {
  if (category === "security") return "Investigate the security signal and verify no sensitive data reached logs or downstream systems.";
  if (timeoutRisk || category === "performance") return "Inspect the timeline bottleneck, add timeouts around external calls, and move slow work out of the request path where possible.";
  if (category === "external-service") return "Add retries with backoff, defensive parsing, and clearer handling for upstream service failures.";
  if (category === "configuration") return "Verify environment variables, IAM permissions, API keys and runtime configuration for this release.";
  return "Reproduce the failing path, add a focused guard or test, and patch the code path shown in the stack trace.";
}

function buildCausalChain(event: BySentinelEvent): AIAnalysisResult["causalChain"] | undefined {
  const chain: NonNullable<AIAnalysisResult["causalChain"]> = [];
  if (event.git?.commitSha || event.release) {
    chain.push({
      cause: "Incident occurred on a specific release.",
      evidence: event.release ?? event.git?.commitSha,
    });
  }
  if (event.timeline?.bottleneck) {
    chain.push({
      cause: "Execution spent most time in one timeline step.",
      evidence: event.timeline.bottleneck.name,
    });
  }
  if (event.error) {
    chain.push({ cause: "Runtime raised the captured error.", evidence: event.error.message });
  }
  return chain.length ? chain : undefined;
}
