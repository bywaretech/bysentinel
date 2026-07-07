<script setup lang="ts">
import { Search, RefreshCw, Inbox, SearchX } from "lucide-vue-next";
import { severityRank } from "~/lib/display";

useHead({ title: "Incidents — BySentinel" });

const { incidents, pending, loaded, refresh, projects } = useIncidents();
await useAsyncData("incidents-list", async () => {
  await refresh();
  return true;
});

const query = ref("");
const severity = ref<string>("all");
const project = ref<string>("all");
const sort = ref<"recent" | "severity" | "occurrences">("recent");

const severityOptions = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "pending", label: "Pending" },
];
const projectOptions = computed(() => [
  { value: "all", label: "All projects" },
  ...projects.value.map((p) => ({ value: p, label: p })),
]);
const sortOptions = [
  { value: "recent", label: "Most recent" },
  { value: "severity", label: "Severity" },
  { value: "occurrences", label: "Occurrences" },
];

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  let list = incidents.value.filter((i) => {
    const sev = i.analysis?.result?.severity ?? "pending";
    if (severity.value !== "all" && sev !== severity.value) return false;
    if (project.value !== "all" && i.project !== project.value) return false;
    if (!q) return true;
    const hay = [
      i.analysis?.result?.summary,
      i.latestEvent?.error?.message,
      i.latestEvent?.lambda?.functionName,
      i.project,
      i.fingerprint,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  list = [...list].sort((a, b) => {
    if (sort.value === "severity") {
      return (
        severityRank(a.analysis?.result?.severity) -
        severityRank(b.analysis?.result?.severity)
      );
    }
    if (sort.value === "occurrences") return b.occurrences - a.occurrences;
    return b.lastSeenAt.localeCompare(a.lastSeenAt);
  });
  return list;
});

const showSkeleton = computed(() => pending.value && !loaded.value);
</script>

<template>
  <AppTopbar title="Incidents" :subtitle="`${incidents.length} tracked`">
    <template #actions>
      <Button variant="secondary" size="sm" :disabled="pending" @click="refresh">
        <RefreshCw class="size-3.5" :class="pending && 'animate-spin'" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </template>
  </AppTopbar>

  <main class="mx-auto w-full max-w-[1400px] flex-1 space-y-4 p-5">
    <!-- Filter bar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
        />
        <input
          v-model="query"
          type="search"
          placeholder="Search by message, function, project or fingerprint"
          class="flex h-9 w-full rounded-md border border-input bg-background/40 pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        />
      </div>
      <div class="grid grid-cols-3 gap-2 sm:flex sm:w-auto">
        <Select v-model="severity" :options="severityOptions" class="sm:w-40" />
        <Select v-model="project" :options="projectOptions" class="sm:w-44" />
        <Select v-model="sort" :options="sortOptions" class="sm:w-40" />
      </div>
    </div>

    <Card>
      <div v-if="showSkeleton" class="space-y-2 p-5">
        <Skeleton v-for="n in 8" :key="n" class="h-12 w-full" />
      </div>

      <EmptyState
        v-else-if="!incidents.length"
        :icon="Inbox"
        title="No incidents yet"
        description="Once your Lambda SDK reports a failure, it lands here grouped by fingerprint."
      />

      <EmptyState
        v-else-if="!filtered.length"
        :icon="SearchX"
        title="No matches"
        description="No incidents match the current filters. Try widening your search."
      />

      <IncidentTable v-else :incidents="filtered" />
    </Card>
  </main>
</template>
