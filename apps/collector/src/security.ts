import {
  DEV_ADMIN_TOKEN,
  DEV_API_KEY,
  DEV_DEFAULT_PASSWORD,
  DEV_WEBHOOK_SECRET,
  type CollectorConfig,
} from "./config.js";

export interface SecurityFinding {
  level: "fatal" | "warn";
  field: string;
  message: string;
}

const MIN_ADMIN_TOKEN = 16;
const MIN_PASSWORD = 12;

/**
 * Inspect the resolved config for insecure defaults and weak secrets.
 * `fatal` findings block the boot in production; `warn` findings never block.
 */
export function collectSecurityFindings(
  config: CollectorConfig,
  isProduction: boolean,
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  if (config.adminToken === DEV_ADMIN_TOKEN) {
    findings.push({
      level: "fatal",
      field: "BYSENTINEL_ADMIN_TOKEN",
      message: "the admin token is still the development default. Generate one: openssl rand -hex 32",
    });
  } else if (isProduction && config.adminToken.length < MIN_ADMIN_TOKEN) {
    findings.push({
      level: "warn",
      field: "BYSENTINEL_ADMIN_TOKEN",
      message: `the admin token is short (< ${MIN_ADMIN_TOKEN} chars). Prefer: openssl rand -hex 32`,
    });
  }

  if (config.apiKeys.some((key) => key === DEV_API_KEY)) {
    findings.push({
      level: "fatal",
      field: "BYSENTINEL_API_KEYS",
      message: "an ingest API key is still the development default. Generate one: openssl rand -hex 32",
    });
  }

  if (config.defaultUser.password === DEV_DEFAULT_PASSWORD) {
    findings.push({
      level: "fatal",
      field: "BYSENTINEL_DEFAULT_PASSWORD",
      message:
        "the seeded admin password is still 'adminbysentinel'. Set a strong BYSENTINEL_DEFAULT_PASSWORD before first boot.",
    });
  } else if (isProduction && config.defaultUser.password.length < MIN_PASSWORD) {
    findings.push({
      level: "warn",
      field: "BYSENTINEL_DEFAULT_PASSWORD",
      message: `the seeded admin password is short (< ${MIN_PASSWORD} chars).`,
    });
  }

  if (config.webhooks.urls.length > 0 && config.webhooks.secret === DEV_WEBHOOK_SECRET) {
    findings.push({
      level: "fatal",
      field: "BYSENTINEL_WEBHOOK_SECRET",
      message: "outbound webhooks are enabled but the signing secret is still the default.",
    });
  }

  if (isProduction && config.corsOrigins.includes("*")) {
    findings.push({
      level: "warn",
      field: "COLLECTOR_CORS_ORIGINS",
      message: "CORS is open to any origin (*). Restrict it to your domain in production.",
    });
  }

  return findings;
}

/**
 * Refuse to start in production when insecure defaults remain. Non-production
 * boots only warn. `BYSENTINEL_ALLOW_INSECURE_DEFAULTS=true` downgrades the
 * fatal check to a warning (escape hatch; do not use it on a real server).
 */
export function assertSecureConfig(
  config: CollectorConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const isProduction = env.NODE_ENV === "production";
  const allowInsecure = env.BYSENTINEL_ALLOW_INSECURE_DEFAULTS === "true";
  const findings = collectSecurityFindings(config, isProduction);

  for (const warning of findings.filter((f) => f.level === "warn")) {
    console.warn(`[bysentinel] security warning: ${warning.field} — ${warning.message}`);
  }

  const fatal = findings.filter((f) => f.level === "fatal");
  if (fatal.length === 0) return;

  if (!isProduction || allowInsecure) {
    for (const finding of fatal) {
      console.warn(`[bysentinel] insecure default: ${finding.field} — ${finding.message}`);
    }
    if (isProduction && allowInsecure) {
      console.warn(
        "[bysentinel] BYSENTINEL_ALLOW_INSECURE_DEFAULTS=true set — starting despite insecure defaults. Do NOT do this on a real deployment.",
      );
    }
    return;
  }

  const lines = fatal.map((f) => `  - ${f.field}: ${f.message}`);
  throw new Error(
    [
      "Refusing to start with insecure defaults in production (NODE_ENV=production).",
      ...lines,
      "",
      "Fix the values above (see .env.example), or set BYSENTINEL_ALLOW_INSECURE_DEFAULTS=true to override (not recommended).",
    ].join("\n"),
  );
}
