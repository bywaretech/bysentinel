<script setup lang="ts">
import { severityToken } from "~/lib/display";

const props = defineProps<{
  distribution: { severity: string; count: number }[];
}>();

const total = computed(() =>
  Math.max(1, props.distribution.reduce((n, d) => n + d.count, 0)),
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="d in distribution"
      :key="d.severity"
      class="flex items-center gap-3"
    >
      <span class="w-16 shrink-0 text-xs capitalize text-muted-foreground">
        {{ d.severity }}
      </span>
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{
            width: `${(d.count / total) * 100}%`,
            backgroundColor: `var(--color-${severityToken(d.severity)})`,
          }"
        />
      </div>
      <span class="w-8 shrink-0 text-right font-mono text-xs tabular-nums">
        {{ d.count }}
      </span>
    </div>
  </div>
</template>
