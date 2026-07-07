# BySentinel — Status do Projeto

> Última atualização: 2026-07-06
> Estado geral: **MVP + engenheiro de incidentes**: SDK, providers, collector (usuários, git, sandbox), dashboard Nuxt dedicado, análise por IA com código-fonte, reprodução em ministack e Docker.

## Resumo rápido

| Camada                                                                            | Estado                                                                | Testes             |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------ |
| `packages/core`                                                                   | ✅ Concluído                                                          | 49 passando        |
| `packages/aws-lambda` (SDK)                                                       | ✅ Concluído                                                          | 22 passando        |
| `packages/providers`                                                              | ✅ Concluído                                                          | 5 passando         |
| `apps/collector`                                                                  | ✅ Concluído (API-only: ingest + IA + usuários + git + sandbox)       | 7 passando         |
| `examples/aws-lambda-node`                                                        | ✅ Concluído (demo end-to-end)                                        | —                  |
| Documentação e comunidade (README, SECURITY, ROADMAP, CONTRIBUTING, AI/ARCH docs) | ✅ Concluído                                                          | —                  |
| Docker Compose (collector + dashboard + ministack)                                | ✅ Concluído                                                          | —                  |
| `apps/worker` dedicado                                                            | ⏳ Futuro                                                             | —                  |
| `apps/dashboard` Nuxt 4 dedicado                                                  | ✅ Concluído (login/usuários, overview, incidentes, IA, git, sandbox) | typecheck/build ✅ |

**Verificação atual:** `pnpm build` ✅ · `pnpm test` 97 testes · `pnpm typecheck` 9/9 · `docker compose config` (dev+prod) ✅ · pipeline código→IA, webhook direto, simulação em ministack e hardening de segurança testados ao vivo.

