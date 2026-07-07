<script setup lang="ts">
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Wrench,
  GitCommitHorizontal,
  ShieldAlert,
  Clock,
  Boxes,
  Snowflake,
  ListTree,
  FileWarning,
  CircleDot,
  GitBranch,
  FlaskConical,
  Play,
  FileCode2,
  TriangleAlert,
  Eye,
  ExternalLink,
} from "lucide-vue-next";
import type { Incident } from "~/lib/types";
import {
  absoluteTime,
  relativeTime,
  categoryLabel,
  providerLabel,
  formatMs,
  commitUrl,
  repoWebUrl,
  repoLabel,
} from "~/lib/display";

const route = useRoute();
const api = useApi();
const { success, error: toastError } = useToast();
const { isAdmin } = useAuth();

const id = computed(() => route.params.id as string);

const { data: incident, pending, error, refresh } = await useAsyncData(
  () => `incident-${id.value}`,
  () => api.get<Incident>(`/incidents/${id.value}`),
);

useHead(() => ({
  title: incident.value
    ? `${incident.value.analysis?.result?.summary ?? "Incident"} — BySentinel`
    : "Incident — BySentinel",
}));

const analyzing = ref(false);
async function runAnalysis() {
  if (analyzing.value) return;
  analyzing.value = true;
  try {
    await api.post(`/incidents/${id.value}/analyze`);
    await refresh();
    success("Analysis complete", "The incident was re-analyzed.");
  } catch (err: unknown) {
    toastError(
      "Analysis failed",
      (err as { statusMessage?: string }).statusMessage ?? "Try again in a moment.",
    );
  } finally {
    analyzing.value = false;
  }
}

const fetchingContext = ref(false);
async function fetchContext() {
  if (fetchingContext.value) return;
  fetchingContext.value = true;
  try {
    await api.post(`/incidents/${id.value}/context`);
    await refresh();
    success("Code fetched", "Repository files at the failing commit are attached. Re-analyze to use them.");
  } catch (err: unknown) {
    toastError(
      "Could not fetch code",
      (err as { statusMessage?: string }).statusMessage ?? "Check Settings > Git.",
    );
  } finally {
    fetchingContext.value = false;
  }
}

const simulating = ref(false);
async function runSimulation() {
  if (simulating.value) return;
  simulating.value = true;
  try {
    await api.post(`/incidents/${id.value}/simulate`);
    await refresh();
    success("Simulation finished", "Sandbox run attached to the incident.");
  } catch (err: unknown) {
    toastError(
      "Simulation failed",
      (err as { statusMessage?: string }).statusMessage ?? "Check Settings > Sandbox.",
    );
  } finally {
    simulating.value = false;
  }
}

const a = computed(() => incident.value?.analysis?.result);
const stored = computed(() => incident.value?.analysis);
const ev = computed(() => incident.value?.latestEvent);
const confidencePct = computed(() =>
  a.value ? Math.round((a.value.confidence ?? 0) * 100) : 0,
);
const rawJson = computed(() =>
  ev.value ? JSON.stringify(ev.value, null, 2) : "",
);

const securitySignals = computed(() => ev.value?.securitySignals ?? []);

// Release correlation is captured by the SDK from the deploy environment / CI
// (BYSENTINEL_* vars, GitHub Actions, GitLab CI, Vercel). All real event data.
const git = computed(() => ev.value?.git);
const releaseLabel = computed(
  () => ev.value?.release || git.value?.release || git.value?.version,
);
const commitHref = computed(() => commitUrl(git.value?.repositoryUrl, git.value?.commitSha));
const repoHref = computed(() => repoWebUrl(git.value?.repositoryUrl));
const repoName = computed(() => repoLabel(git.value?.repositoryUrl));
const hasRelease = computed(
  () => Boolean(git.value?.commitSha || git.value?.branch || releaseLabel.value || repoHref.value),
);
</script>

