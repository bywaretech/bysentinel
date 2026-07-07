<script setup lang="ts">
import type { Component } from "vue";
defineProps<{ icon?: Component; title: string; description?: string }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <span
      v-if="icon"
      class="grid size-12 place-items-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground"
    >
      <component :is="icon" class="size-5" />
    </span>
    <div class="max-w-sm">
      <p class="text-sm font-medium">{{ title }}</p>
      <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
