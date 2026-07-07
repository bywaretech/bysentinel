import type { AIAnalysisResult, AICategory, AISeverity } from "../types/analysis.js";

const SEVERITIES: AISeverity[] = ["low", "medium", "high", "critical"];
const CATEGORIES: AICategory[] = [
  "bug",
  "performance",
  "security",
  "dependency",
  "configuration",
  "external-service",
  "unknown",
];

export type ValidationResult =
  | { ok: true; value: AIAnalysisResult }
  | { ok: false; errors: string[] };

/**
 * Validate a model's JSON output before it is trusted/stored. Accepts a raw
 * string (possibly wrapped in ```json fences) or an already-parsed object.
 */
export function validateAnalysis(input: unknown): ValidationResult {
  let obj: unknown = input;
  if (typeof input === "string") {
    const parsed = safeParse(input);
    if (!parsed.ok) return { ok: false, errors: [parsed.error] };
    obj = parsed.value;
  }

  if (typeof obj !== "object" || obj === null) {
    return { ok: false, errors: ["analysis is not an object"] };
  }
  const o = obj as Record<string, unknown>;
  const errors: string[] = [];

  const str = (k: string, required: boolean) => {
    const v = o[k];
    if (v === undefined) {
      if (required) errors.push(`${k} is required`);
      return undefined;
    }
    if (typeof v !== "string") errors.push(`${k} must be a string`);
    return v;
  };

  str("summary", true);
  str("likelyCause", true);
  str("suggestedFix", true);
  str("examplePatch", false);
  str("confidenceReason", false);

  if (!SEVERITIES.includes(o.severity as AISeverity)) {
    errors.push(`severity must be one of ${SEVERITIES.join(", ")}`);
  }
  if (!CATEGORIES.includes(o.category as AICategory)) {
    errors.push(`category must be one of ${CATEGORIES.join(", ")}`);
  }
  if (typeof o.confidence !== "number" || o.confidence < 0 || o.confidence > 1) {
    errors.push("confidence must be a number between 0 and 1");
  }

  if (o.affectedArea !== undefined) {
    if (typeof o.affectedArea !== "object" || o.affectedArea === null) {
      errors.push("affectedArea must be an object");
    }
  }
  if (o.securityImpact !== undefined) {
    const si = o.securityImpact as Record<string, unknown>;
    if (typeof si !== "object" || si === null || typeof si.hasSensitiveDataRisk !== "boolean") {
      errors.push("securityImpact.hasSensitiveDataRisk must be a boolean");
    }
  }

  if (o.causalChain !== undefined) {
    if (
      !Array.isArray(o.causalChain) ||
      !o.causalChain.every(
        (l) => l != null && typeof (l as Record<string, unknown>).cause === "string",
      )
    ) {
      errors.push("causalChain must be an array of { cause: string }");
    }
  }

  if (o.bottleneck !== undefined) {
    const b = o.bottleneck as Record<string, unknown>;
    if (typeof b !== "object" || b === null || typeof b.step !== "string") {
      errors.push("bottleneck.step must be a string");
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: obj as unknown as AIAnalysisResult };
}

function tryParse(candidate: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch {
    return { ok: false };
  }
}

function safeParse(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = input.trim();

  // 1. Direct parse first. This is the common case and, crucially, handles
  //    clean JSON whose string values contain their own ``` fenced code blocks
  //    (e.g. examplePatch with a ```javascript snippet). Stripping fences first
  //    would wrongly extract that inner block.
  const direct = tryParse(trimmed);
  if (direct.ok) return direct;

  // 2. The whole response is wrapped in a fence: ```json { ... } ``` — strip it
  //    only when the fence encloses the entire message (anchored), not when a
  //    fence merely appears somewhere inside.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced?.[1]) {
    const inner = tryParse(fenced[1].trim());
    if (inner.ok) return inner;
  }

  // 3. Last resort: grab the outermost {...}.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const obj = tryParse(trimmed.slice(start, end + 1));
    if (obj.ok) return obj;
  }

  return { ok: false, error: "response is not valid JSON" };
}