<template>
  <AppTopbar :title="incident?.project ?? 'Incident'" subtitle="Incident detail">
    <template #actions>
      <Button v-if="isAdmin" size="sm" :disabled="analyzing" @click="runAnalysis">
        <Loader2 v-if="analyzing" class="size-3.5 animate-spin" />
        <Sparkles v-else class="size-3.5" />
        {{ incident?.analysis ? "Re-analyze" : "Analyze" }}
      </Button>
      <Badge v-else variant="muted" class="hidden sm:inline-flex">
        <Eye class="size-3" /> Read only
      </Badge>
    </template>
  </AppTopbar>

  <main class="mx-auto w-full max-w-[1400px] flex-1 p-5">
    <NuxtLink
      to="/incidents"
      class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft class="size-4" />
      All incidents
    </NuxtLink>

    <!-- Loading -->
    <div v-if="pending && !incident" class="space-y-4">
      <Skeleton class="h-24 w-full" />
      <div class="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Skeleton class="h-96 w-full" />
        <Skeleton class="h-96 w-full" />
      </div>
    </div>

    <Card v-else-if="error" class="border-destructive/30">
      <CardContent class="flex flex-col items-center gap-3 py-12 text-center">
        <span class="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <FileWarning class="size-5" />
        </span>
        <p class="text-sm font-medium">Incident not found</p>
        <p class="max-w-sm text-sm text-muted-foreground">
          It may have been removed, or the collector is unreachable.
        </p>
        <Button variant="secondary" size="sm" @click="refresh">Try again</Button>
      </CardContent>
    </Card>

    <template v-else-if="incident">
      <!-- Header -->
      <div class="mb-5 flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <SeverityBadge :severity="a?.severity" />
          <Badge v-if="a" variant="secondary">{{ categoryLabel(a.category) }}</Badge>
          <Badge v-if="stored" variant="muted" class="font-mono">
            {{
              stored.status === "ok"
                ? `${providerLabel(stored.provider)} · ${stored.model}`
                : stored.status === "fallback"
                  ? "Heuristic fallback"
                  : "Analysis error"
            }}
          </Badge>
        </div>
        <h1 class="text-xl font-semibold leading-snug tracking-tight">
          {{ a?.summary || ev?.error?.message || "Pending analysis" }}
        </h1>
        <p class="font-mono text-xs text-muted-foreground">
          {{ ev?.error?.type }}<span v-if="ev?.error?.type"> · </span>{{ incident.fingerprint }}
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <!-- Main column -->
        <div class="min-w-0 space-y-4">
          <!-- Root cause + fix -->
          <Card>
            <CardHeader class="flex-row items-center justify-between">
              <CardTitle class="flex items-center gap-2">
                <Sparkles class="size-4 text-primary" />
                AI analysis
              </CardTitle>
              <div v-if="a" class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">Confidence</span>
                <div class="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-primary"
                    :style="{ width: `${confidencePct}%` }"
                  />
                </div>
                <span class="font-mono text-xs tabular-nums">{{ confidencePct }}%</span>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <div v-if="!a" class="text-sm text-muted-foreground">
                This incident has not been analyzed yet. Run the analysis to generate a
                root cause and suggested fix.
              </div>
              <template v-else>
                <div>
                  <p class="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Likely cause
                  </p>
                  <p class="text-sm leading-relaxed text-foreground/90">{{ a.likelyCause }}</p>
                </div>

                <div class="rounded-lg border border-border/60 bg-muted/25 p-3.5">
                  <p class="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Wrench class="size-3.5" />
                    Suggested fix
                  </p>
                  <p class="text-sm leading-relaxed text-foreground/90">{{ a.suggestedFix }}</p>
                </div>

                <p v-if="a.confidenceReason" class="text-xs text-muted-foreground">
                  {{ a.confidenceReason }}
                </p>
              </template>
            </CardContent>
          </Card>

          <!-- Causal chain -->
          <Card v-if="a?.causalChain?.length">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <ListTree class="size-4 text-muted-foreground" />
                Causal chain
              </CardTitle>
              <CardDescription>Root cause first</CardDescription>
            </CardHeader>
            <CardContent>
              <ol class="relative flex flex-col gap-4 pl-5">
                <li
                  v-for="(link, idx) in a.causalChain"
                  :key="idx"
                  class="relative"
                >
                  <span
                    class="absolute -left-5 top-1 grid size-3.5 place-items-center rounded-full border border-primary/40 bg-background"
                  >
                    <span class="size-1.5 rounded-full bg-primary" />
                  </span>
                  <span
                    v-if="idx < a.causalChain.length - 1"
                    class="absolute -left-[13px] top-5 h-[calc(100%+0.5rem)] w-px bg-border"
                  />
                  <p class="text-sm text-foreground/90">{{ link.cause }}</p>
                  <p v-if="link.evidence" class="mt-0.5 font-mono text-xs text-muted-foreground">
                    {{ link.evidence }}
                  </p>
                </li>
              </ol>
            </CardContent>
          </Card>

          <!-- Source context (code at the failing commit) -->
          <Card>
            <CardHeader class="flex-row items-center justify-between">
              <div>
                <CardTitle class="flex items-center gap-2">
                  <GitBranch class="size-4 text-muted-foreground" />
                  Code at commit
                </CardTitle>
                <CardDescription>
                  {{
                    incident.sourceContext
                      ? `Fetched from ${incident.sourceContext.repositoryUrl} @ ${incident.sourceContext.commitSha.slice(0, 10)}`
                      : ev?.git?.commitSha
                        ? "Clone the repository at the failing commit and read the involved files."
                        : "This incident has no commit SHA, so code cannot be correlated."
                  }}
                </CardDescription>
              </div>
              <Button
                v-if="isAdmin"
                variant="secondary"
                size="sm"
                :disabled="fetchingContext || !ev?.git?.commitSha"
                @click="fetchContext"
              >
                <Loader2 v-if="fetchingContext" class="size-3.5 animate-spin" />
                <FileCode2 v-else class="size-3.5" />
                {{ incident.sourceContext ? "Refresh code" : "Fetch code" }}
              </Button>
            </CardHeader>
            <CardContent v-if="incident.sourceContext" class="space-y-3">
              <div
                v-for="file in incident.sourceContext.files"
                :key="file.path"
                class="space-y-1.5"
              >
                <p class="font-mono text-xs text-muted-foreground">
                  {{ file.path }}
                  <span v-if="file.focusLine" class="text-sev-high">:{{ file.focusLine }}</span>
                </p>
                <CodeBlock :code="file.content" :label="file.path.split('/').pop()" max-height="16rem" />
              </div>
              <p
                v-for="warning in incident.sourceContext.warnings"
                :key="warning"
                class="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <TriangleAlert class="size-3.5 text-sev-medium" /> {{ warning }}
              </p>
              <p class="text-xs text-muted-foreground">
                These files are included as evidence the next time the AI analysis runs.
              </p>
            </CardContent>
          </Card>

          <!-- Sandbox simulation -->
          <Card>
            <CardHeader class="flex-row items-center justify-between">
              <div>
                <CardTitle class="flex items-center gap-2">
                  <FlaskConical class="size-4 text-muted-foreground" />
                  Sandbox simulation
                </CardTitle>
                <CardDescription>
                  Deploys the code at this commit on ministack and replays the sanitized request.
                </CardDescription>
              </div>
              <Button
                v-if="isAdmin"
                variant="secondary"
                size="sm"
                :disabled="simulating || !ev?.git?.commitSha"
                @click="runSimulation"
              >
                <Loader2 v-if="simulating" class="size-3.5 animate-spin" />
                <Play v-else class="size-3.5" />
                {{ incident.simulation ? "Run again" : "Run simulation" }}
              </Button>
            </CardHeader>
            <CardContent v-if="incident.simulation" class="space-y-3">
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <Badge :variant="incident.simulation.status === 'ok' ? 'default' : 'muted'"
                  :class="incident.simulation.status === 'error' ? 'border-sev-high/40 bg-sev-high/10 text-sev-high' : undefined">
                  {{ incident.simulation.status === "ok" ? "Reproduced without error" : "Failure reproduced" }}
                </Badge>
                <span class="font-mono text-muted-foreground">
                  {{ incident.simulation.functionName }} · {{ incident.simulation.handler }} ·
                  {{ formatMs(incident.simulation.durationMs) }}
                </span>
              </div>
              <p v-if="incident.simulation.error" class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {{ incident.simulation.error }}
              </p>
              <template v-else>
                <div v-if="incident.simulation.functionError" class="rounded-md border border-sev-high/25 bg-sev-high/10 px-3 py-2 text-xs">
                  Function error: <span class="font-mono">{{ incident.simulation.functionError }}</span>
                </div>
                <div v-if="incident.simulation.response" class="space-y-1.5">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Response</p>
                  <CodeBlock :code="incident.simulation.response" label="response" max-height="12rem" />
                </div>
                <div v-if="incident.simulation.logs" class="space-y-1.5">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Execution log</p>
                  <CodeBlock :code="incident.simulation.logs" label="logs" max-height="14rem" />
                </div>
              </template>
            </CardContent>
          </Card>

          <!-- Suggested patch -->
          <Card v-if="a?.examplePatch">
            <CardHeader>
              <CardTitle>Suggested patch</CardTitle>
              <CardDescription>Review before applying. Generated by the model.</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock :code="a.examplePatch" label="patch" />
            </CardContent>
          </Card>

          <!-- Execution timeline -->
          <Card v-if="ev?.timeline?.steps?.length">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Clock class="size-4 text-muted-foreground" />
                Execution timeline
              </CardTitle>
              <CardDescription>
                Total {{ formatMs(ev.timeline.totalMs) }}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineView :timeline="ev.timeline" />
            </CardContent>
          </Card>

          <!-- Stack trace -->
          <Card v-if="ev?.error?.stack">
            <CardHeader>
              <CardTitle>Stack trace</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock :code="ev.error.stack" label="stack" max-height="16rem" />
            </CardContent>
          </Card>

          <!-- Raw event -->
          <Card>
            <CardHeader>
              <CardTitle>Sanitized event</CardTitle>
              <CardDescription>Secrets are redacted before storage.</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock :code="rawJson" label="event.json" />
            </CardContent>
          </Card>
        </div>

        <!-- Side column -->
        <div class="min-w-0 space-y-4">
          <!-- Security -->
          <Card
            v-if="a?.securityImpact?.hasSensitiveDataRisk || securitySignals.length"
            class="border-sev-high/25"
          >
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-sev-high">
                <ShieldAlert class="size-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <p v-if="a?.securityImpact?.description" class="text-sm text-foreground/90">
                {{ a.securityImpact.description }}
              </p>
              <p
                v-if="a?.securityImpact?.recommendedAction"
                class="rounded-md bg-sev-high/10 px-3 py-2 text-xs text-foreground/90"
              >
                {{ a.securityImpact.recommendedAction }}
              </p>
              <ul v-if="securitySignals.length" class="flex flex-col gap-2">
                <li
                  v-for="(sig, idx) in securitySignals"
                  :key="idx"
                  class="flex items-start gap-2 text-xs"
                >
                  <CircleDot class="mt-0.5 size-3.5 shrink-0 text-sev-high" />
                  <span>
                    <span class="font-mono">{{ sig.type }}</span>
                    <span class="text-muted-foreground">: {{ sig.message }}</span>
                    <span v-if="sig.location" class="block font-mono text-muted-foreground/70">
                      {{ sig.location }}
                    </span>
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <!-- Metadata -->
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent class="space-y-0">
              <dl class="divide-y divide-border/50 text-sm">
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="flex items-center gap-2 text-muted-foreground">
                    <Boxes class="size-3.5" /> Project
                  </dt>
                  <dd class="text-right font-medium">{{ incident.project }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">Environment</dt>
                  <dd class="text-right font-mono text-xs">{{ incident.environment }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">Function</dt>
                  <dd class="truncate text-right font-mono text-xs">
                    {{ ev?.lambda?.functionName ?? "-" }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">Occurrences</dt>
                  <dd class="text-right font-mono tabular-nums">{{ incident.occurrences }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">First seen</dt>
                  <dd class="text-right text-xs" :title="absoluteTime(incident.firstSeenAt)">
                    {{ relativeTime(incident.firstSeenAt) }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">Last seen</dt>
                  <dd class="text-right text-xs" :title="absoluteTime(incident.lastSeenAt)">
                    {{ relativeTime(incident.lastSeenAt) }}
                  </dd>
                </div>
                <div
                  v-if="ev?.lambda?.coldStart !== undefined"
                  class="flex items-center justify-between gap-4 py-2.5"
                >
                  <dt class="flex items-center gap-2 text-muted-foreground">
                    <Snowflake class="size-3.5" /> Cold start
                  </dt>
                  <dd class="text-right text-xs">{{ ev.lambda.coldStart ? "Yes" : "No" }}</dd>
                </div>
                <div
                  v-if="ev?.performance?.durationMs != null"
                  class="flex items-center justify-between gap-4 py-2.5"
                >
                  <dt class="text-muted-foreground">Duration</dt>
                  <dd class="text-right font-mono text-xs">
                    {{ formatMs(ev.performance.durationMs) }}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <!-- Release / Git (captured by the SDK from CI / deploy env) -->
          <Card v-if="hasRelease">
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <GitCommitHorizontal class="size-4 text-muted-foreground" />
                Release
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-0">
              <dl class="divide-y divide-border/50 text-sm">
                <div v-if="git?.commitSha" class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">Commit</dt>
                  <dd class="text-right font-mono text-xs">
                    <a
                      v-if="commitHref"
                      :href="commitHref"
                      target="_blank"
                      rel="noreferrer noopener"
                      class="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
                    >
                      {{ git.commitSha.slice(0, 10) }}
                      <ExternalLink class="size-3" />
                    </a>
                    <span v-else>{{ git.commitSha.slice(0, 10) }}</span>
                  </dd>
                </div>
                <div v-if="git?.branch" class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">Branch</dt>
                  <dd class="text-right font-mono text-xs">{{ git.branch }}</dd>
                </div>
                <div v-if="releaseLabel" class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">Release</dt>
                  <dd class="text-right font-mono text-xs">{{ releaseLabel }}</dd>
                </div>
                <div
                  v-if="git?.buildTimestamp"
                  class="flex items-center justify-between gap-4 py-2.5"
                >
                  <dt class="text-muted-foreground">Built</dt>
                  <dd class="text-right text-xs" :title="absoluteTime(git.buildTimestamp)">
                    {{ relativeTime(git.buildTimestamp) }}
                  </dd>
                </div>
                <div v-if="repoHref" class="flex items-center justify-between gap-4 py-2.5">
                  <dt class="text-muted-foreground">Repository</dt>
                  <dd class="min-w-0 text-right">
                    <a
                      :href="repoHref"
                      target="_blank"
                      rel="noreferrer noopener"
                      class="inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-primary transition-colors hover:text-primary/80"
                    >
                      <span class="truncate">{{ repoName }}</span>
                      <ExternalLink class="size-3 shrink-0" />
                    </a>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </main>
</template>
