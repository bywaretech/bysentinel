import { createHash } from "node:crypto";
import type { ErrorInfo } from "./types/event.js";

export interface FingerprintInput {
  project: string;
  environment: string;
  error?: Pick<ErrorInfo, "type" | "stack">;
  functionName?: string;
}

/**
 * Normalize a stack trace so semantically-identical errors hash the same:
 * strips line/column numbers, absolute paths, hex addresses, uuids and digits
 * that vary per invocation. Keeps the top frames' call sites.
 */
export function normalizeStack(stack: string | undefined, maxFrames = 5): string {
  if (!stack) return "";
  const frames = stack
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("at "));

  const normalized = (frames.length ? frames : stack.split("\n"))
    .slice(0, maxFrames)
    .map((line) =>
      line
        .replace(/\(.*?\)/g, "") // drop file location parens
        .replace(/[A-Za-z]:\\[^\s)]+|\/[^\s):]+/g, "") // drop paths
        .replace(/:\d+:\d+/g, "") // line:col
        .replace(/0x[0-9a-f]+/gi, "") // addresses
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "") // uuid
        .replace(/\d+/g, "") // remaining digits
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

  return normalized.join(" | ");
}

/**
 * Stable fingerprint:
 *   project + environment + error.type + normalized stack + function name
 */
export function fingerprint(input: FingerprintInput): string {
  const parts = [
    input.project,
    input.environment,
    input.error?.type ?? "unknown",
    normalizeStack(input.error?.stack),
    input.functionName ?? "",
  ];
  return createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 32);
}
