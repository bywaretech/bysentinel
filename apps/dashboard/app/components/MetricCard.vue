<script setup lang="ts">
import type { Component } from "vue";
import { cn } from "~/lib/utils";

defineProps<{
  label: string;
  value: string | number;
  icon?: Component;
  hint?: string;
  accent?: string;
  loading?: boolean;
}>();
</script>

<template>
  <Card class="p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {{ label }}
        </p>
        <template v-if="loading">
          <Skeleton class="mt-2.5 h-7 w-16" />
        </template>
        <p
          v-else
          class="mt-1.5 font-mono text-2xl font-semibold tracking-tight tabular-nums"
        >
          {{ value }}
        </p>
      </div>
      <span
        v-if="icon"
        :class="
          cn(
            'grid size-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted/40',
          )
        "
        :style="accent ? { color: accent } : undefined"
      >
        <component :is="icon" class="size-4" />
      </span>
    </div>
    <p v-if="hint && !loading" class="mt-2 text-xs text-muted-foreground">{{ hint }}</p>
  </Card>
</template>
