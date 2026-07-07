# @bysentinel/core

Shared, dependency-free building blocks for BySentinel. Used by the SDK,
collector and worker.

## Exports

- **Types** — `BySentinelEvent`, `AIAnalysisResult`, `SecuritySignal`,
  `CaptureOptions`, `SecurityOptions`, `AIOptions`, …
- **Redaction / secret detection**
  - `redact(value, options)` — deep, cycle-safe object redaction (key + value layers)
  - `redactString(str, options)` — redact a single string
  - `looksHighEntropy`, `shannonEntropy`, `luhnValid`
- **Security signals** — `detectSecuritySignals({ request, error })`
- **Fingerprinting** — `fingerprint(input)`, `normalizeStack(stack)`
- **AI helpers** — `ANALYZER_SYSTEM_PROMPT`, `buildAnalysisUserPrompt(event)`,
  `validateAnalysis(input)`, `analyzeIncident({ event, provider, model })`,
  `buildHeuristicAnalysis(event)`
- **Provider abstraction** — `AIProvider`, `AICompletionRequest`, `AICompletionResult`
- **Utils** — `newEventId()`, `nowIso()`

## Example

```ts
import { redact, detectSecuritySignals, fingerprint } from "@bysentinel/core";

const clean = redact({ authorization: "Bearer x.y.z", cpf: "123.456.789-09" });
// { authorization: "[REDACTED_AUTHORIZATION]", cpf: "[REDACTED_CPF]" }

const signals = detectSecuritySignals({ request: { body: { file: "../../etc/passwd" } } });
// [{ type: "path-traversal", severity: "high", ... }]

const id = fingerprint({ project: "p", environment: "prod", error: { type: "TypeError", stack } });
```

See [docs/SECURITY.md](../../docs/SECURITY.md) for the redaction model.
