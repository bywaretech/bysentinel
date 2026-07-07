import {
  analyzeIncident,
  buildHeuristicAnalysis,
  DEFAULT_SECURITY_OPTIONS,
  redact,
  type BySentinelEvent,
} from "@bysentinel/core";
import { createProvider } from "@bysentinel/providers";
import type { AISettings } from "./settings.js";
import type { IncidentRecord, StoredAnalysis } from "./storage.js";

export async function analyzeRecord(
  incident: IncidentRecord,
  ai: AISettings,
): Promise<StoredAnalysis> {
  // Feed repository code fetched at the incident's commit SHA to the model.
  // customContext is part of the analyzer prompt's evidence block. Injected
  // BEFORE prepareForAI so hardcoded secrets in code are redacted too.
  let enriched = incident.latestEvent;
  if (incident.sourceContext?.files.length) {
    enriched = {
      ...enriched,
      customContext: {
        ...(enriched.customContext ?? {}),
        sourceCodeAtCommit: {
          commitSha: incident.sourceContext.commitSha,
          files: incident.sourceContext.files.map((file) => ({
            path: file.path,
            startLine: file.startLine,
            focusLine: file.focusLine,
            content: file.content,
          })),
        },
      },
    };
  }
  const event = prepareForAI(enriched);
  if (!ai.enabled) {
    return {
      status: "fallback",
      result: buildHeuristicAnalysis(event, { reason: "AI analysis is disabled." }),
      createdAt: new Date().toISOString(),
    };
  }

  try {
    const provider = createProvider({
      provider: ai.provider,
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
    });
    const outcome = await analyzeIncident({
      event,
      provider,
      model: ai.model,
      timeoutMs: ai.timeoutMs,
      similarIncidents: incident.occurrences > 1 ? [{ summary: incident.analysis?.result.summary ?? "Similar incident", occurrences: incident.occurrences }] : undefined,
    });

    return {
      status: outcome.errors?.length ? "fallback" : "ok",
      provider: outcome.provider,
      model: outcome.model,
      raw: outcome.raw,
      errors: outcome.errors,
      usage: outcome.usage,
      result: outcome.analysis ?? buildHeuristicAnalysis(event),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown analyzer error";
    return {
      status: "error",
      errors: [message],
      result: buildHeuristicAnalysis(event, { reason: message }),
      createdAt: new Date().toISOString(),
    };
  }
}

function prepareForAI(event: BySentinelEvent): BySentinelEvent {
  const sanitized = redact(event, DEFAULT_SECURITY_OPTIONS) as BySentinelEvent;
  sanitized.sanitized = true;
  return sanitized;
}
