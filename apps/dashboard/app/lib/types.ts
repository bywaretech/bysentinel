// Mirrors the collector API shapes (@bywaretech/bysentinel-core + collector storage).
// Kept local so the dashboard has no build-time dependency on the collector.

export type Severity = "low" | "medium" | "high" | "critical";
export type Category =
  | "bug"
  | "performance"
  | "security"
  | "dependency"
  | "configuration"
  | "external-service"
  | "unknown";

export interface AffectedArea {
  file?: string;
  functionName?: string;
  line?: number;
}

export interface SecurityImpact {
  hasSensitiveDataRisk: boolean;
  description?: string;
  recommendedAction?: string;
}

export interface CausalLink {
  cause: string;
  evidence?: string;
}

export interface Bottleneck {
  step: string;
  durationMs?: number;
  percentOfTotal?: number;
  description?: string;
}

export interface AnalysisResult {
  summary: string;
  likelyCause: string;
  severity: Severity;
  category: Category;
  affectedArea?: AffectedArea;
  suggestedFix: string;
  examplePatch?: string;
  securityImpact?: SecurityImpact;
  causalChain?: CausalLink[];
  bottleneck?: Bottleneck;
  confidence: number;
  confidenceReason?: string;
}

export interface StoredAnalysis {
  status: "ok" | "fallback" | "error";
  provider?: string;
  model?: string;
  raw?: string;
  errors?: string[];
  usage?: { promptTokens?: number; completionTokens?: number };
  result: AnalysisResult;
  createdAt: string;
}

export interface SecuritySignal {
  type: string;
  severity: Severity;
  message: string;
  location?: string;
}

export interface TimelineStep {
  name: string;
  durationMs?: number;
  startOffsetMs?: number;
  status?: string;
}

export interface ExecutionTimeline {
  totalMs?: number;
  steps?: TimelineStep[];
  bottleneck?: { name?: string; durationMs?: number };
}

export interface BySentinelEvent {
  id: string;
  timestamp: string;
  project: string;
  environment: string;
  release?: string;
  runtime?: { provider?: string; service?: string; language?: string; version?: string };
  lambda: {
    functionName?: string;
    functionVersion?: string;
    requestId?: string;
    memoryLimitMb?: string;
    remainingTimeMs?: number;
    coldStart?: boolean;
  };
  git?: {
    commitSha?: string;
    branch?: string;
    version?: string;
    release?: string;
    buildTimestamp?: string;
    repositoryUrl?: string;
  };
  error?: { type: string; message: string; stack?: string };
  performance?: { durationMs?: number; timeoutRisk?: boolean; memoryUsedMb?: number };
  request?: { method?: string; path?: string };
  timeline?: ExecutionTimeline;
  securitySignals?: SecuritySignal[];
  customContext?: Record<string, unknown>;
  sanitized: boolean;
}

export interface SourceFileSnippet {
  path: string;
  startLine: number;
  focusLine?: number;
  content: string;
}

export interface SourceContext {
  commitSha: string;
  repositoryUrl: string;
  files: SourceFileSnippet[];
  fetchedAt: string;
  warnings: string[];
}

export interface SimulationRun {
  status: "ok" | "error";
  functionName: string;
  commitSha: string;
  handler: string;
  payload: unknown;
  response?: string;
  functionError?: string;
  logs?: string;
  error?: string;
  durationMs: number;
  createdAt: string;
}

export interface Incident {
  id: string;
  fingerprint: string;
  project: string;
  environment: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrences: number;
  latestEvent: BySentinelEvent;
  events?: BySentinelEvent[];
  analysis?: StoredAnalysis;
  sourceContext?: SourceContext;
  simulation?: SimulationRun;
}

export type AIProvider =
  "openai" | "openrouter" | "anthropic" | "deepseek" | "ollama" | "custom-http";

export interface PublicAISettings {
  enabled: boolean;
  provider: AIProvider;
  model: string;
  baseUrl?: string;
  timeoutMs: number;
  hasApiKey: boolean;
}

export type GitAuthType = "none" | "http" | "ssh";

export interface PublicGitRepository {
  project: string;
  url: string;
  authType: GitAuthType;
  username?: string;
  sourceDir?: string;
  handler?: string;
  hasToken: boolean;
  hasSshKey: boolean;
}

export interface PublicGitSettings {
  repositories: PublicGitRepository[];
}

export interface SandboxSettings {
  enabled: boolean;
  ministackUrl: string;
  region: string;
  runtime: string;
  timeoutMs: number;
}

export type UserRole = "admin" | "viewer";

export interface PublicUser {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}
