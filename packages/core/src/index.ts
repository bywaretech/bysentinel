// Types
export * from "./types/index.js";

// Redaction / secret detection
export * from "./redaction/index.js";

// Security signal detection
export { detectSecuritySignals } from "./security/signals.js";

// Fingerprinting
export { fingerprint, normalizeStack, type FingerprintInput } from "./fingerprint.js";

// Execution timeline / bottleneck
export {
  Timeline,
  type ExecutionTimeline,
  type TimelineStep,
  type TimelineStepStatus,
  type TimelineBottleneck,
  type TimelineOptions,
} from "./timeline/timeline.js";

// AI analysis helpers
export {
  ANALYZER_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
  type BuildPromptOptions,
} from "./analysis/prompt.js";
export {
  analyzeIncident,
  buildHeuristicAnalysis,
  type AnalyzeIncidentOptions,
  type HeuristicAnalysisOptions,
} from "./analysis/analyzer.js";
export { validateAnalysis, type ValidationResult } from "./analysis/validate.js";

// Provider abstraction
export type {
  AIProvider,
  AICompletionRequest,
  AICompletionResult,
  ProviderConfig,
  ProviderFactory,
  AnalyzeOutcome,
} from "./providers/types.js";

// Utilities
export { newEventId, nowIso } from "./util/id.js";
