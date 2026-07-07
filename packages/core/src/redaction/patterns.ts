/**
 * Value- and key-based redaction rules.
 *
 * Ordering matters: more specific patterns must run before generic ones
 * (e.g. `sk-ant-` before `sk-`, JWT before Bearer). The redactor applies
 * `VALUE_PATTERNS` in array order.
 */

export type RedactionCategory = "pii" | "secret" | "payment" | "email" | "phone";

export interface ValuePattern {
  name: string;
  category: RedactionCategory;
  regex: RegExp;
  replacement: string;
  /** Optional guard: return false to keep the original match. */
  validate?: (match: string) => boolean;
}

/** Luhn checksum used to avoid redacting arbitrary 16-digit numbers. */
export function luhnValid(digits: string): boolean {
  const num = digits.replace(/\D/g, "");
  if (num.length < 13 || num.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = num.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Applied in order. All regexes are global so `String.replace` hits every match.
 */
export const VALUE_PATTERNS: ValuePattern[] = [
  // ── Secrets (most specific first) ─────────────────────────────
  {
    name: "private-key",
    category: "secret",
    regex:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  {
    name: "jwt",
    category: "secret",
    regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: "[REDACTED_JWT]",
  },
  {
    name: "bearer-token",
    category: "secret",
    regex: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: "[REDACTED_BEARER_TOKEN]",
  },
  {
    name: "basic-auth",
    category: "secret",
    regex: /Basic\s+[A-Za-z0-9+/]+=*/g,
    replacement: "[REDACTED_BASIC_AUTH]",
  },
  {
    name: "aws-access-key-id",
    category: "secret",
    regex: /\b(?:AKIA|ASIA|AIDA|AROA)[0-9A-Z]{16}\b/g,
    replacement: "[REDACTED_AWS_ACCESS_KEY_ID]",
  },
  {
    name: "github-token",
    category: "secret",
    regex: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g,
    replacement: "[REDACTED_GITHUB_TOKEN]",
  },
  {
    name: "gitlab-token",
    category: "secret",
    regex: /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
    replacement: "[REDACTED_GITLAB_TOKEN]",
  },
  {
    name: "slack-token",
    category: "secret",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
    replacement: "[REDACTED_SLACK_TOKEN]",
  },
  {
    name: "stripe-key",
    category: "secret",
    regex: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
    replacement: "[REDACTED_STRIPE_KEY]",
  },
  {
    name: "anthropic-key",
    category: "secret",
    regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
    replacement: "[REDACTED_ANTHROPIC_KEY]",
  },
  {
    name: "openai-key",
    category: "secret",
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
    replacement: "[REDACTED_OPENAI_KEY]",
  },
  {
    name: "database-url",
    category: "secret",
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|amqp):\/\/[^\s"'<>]+/gi,
    replacement: "[REDACTED_DATABASE_URL]",
  },

  // ── Payment ───────────────────────────────────────────────────
  {
    name: "credit-card",
    category: "payment",
    // 13–19 digits optionally grouped by spaces or dashes.
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    replacement: "[REDACTED_CARD]",
    validate: luhnValid,
  },

  // ── PII (Brazil-focused + general) ────────────────────────────
  {
    name: "cnpj",
    category: "pii",
    regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
    replacement: "[REDACTED_CNPJ]",
  },
  {
    name: "cpf",
    category: "pii",
    regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    replacement: "[REDACTED_CPF]",
  },

  // ── Contact info (toggled separately) ─────────────────────────
  {
    name: "email",
    category: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    name: "phone-br",
    category: "phone",
    // +55 (11) 91234-5678 and common variants.
    regex: /\b(?:\+?55\s?)?(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}\b/g,
    replacement: "[REDACTED_PHONE]",
  },
];

/**
 * Key-name rules. Keys are normalized (lowercased, non-alphanumerics stripped)
 * before matching so `card_number`, `cardNumber` and `card-number` all match.
 */
export interface KeyRule {
  keys: string[];
  category: RedactionCategory;
  replacement: string;
}

export const KEY_RULES: KeyRule[] = [
  { keys: ["password", "passwd", "pwd"], category: "secret", replacement: "[REDACTED_PASSWORD]" },
  {
    keys: ["authorization", "authtoken", "accesstoken", "refreshtoken", "idtoken"],
    category: "secret",
    replacement: "[REDACTED_AUTHORIZATION]",
  },
  { keys: ["cookie", "setcookie"], category: "secret", replacement: "[REDACTED_COOKIE]" },
  {
    keys: ["sessionid", "session", "sid"],
    category: "secret",
    replacement: "[REDACTED_SESSION_ID]",
  },
  {
    keys: ["apikey", "secret", "clientsecret", "token", "webhooksecret", "privatekey"],
    category: "secret",
    replacement: "[REDACTED_SECRET]",
  },
  {
    keys: ["awssecretaccesskey", "awssecretkey", "awssessiontoken"],
    category: "secret",
    replacement: "[REDACTED_AWS_SECRET]",
  },
  {
    keys: ["databaseurl", "connectionstring", "dburl"],
    category: "secret",
    replacement: "[REDACTED_DATABASE_URL]",
  },
  // PII
  { keys: ["cpf"], category: "pii", replacement: "[REDACTED_CPF]" },
  { keys: ["cnpj"], category: "pii", replacement: "[REDACTED_CNPJ]" },
  { keys: ["rg"], category: "pii", replacement: "[REDACTED_RG]" },
  { keys: ["passport", "passaporte"], category: "pii", replacement: "[REDACTED_PASSPORT]" },
  {
    keys: ["bankaccount", "accountnumber", "iban", "agencia", "conta"],
    category: "pii",
    replacement: "[REDACTED_BANK_ACCOUNT]",
  },
  // Payment
  { keys: ["cardnumber", "pan", "ccnumber"], category: "payment", replacement: "[REDACTED_CARD]" },
  { keys: ["cvv", "cvc", "securitycode"], category: "payment", replacement: "[REDACTED_CVV]" },
  { keys: ["pixkey", "pix"], category: "payment", replacement: "[REDACTED_PIX_KEY]" },
  // Contact
  { keys: ["email", "mail"], category: "email", replacement: "[REDACTED_EMAIL]" },
  { keys: ["phone", "telefone", "celular", "mobile"], category: "phone", replacement: "[REDACTED_PHONE]" },
];

export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const KEY_LOOKUP = new Map<string, KeyRule>();
for (const rule of KEY_RULES) {
  for (const k of rule.keys) KEY_LOOKUP.set(k, rule);
}

export function keyRuleFor(key: string): KeyRule | undefined {
  return KEY_LOOKUP.get(normalizeKey(key));
}
