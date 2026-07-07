/** Configuration shared between the SDK and the collector's second-stage sanitizer. */

export interface CaptureOptions {
  /** Include the request body in the event. Default: false (security-first). */
  requestBody?: boolean;
  /** Include request headers. Default: false. */
  headers?: boolean;
  /** Include the query string. Default: true. */
  query?: boolean;
  /** Include the error stack trace. Default: true. */
  stackTrace?: boolean;
  /** Collect performance metadata (duration, memory, timeout risk). Default: true. */
  performance?: boolean;
}

export interface SecurityOptions {
  /** Master switch for the redaction engine. Default: true. */
  sanitize?: boolean;
  /** Redact PII (CPF, CNPJ, RG, passport, bank data, ...). Default: true. */
  redactPII?: boolean;
  /** Redact detected secrets/tokens/keys. Default: true. */
  redactSecrets?: boolean;
  /** Redact card numbers, CVV, Pix keys and payment tokens. Default: true. */
  redactPaymentData?: boolean;
  /** Redact email addresses. Default: true. */
  redactEmails?: boolean;
  /** Redact phone numbers. Default: true. */
  redactPhones?: boolean;
  /**
   * Strict mode: never let request bodies/headers leave the process even if
   * `capture.requestBody`/`capture.headers` are true. Default: false.
   */
  strictMode?: boolean;
}

export type AIMode = "disabled" | "local-only" | "self-hosted" | "cloud";

export interface AIOptions {
  enabled?: boolean;
  mode?: AIMode;
  provider?: string;
  model?: string;
  /** When false, request bodies are stripped before reaching the provider. */
  sendBodyToAI?: boolean;
  /** When false, request headers are stripped before reaching the provider. */
  sendHeadersToAI?: boolean;
  /** Refuse any external provider when true (paired with local-only mode). */
  allowExternalProvider?: boolean;
}

export interface RedactionOptions
  extends Pick<
    SecurityOptions,
    "redactPII" | "redactSecrets" | "redactPaymentData" | "redactEmails" | "redactPhones"
  > {
  /** Placeholder used when a whole value is redacted by key match. */
  maxDepth?: number;
  /** Strings longer than this are truncated before scanning (DoS guard). */
  maxStringLength?: number;
}

export const DEFAULT_SECURITY_OPTIONS: Required<SecurityOptions> = {
  sanitize: true,
  redactPII: true,
  redactSecrets: true,
  redactPaymentData: true,
  redactEmails: true,
  redactPhones: true,
  strictMode: false,
};

export const DEFAULT_CAPTURE_OPTIONS: Required<CaptureOptions> = {
  requestBody: false,
  headers: false,
  query: true,
  stackTrace: true,
  performance: true,
};
