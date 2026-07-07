# Security Policy

BySentinel is security-first software. The SDK redacts sensitive data before it
leaves the Lambda process, and the collector applies a second sanitization pass
before storing or analyzing events.

## Supported Versions

BySentinel is pre-1.0. Security fixes target the latest `main` branch until the
first stable release.

## Reporting a Vulnerability

Please do not open public issues for suspected vulnerabilities. Email the
maintainers or use GitHub private vulnerability reporting once the repository is
published.

Include:

- Affected package or component.
- Reproduction steps.
- Impact and expected exposure.
- Whether secrets, PII or payment data may be involved.

## Deployment Guidance

- Change `BYSENTINEL_API_KEYS` and `BYSENTINEL_ADMIN_TOKEN` before exposing a
  collector publicly.
- Put the collector behind HTTPS.
- Keep `capture.requestBody` and `capture.headers` disabled unless needed.
- Use `security.strictMode` for regulated environments.
- Keep AI disabled in the dashboard if external AI calls are not allowed.
- Use a private network or authenticated proxy for local AI providers such as
  Ollama.

See [docs/SECURITY.md](docs/SECURITY.md) for implementation details.
