import type { Severity, Category } from "./types";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export function severityRank(sev?: string): number {
  const i = SEVERITY_ORDER.indexOf((sev as Severity) ?? "low");
  return i === -1 ? 99 : i;
}

export function severityToken(sev?: string): string {
  switch (sev) {
    case "critical":
      return "sev-critical";
    case "high":
      return "sev-high";
    case "medium":
      return "sev-medium";
    case "low":
      return "sev-low";
    default:
      return "sev-pending";
  }
}

const CATEGORY_LABELS: Record<Category, string> = {
  bug: "Bug",
  performance: "Performance",
  security: "Security",
  dependency: "Dependency",
  configuration: "Configuration",
  "external-service": "External service",
  unknown: "Unknown",
};

export function categoryLabel(category?: string): string {
  return CATEGORY_LABELS[(category as Category) ?? "unknown"] ?? "Unknown";
}

export function relativeTime(iso?: string): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function absoluteTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

export function formatMs(ms?: number): string {
  if (ms == null || Number.isNaN(ms)) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function providerLabel(provider?: string): string {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "openrouter":
      return "OpenRouter";
    case "anthropic":
      return "Anthropic";
    case "deepseek":
      return "DeepSeek";
    case "ollama":
      return "Ollama / local";
    case "custom-http":
      return "Custom HTTP";
    default:
      return provider ?? "-";
  }
}

export function defaultModel(provider: string): string {
  switch (provider) {
    case "openai":
      return "gpt-4.1-mini";
    case "openrouter":
      return "openai/gpt-4.1-mini";
    case "anthropic":
      return "claude-3-5-haiku-latest";
    case "deepseek":
      return "deepseek-v4-flash";
    case "ollama":
      return "qwen2.5:7b";
    default:
      return "runtime-analyzer";
  }
}

/** Normalize a git remote (https or scp-style ssh) into a browsable https URL. */
export function repoWebUrl(repositoryUrl?: string): string | undefined {
  if (!repositoryUrl) return undefined;
  const raw = repositoryUrl.trim();
  // scp-style: git@host:owner/repo(.git)
  const ssh = raw.match(/^(?:ssh:\/\/)?git@([^:/]+)[:/](.+?)(?:\.git)?\/?$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  const url = raw.replace(/\.git$/, "").replace(/\/$/, "");
  return /^https?:\/\//.test(url) ? url : undefined;
}

/** Build a commit permalink for GitHub / GitLab / Bitbucket-style hosts. */
export function commitUrl(repositoryUrl?: string, sha?: string): string | undefined {
  const base = repoWebUrl(repositoryUrl);
  if (!base || !sha) return undefined;
  if (base.includes("gitlab")) return `${base}/-/commit/${sha}`;
  if (base.includes("bitbucket")) return `${base}/commits/${sha}`;
  return `${base}/commit/${sha}`;
}

/** "owner/repo" label from a repository URL, for compact display. */
export function repoLabel(repositoryUrl?: string): string | undefined {
  const base = repoWebUrl(repositoryUrl);
  if (!base) return undefined;
  const path = base.replace(/^https?:\/\/[^/]+\//, "");
  return path || base;
}
