<script setup lang="ts">
import { cn } from "~/lib/utils";
const props = defineProps<{ class?: string }>();
</script>

<template>
  <div
    :class="
      cn('relative overflow-hidden rounded-md bg-muted/60', props.class)
    "
  >
    <div
      class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
      style="animation: bs-shimmer 1.6s infinite"
    />
  </div>
</template>
