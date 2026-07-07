<script setup lang="ts">
import {
  ShieldAlert,
  Sparkles,
  Flame,
  Repeat,
  RefreshCw,
  Lock,
  PlugZap,
  Inbox,
  ArrowRight,
} from "lucide-vue-next";

useHead({ title: "Overview — BySentinel" });

const {
  incidents,
  pending,
  loaded,
  error,
  refresh,
  stats,
  severityDistribution,
  activitySeries,
} = useIncidents();

await useAsyncData("overview", async () => {
  await refresh();
  return true;
});

let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(refresh, 15000);
});
onBeforeUnmount(() => timer && clearInterval(timer));

const recent = computed(() => incidents.value.slice(0, 6));
const series = computed(() => activitySeries(14));
const showSkeleton = computed(() => pending.value && !loaded.value);
</script>

<template>
  <AppTopbar title="Overview" subtitle="Serverless incidents across your projects">
    <template #actions>
      <Button variant="secondary" size="sm" :disabled="pending" @click="refresh">
        <RefreshCw class="size-3.5" :class="pending && 'animate-spin'" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </template>
  </AppTopbar>

  <main class="mx-auto w-full max-w-[1400px] flex-1 space-y-5 p-5">
    <!-- Connection error -->
    <Card v-if="error && !loaded" class="border-destructive/30">
      <CardContent class="flex flex-col items-center gap-3 py-12 text-center">
        <span class="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <PlugZap class="size-5" />
        </span>
        <div>
          <p class="text-sm font-medium">Cannot reach the collector</p>
          <p class="mt-1 max-w-md text-sm text-muted-foreground">{{ error }}</p>
        </div>
        <Button variant="secondary" size="sm" @click="refresh">
          <RefreshCw class="size-3.5" />
          Try again
        </Button>
      </CardContent>
    </Card>

    <template v-else>
      <!-- Metrics -->
      <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Incidents"
          :value="stats.total"
          :icon="ShieldAlert"
          :loading="showSkeleton"
          hint="Distinct fingerprints"
        />
        <MetricCard
          label="Analyzed"
          :value="stats.analyzed"
          :icon="Sparkles"
          accent="var(--color-primary)"
          :loading="showSkeleton"
          :hint="`${stats.total ? Math.round((stats.analyzed / stats.total) * 100) : 0}% coverage`"
        />
        <MetricCard
          label="High risk"
          :value="stats.highRisk"
          :icon="Flame"
          accent="var(--color-sev-high)"
          :loading="showSkeleton"
          hint="Critical + high severity"
        />
        <MetricCard
          label="Occurrences"
          :value="stats.occurrences"
          :icon="Repeat"
          :loading="showSkeleton"
          hint="Total captured events"
        />
      </section>

      <!-- Trend + distribution -->
      <section class="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader class="flex-row items-center justify-between">
            <div>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Occurrences over the last 14 days</CardDescription>
            </div>
            <Badge variant="muted" class="font-mono">
              {{ series.reduce((a, b) => a + b, 0) }} events
            </Badge>
          </CardHeader>
          <CardContent>
            <Skeleton v-if="showSkeleton" class="h-[120px] w-full" />
            <TrendChart v-else :points="series" :height="140" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severity</CardTitle>
            <CardDescription class="flex items-center gap-1.5">
              <Lock class="size-3" />
              {{ stats.securityFlags }} with security flags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="showSkeleton" class="space-y-3">
              <Skeleton v-for="n in 5" :key="n" class="h-2.5 w-full" />
            </div>
            <SeverityBars v-else :distribution="severityDistribution" />
          </CardContent>
        </Card>
      </section>

      <!-- Recent incidents -->
      <Card>
        <CardHeader class="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent incidents</CardTitle>
            <CardDescription>Newest activity first</CardDescription>
          </div>
          <NuxtLink
            to="/incidents"
            class="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all
            <ArrowRight class="size-3.5" />
          </NuxtLink>
        </CardHeader>

        <div v-if="showSkeleton" class="space-y-2 p-5 pt-0">
          <Skeleton v-for="n in 4" :key="n" class="h-12 w-full" />
        </div>

        <EmptyState
          v-else-if="!recent.length"
          :icon="Inbox"
          title="No incidents yet"
          description="Point your Lambda SDK at this collector and trigger a failure. Incidents show up here automatically."
        />

        <IncidentTable v-else :incidents="recent" />
      </Card>
    </template>
  </main>
</template>