**Bugfix (2026-07-07):** `validateAnalysis`/`safeParse` (core) rejeitava JSON válido quando o `examplePatch` continha um bloco ` ```javascript ` — a regex pegava a **primeira** cerca interna. Agora tenta `JSON.parse` direto primeiro e só remove cercas que envolvem a resposta inteira (âncora `^...$`). Reproduzido ao vivo (DeepSeek caía em fallback "did not match schema") e confirmado corrigido: re-análise → `status: ok`, confiança 0.95.

**Bugfix + melhoria de Release (2026-07-07):** a engine de redação (`redactString`) apagava `git.repositoryUrl` como high-entropy (charset incluía `/` `.`). Corrigido: chaves de metadados estruturados (`repositoryUrl`, `commitSha`, `branch`, `version`, `release`, `buildTimestamp`, ...) pulam o fallback de alta entropia mas mantêm os padrões nomeados de segredo. Card de Release no detalhe agora usa todos os campos reais do SDK (commit **linkado** ao permalink GitHub/GitLab/Bitbucket, branch, version/release, buildTimestamp, repository linkado). Verificado ao vivo.

**Open source (2026-07-07):** README reescrito (banner SVG animado em `docs/assets/banner.svg`, seção "incident engineer" com o fluxo erro→commit→código→IA→sandbox, login/conta default corrigidos, tabela de API completa, security model atualizado, roadmap). Templates `.github/ISSUE_TEMPLATE/*` + `PULL_REQUEST_TEMPLATE.md`. Secret scan limpo (só `AKIA...EXAMPLE` de teste). **Ainda NÃO é repo git** — falta `git init` + commit inicial + push antes de publicar.

### Pipeline "engenheiro de incidentes" (novo, 2026-07-06)

Erro → commit SHA → clone raso no SHA exato → leitura dos arquivos do stack trace → código entra como evidência na análise da IA → (opcional) empacota e sobe a função no ministack, replica o request sanitizado e anexa resposta + logs ao incidente.

- **Usuários/login**: contas com senha (scrypt) no collector; login por conta ou admin token no dashboard; roles admin/viewer; cookies httpOnly assinados.
- **Git**: repositório por projeto (HTTPS+token, chave SSH ou público/`file://`); segredos ficam só no collector e nunca voltam ao cliente; token via `http.extraheader` (não persiste em `.git/config`).
- **Sandbox**: settings de URL/região/runtime; zip writer próprio (sem deps); API Lambda LocalStack-compatible; resultado `SimulationRun` no incidente.
- **Rotas novas do collector**: `POST /api/auth/login`, `GET/POST /api/users`, `DELETE /api/users/:id`, `GET/POST /api/settings/git`, `GET/POST /api/settings/sandbox`, `POST /api/incidents/:id/context`, `POST /api/incidents/:id/simulate`.
- **Conta default**: `bysentinel` / `adminbysentinel` seedada no primeiro boot (troque via `BYSENTINEL_DEFAULT_USER`/`BYSENTINEL_DEFAULT_PASSWORD` antes de instalar); aviso no dashboard enquanto ela existir.
- **Produção**: `docker-compose.prod.yml` com Caddy (domínio → dashboard; `/v1/*` e `/health` → collector), dashboard e ministack internos.

### Hardening de segurança (novo, 2026-07-07)

- **Boot guard de produção** (`security.ts`): com `NODE_ENV=production`, o collector **recusa subir** se admin token / API key / senha default continuarem os valores de desenvolvimento (mensagem clara + exit 1). Fora de produção só avisa. Escape hatch: `BYSENTINEL_ALLOW_INSECURE_DEFAULTS=true`. Dev compose usa `NODE_ENV=development`; prod compose `NODE_ENV=production`.
- **Login**: rate limit dedicado (`COLLECTOR_LOGIN_RATE_LIMIT_PER_MINUTE`, default 10) por usuário + backstop global; verificação de tempo constante contra hash dummy (sem enumeração de usuário). No dashboard, rate limit por IP real (X-Forwarded-For).
- **Último admin** não pode ser removido (400).
- **Viewer é read-only**: rotas de analyze/context/simulate e settings (ai/git/sandbox) exigem admin no proxy Nitro (`requireAdmin`, 401 sem sessão / 403 sem permissão); UI esconde os botões e mostra "Read only".
- **Headers do dashboard**: plugin Nitro aplica CSP estrito + `X-Frame-Options: DENY`, nosniff, referrer-policy, permissions-policy, COOP em toda resposta.
- Providers de IA agora incluem **DeepSeek** (backend + UI).

---

## ✅ O que já foi feito

### 1. Scaffold do monorepo (já existia)

- pnpm workspaces + Turbo, TypeScript strict (`noUncheckedIndexedAccess`), Apache-2.0, Node 24+ for tooling; AWS Lambda Node.js 20+ supported by the SDK.
- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.prettierrc.json`, `.gitignore`, `.env.example`.

### 2. `packages/core` — motor compartilhado (sem dependências)

- **Tipos**: `BySentinelEvent`, `AIAnalysisResult`, `SecuritySignal`, `GitContext`, `ExecutionTimeline`, opções de `capture`/`security`/`ai`.
- **Motor de redação** (`redact`, `redactString`): duas camadas (por nome de chave + por padrão de valor), seguro contra ciclos/profundidade/tamanho.
  - PII: CPF, CNPJ, RG, passaporte, conta bancária.
  - Pagamento: cartão (validado por **Luhn**), CVV, chave Pix.
  - Segredos: Bearer/Basic/JWT, AWS/GitHub/GitLab/Slack/Stripe/OpenAI/Anthropic, chaves privadas, URLs de banco.
  - E-mail e telefone (toggleáveis).
  - Fallback por **alta entropia** (Shannon) para tokens opacos.
- **Detecção de sinais de segurança** (`detectSecuritySignals`): SSRF/metadata, SQLi leakage, path traversal, command injection, segredo no body/headers, user-agent de scanner, rota admin.
- **Fingerprint** (`fingerprint`, `normalizeStack`): agrupamento estável de incidentes.
- **Execution Timeline** (`Timeline`): passos cronometrados, bottleneck, timestamps absolutos, clock injetável.
- **Helpers de IA**: `ANALYZER_SYSTEM_PROMPT` (endurecido contra prompt injection), `buildAnalysisUserPrompt`, `validateAnalysis` (valida JSON do modelo, tolera ```json).
- **Orquestração de análise por IA**: `analyzeIncident` monta prompt, chama provider, aplica timeout, valida schema, tenta reparo de JSON uma vez e retorna fallback heurístico seguro quando o modelo falha.
- **Fallback heurístico**: classifica bug/performance/security/config/external-service, extrai área afetada do stack, usa bottleneck/timeline/security signals e explica baixa confiança.
- **Abstração de provider de IA**: interface `AIProvider` / `AICompletionRequest` / `AICompletionResult`.

### 3. `packages/aws-lambda` — SDK Lambda

- `withBySentinel(handler, options)`: captura exceção sanitizada, re-lança o erro original, nunca quebra a Lambda.
- `captureException` / `captureMessage`: captura manual (herda escopo via `AsyncLocalStorage`).
- `BySentinel.start()` / `startRuntime()`: execution timeline integrada ao evento.
- Detecção de **cold start**, **timeout risk** e uso de memória.
- **Correlação Git/release** (`git.ts`): SHA, branch, versão, release, build timestamp — de env `BYSENTINEL_*` ou CIs (GitHub Actions, GitLab, Vercel).
- **Deduplicação de erro**: captura manual + re-throw = **1 incidente** (não 2).
- Transporte **assíncrono, com timeout limitado e fail-silent** (collector fora do ar não afeta a função).
- `delivery.webhooks` / `BYSENTINEL_DIRECT_WEBHOOK_URLS`: fan-out opcional do mesmo evento sanitizado direto do SDK para webhooks externos, junto com o collector ou em modo webhook-only.
- `strictMode` força body/headers a nunca saírem do processo; metadata do timeline também é redigida.

### 4. `examples/aws-lambda-node`

- Handler de pagamento instrumentado (timeline + captura manual + config de segurança/IA).
- `scripts/invoke-local.mjs`: sobe um mini-collector HTTP local e imprime o evento sanitizado com timeline, passo `failed`, bottleneck e git — demo end-to-end real.

### 5. Documentação

- `README.md` profissional para GitHub (visão geral, quick start, SDK, dashboard, segurança, deploy e roadmap).
- `docs/SECURITY.md` (redação, detecção de segredos, isolamento de IA, defesa contra prompt injection, redação do timeline).
- `docs/AI_PROVIDERS.md` (OpenAI/OpenRouter/Anthropic/Ollama/custom HTTP).
- `docs/ARCHITECTURE.md` (fluxo de eventos, limites de dados e evolução planejada).
- `docs/SMOKE_TEST.md` (validação local Docker + pacote externo).
- `docs/ROADMAP.md` (mapeia os 16 recursos avançados: feito / schema pronto / depende de backend).
- READMEs de `packages/core` e `packages/aws-lambda`.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md` e `SECURITY.md` na raiz.

### 6. `packages/providers` — transporte de IA

- Pacote `@bysentinel/providers` com providers sem SDK externo, usando `fetch` nativo do Node 24 no collector/build e Node 20+ no Lambda.
- Providers implementados: OpenAI, OpenRouter, Anthropic, Ollama/local e `custom-http`.
- Suporte a JSON mode quando o provider aceita, timeout via `AbortSignal`, parsing de usage/tokens e testes unitários com `fetch` mockado.

### 7. `apps/collector` — ingest, storage e IA

- `POST /v1/events` com API key, limite de payload, CORS, rate limit por API key e validação mínima de `BySentinelEvent`.
- API protegida por admin token via Basic/Bearer auth.
- Raiz `/` API-only com metadados do serviço; UI fica no dashboard Nuxt dedicado.
- Webhooks de saída assinados com HMAC-SHA256, timestamp e idempotency key.
- Segunda camada de sanitização com `core.redact` antes de persistir.
- Storage em arquivo JSON persistido em volume Docker, agrupamento por fingerprint e ocorrências.
- Análise automática no ingest com `analyzeIncident`; sem provider/chave, usa fallback heurístico seguro.
- Configuração de IA pelo dashboard/API: provider, modelo, base URL, chave e timeout persistidos em `/data`; o frontend nunca recebe a chave armazenada.
- APIs: `GET /health`, `GET /api/incidents`, `GET /api/incidents/:id`, `POST /api/incidents/:id/analyze`, `GET/POST /api/settings/ai`.

### 8. Docker/Deploy

- `Dockerfile` multi-stage.
- `docker-compose.yml` com volume persistente; Ollama/local AI roda externamente via URL configurada no dashboard.
- `docker-compose.prod.yml` + Caddy para VPS com HTTPS automático.
- `docs/SELF_HOSTING.md` com quick start, AI cloud/local e notas de produção.
- `scripts/smoke-collector.mjs` para validar ingest em VPS/CI.
- `scripts/smoke-e2e.mjs` para validar ingest, listagem, análise e não exposição de API key de IA.
- `scripts/release-pack.mjs` / `pnpm release:pack` para gerar tarballs limpos em `dist-packs/`.
- Workflow `.github/workflows/release.yml` com typecheck/test/lint/pack, artefatos npm e publicação opcional em npm/GHCR.

### 9. Roadmap avançado — o que já entrou na camada SDK/core/providers/collector

| #   | Recurso                      | Estado                                       |
| --- | ---------------------------- | -------------------------------------------- |
| 1   | Execution Timeline           | ✅                                           |
| 2   | Bottleneck Detection         | 🟡 (cálculo no SDK + análise/fallback de IA) |
| 4   | Git/Release Correlation      | ✅ (captura)                                 |
| 6   | Causal Chain                 | 🟡 (schema + prompt + fallback heurístico)   |
| 9   | Security Behavior Detection  | ✅ (detecção no SDK)                         |
| 11  | AI Confidence Score + Reason | ✅ (schema + prompt + validação)             |
| 12  | Suggested Code Patch         | ✅ (schema + prompt + validação)             |
| 14  | Incident Timeline            | ✅                                           |

---

## ⏳ O que falta

### A. Hardening do backend

- Migrar storage em arquivo para Postgres/Prisma quando sair do MVP leve.
- Rate limiting real por API key, rotação de chaves, audit logs e multi-tenant formal.
- Fila BullMQ/Redis para análise assíncrona em alto volume.

### B. `apps/worker` dedicado

- Consumir fila, agrupar erros similares, 2ª sanitização, chamar `analyzeIncident`, salvar `AIAnalysis`, disparar webhooks.
- Retry de falhas transitórias; marcar falha com segurança.
- Baseline histórico (#3), leitura de código-fonte por commit SHA (#5), trend intelligence (#10).

### C. Próximos upgrades da IA

- Persistir raw output, erros de validação, usage/tokens, provider/model e fallback heurístico no banco.
- Adicionar análise com contexto de código-fonte por commit SHA e diff da release.
- Criar avaliações sintéticas para comparar modelos em causal chain, bottleneck attribution e patch suggestion.

### D. Entrega de Webhook (segura)

- Assinatura HMAC-SHA256, header de timestamp, proteção contra replay, idempotency key, retry com backoff exponencial, TLS-only, IP allowlist opcional.

### E. `apps/dashboard` dedicado — próximos refinamentos

- Multi-projeto avançado, filtros salvos e páginas dedicadas para webhooks/security.
- Chat de IA por incidente e comparação de modelos/providers.
- Sanitização de markdown caso passemos a renderizar respostas ricas da IA.

### F. Infra e DevEx

- **Docker Compose**: collector, worker, dashboard, postgres e redis.
- CI (GitHub Actions): dependency scanning, secret scanning (gitleaks), SBOM, CodeQL, eslint security, lockfile enforcement.
- `git init` + commit inicial (ainda **não** é repositório git; nada commitado).

### G. Recursos avançados que dependem do backend (roadmap)

| #   | Recurso                                           | Depende de                               |
| --- | ------------------------------------------------- | ---------------------------------------- |
| 3   | Baseline histórico                                | worker + histórico no banco              |
| 5   | Análise de código-fonte (GitHub/GitLab/Bitbucket) | worker + integrações                     |
| 7   | Clustering de incidentes similares                | collector/worker (fingerprint já existe) |
| 8   | Aprendizado de comportamento (fluxo anormal)      | worker + baselines                       |
| 10  | Performance Trend Intelligence                    | worker + dashboard                       |
| 13  | Chat de IA por incidente                          | worker + dashboard                       |
| 15  | Sugestão automática de Pull Request               | worker + integrações                     |
| 16  | Insights operacionais                             | worker + dashboard                       |

---

## Escopo do MVP (referência do briefing)

Monorepo TS · SDK Lambda ✅ · Providers OpenAI/OpenRouter/Ollama (+Anthropic/custom) ✅ · Collector MVP ✅ · Dashboard básico ✅ · IA no ingest ✅ · Redaction engine ✅ · Docker Compose ✅ · Worker dedicado ⏳ · Schema Postgres ⏳ · Webhook delivery ⏳.

## Ordem de execução acordada

Core + SDK + Providers + Collector/Dashboard/Docker ✅ → Worker dedicado → Dashboard Nuxt → Postgres/Webhooks.
