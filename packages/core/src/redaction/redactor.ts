import type { RedactionOptions } from "../types/config.js";
import { looksHighEntropy } from "./entropy.js";
import {
  KEY_RULES,
  VALUE_PATTERNS,
  keyRuleFor,
  type RedactionCategory,
  type ValuePattern,
} from "./patterns.js";

const DEFAULTS: Required<RedactionOptions> = {
  redactPII: true,
  redactSecrets: true,
  redactPaymentData: true,
  redactEmails: true,
  redactPhones: true,
  maxDepth: 12,
  maxStringLength: 20_000,
};

/**
 * Structured deploy metadata: repository URLs, commit hashes, versions. Named
 * secret/PII patterns still run on these; only the generic high-entropy
 * fallback is skipped, so a plain `https://github.com/org/repo` or a 40-char
 * commit SHA is not mistaken for an opaque token and wiped out.
 */
const LOW_ENTROPY_METADATA_KEYS = new Set([
  "repositoryUrl",
  "commitSha",
  "branch",
  "version",
  "release",
  "buildTimestamp",
  "requestId",
  "functionName",
]);

function categoryEnabled(cat: RedactionCategory, opts: Required<RedactionOptions>): boolean {
  switch (cat) {
    case "pii":
      return opts.redactPII;
    case "secret":
      return opts.redactSecrets;
    case "payment":
      return opts.redactPaymentData;
    case "email":
      return opts.redactEmails;
    case "phone":
      return opts.redactPhones;
  }
}

/**
 * Redact sensitive substrings inside a single string value.
 *
 * `applyHighEntropyFallback` (default true) controls the generic opaque-token
 * guess. Named secret/PII patterns always run. Callers pass `false` for known
 * structured-metadata fields (see `LOW_ENTROPY_METADATA_KEYS`).
 */
export function redactString(
  input: string,
  options: RedactionOptions = {},
  applyHighEntropyFallback = true,
): string {
  const opts = { ...DEFAULTS, ...options };
  let value = input.length > opts.maxStringLength ? input.slice(0, opts.maxStringLength) : input;

  for (const pattern of VALUE_PATTERNS) {
    if (!categoryEnabled(pattern.category, opts)) continue;
    value = applyPattern(value, pattern);
  }

  // Generic high-entropy fallback for opaque secrets that no named rule caught.
  if (opts.redactSecrets && applyHighEntropyFallback) {
    value = value.replace(/[A-Za-z0-9+/_=.-]{24,}/g, (token) =>
      token.startsWith("[REDACTED") || !looksHighEntropy(token)
        ? token
        : "[REDACTED_HIGH_ENTROPY]",
    );
  }

  return value;
}

function applyPattern(value: string, pattern: ValuePattern): string {
  pattern.regex.lastIndex = 0;
  return value.replace(pattern.regex, (match) =>
    pattern.validate && !pattern.validate(match) ? match : pattern.replacement,
  );
}

/**
 * Deep-redact an arbitrary value (object/array/scalar). Keys matching a
 * `KeyRule` have their whole value replaced; remaining strings are scanned for
 * embedded secrets/PII. Handles cycles and depth/size limits.
 */
export function redact<T>(value: T, options: RedactionOptions = {}): T {
  const opts = { ...DEFAULTS, ...options };
  const seen = new WeakSet<object>();
  return walk(value, opts, seen, 0) as T;
}

function walk(
  value: unknown,
  opts: Required<RedactionOptions>,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (value == null) return value;

  if (typeof value === "string") return redactString(value, opts);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }

  if (depth >= opts.maxDepth) return "[REDACTED_MAX_DEPTH]";

  if (Array.isArray(value)) {
    if (seen.has(value)) return "[REDACTED_CIRCULAR]";
    seen.add(value);
    return value.map((item) => walk(item, opts, seen, depth + 1));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[REDACTED_CIRCULAR]";
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const rule = keyRuleFor(key);
      if (rule && categoryEnabled(rule.category, opts)) {
        out[key] = rule.replacement;
      } else if (typeof child === "string" && LOW_ENTROPY_METADATA_KEYS.has(key)) {
        // Structured metadata: keep named-pattern redaction, skip the entropy guess.
        out[key] = redactString(child, opts, false);
      } else {
        out[key] = walk(child, opts, seen, depth + 1);
      }
    }
    return out;
  }

  // functions, symbols, etc. are dropped.
  return "[REDACTED_UNSUPPORTED]";
}

/** Convenience re-exports for consumers building custom flows. */
export { KEY_RULES, VALUE_PATTERNS };
