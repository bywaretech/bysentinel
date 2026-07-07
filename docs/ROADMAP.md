# BySentinel — Advanced Features Roadmap

Vision: evolve from a log collector into an **AI Runtime Engineer** that
understands what happened, why, what changed, and how to fix it.

Legend: ✅ implemented · 🟡 MVP support exists, needs deeper backend/dashboard
work · ⏳ future dedicated services/integrations.

| # | Feature | Status | Where |
| --- | --- | --- | --- |
| 1 | **Execution Timeline** (`BySentinel.start()`/`step()`/`finish()`) | ✅ | `core/timeline`, SDK `startRuntime` |
| 2 | Automatic Bottleneck Detection | 🟡 slowest-step computed in SDK; analyzer + fallback attribute it via `AIBottleneck` | `Timeline.bottleneck`, `analyzeIncident` |
| 3 | Historical Baseline Analysis | ⏳ needs stored history | worker |
| 4 | **Release / Git Correlation** (SHA, branch, version, release, build ts) | ✅ capture; ⏳ correlation analytics | SDK `git.ts`, `GitContext` |
| 5 | Source Code Context Analysis (GitHub/GitLab/Bitbucket) | ⏳ | worker + integrations |
| 6 | **Intelligent Root Cause / Causal Chain** | 🟡 `AICausalLink[]` in schema + prompt + fallback | `analysis` |
| 7 | Similar Incident Clustering | 🟡 file-backed MVP grouping by fingerprint | `core/fingerprint`, collector |
| 8 | Runtime Behavior Learning (abnormal flow) | ⏳ needs baselines + timeline history | worker |
| 9 | **Security Behavior Detection** | ✅ signal detection in SDK; AI explanation via prompt | `core/security/signals` |
| 10 | Performance Trend Intelligence | ⏳ | worker + dashboard |
| 11 | **AI Confidence Score + Reason** | ✅ schema (`confidence`, `confidenceReason`) + prompt + validation | `analysis` |
| 12 | **Suggested Code Patch** | ✅ schema (`examplePatch`) + prompt + validation | `analysis` |
| 13 | AI Chat Per Incident | ⏳ | worker + dashboard |
| 14 | **Incident Timeline** (chronological) | ✅ timeline steps carry absolute timestamps | `core/timeline` |
| 15 | Automatic Pull Request Suggestions | ⏳ future, human-approval required | worker + integrations |
| 16 | AI-Powered Operational Insights | ⏳ | worker + dashboard |

## What shipped in the SDK/core layer

- **`BySentinel.start()` timeline** — sequential steps auto-timed; the failing
  step is highlighted on error; a single bottleneck is computed; step metadata is
  redacted. Doubles as the chronological incident timeline (#1, #2, #14).
- **Git/release correlation** — `commitSha`, `branch`, `version`, `release`,
  `buildTimestamp`, `repositoryUrl` resolved from BySentinel env vars or common
  CI providers (GitHub Actions, GitLab CI, Vercel) (#4).
- **Analysis schema** extended with `causalChain`, `bottleneck`,
  `confidenceReason` and the analyzer prompt now asks for them (#2, #6, #11).
- **AI orchestration** — `analyzeIncident` builds the prompt, calls any
  `AIProvider`, validates the JSON, performs one schema-repair attempt and falls
  back to deterministic heuristics when provider output is unavailable or unsafe.
- **Provider transports** — `@bywaretech/bysentinel-providers` implements OpenAI,
  OpenRouter, Anthropic, Ollama/local and custom HTTP without vendor SDK lock-in.
- **Security signals** already detected in-SDK and passed to the analyzer (#9).

## Next backend milestones that unlock the ⏳ items

1. **Collector hardening** — move file storage to Postgres, add key rotation,
   audit logs and stronger tenant boundaries.
2. **Worker** — queue consumption around `analyzeIncident`, persistence of raw
   model output/usage/errors, historical baselines (#3, #8, #10), source-code
   fetch by commit SHA (#5).
3. **Dashboard** — timeline/causal-chain visualization, clusters, per-incident
   AI chat, operational insights (#13, #16), PR draft suggestions (#15).
