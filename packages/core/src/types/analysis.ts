/** Structured result the AI analyzer must return. Validated before storage. */

export type AISeverity = "low" | "medium" | "high" | "critical";

export type AICategory =
  | "bug"
  | "performance"
  | "security"
  | "dependency"
  | "configuration"
  | "external-service"
  | "unknown";

export interface AIAffectedArea {
  file?: string;
  functionName?: string;
  line?: number;
}

export interface AISecurityImpact {
  hasSensitiveDataRisk: boolean;
  description?: string;
  recommendedAction?: string;
}

/** One link in the upstream causal chain (roadmap #6). */
export interface AICausalLink {
  /** What happened at this stage, e.g. "API returned HTTP 429". */
  cause: string;
  /** Optional evidence from the incident that supports this link. */
  evidence?: string;
}

/** Bottleneck attribution derived from the execution timeline (roadmap #2). */
export interface AIBottleneck {
  step: string;
  durationMs?: number;
  percentOfTotal?: number;
  description?: string;
}

export interface AIAnalysisResult {
  summary: string;
  likelyCause: string;
  severity: AISeverity;
  category: AICategory;
  affectedArea?: AIAffectedArea;
  suggestedFix: string;
  examplePatch?: string;
  securityImpact?: AISecurityImpact;
  /** Ordered upstream causes, root cause first (roadmap #6). */
  causalChain?: AICausalLink[];
  /** Slowest step attribution when a timeline is present (roadmap #2). */
  bottleneck?: AIBottleneck;
  /** 0..1 */
  confidence: number;
  /** Human explanation of the confidence score (roadmap #11). */
  confidenceReason?: string;
}
