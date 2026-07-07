<script setup lang="ts">
import type { ExecutionTimeline } from "~/lib/types";
import { formatMs } from "~/lib/display";

const props = defineProps<{ timeline: ExecutionTimeline }>();

const bottleneckName = computed(() => props.timeline.bottleneck?.name);
const steps = computed(() => props.timeline.steps ?? []);
const maxDuration = computed(() =>
  Math.max(1, ...steps.value.map((s) => s.durationMs ?? 0)),
);
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div
      v-for="(step, idx) in steps"
      :key="idx"
      class="flex items-center gap-3"
    >
      <div class="flex w-40 shrink-0 items-center gap-2">
        <span
          class="size-1.5 shrink-0 rounded-full"
          :class="
            step.name === bottleneckName
              ? 'bg-sev-high'
              : step.status === 'failed'
                ? 'bg-destructive'
                : 'bg-primary/70'
          "
        />
        <span class="truncate text-sm" :title="step.name">{{ step.name }}</span>
      </div>
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div
          class="h-full rounded-full"
          :class="step.name === bottleneckName ? 'bg-sev-high' : 'bg-primary/60'"
          :style="{ width: `${((step.durationMs ?? 0) / maxDuration) * 100}%` }"
        />
      </div>
      <span class="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {{ formatMs(step.durationMs) }}
      </span>
    </div>

    <div
      v-if="bottleneckName"
      class="mt-1 flex items-center gap-2 rounded-md border border-sev-high/25 bg-sev-high/10 px-3 py-2 text-xs"
    >
      <span class="font-medium text-sev-high">Bottleneck</span>
      <span class="text-muted-foreground">
        {{ bottleneckName }} took {{ formatMs(timeline.bottleneck?.durationMs) }}
        of {{ formatMs(timeline.totalMs) }} total
      </span>
    </div>
  </div>
</template>
