<script setup lang="ts">
import { cn } from "~/lib/utils";
import { severityToken } from "~/lib/display";

const props = withDefaults(
  defineProps<{ severity?: string; label?: string; dot?: boolean }>(),
  { dot: true },
);

const token = computed(() => severityToken(props.severity));
const text = computed(() => props.label ?? props.severity ?? "pending");
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
      )
    "
    :style="{
      color: `var(--color-${token})`,
      borderColor: `color-mix(in oklch, var(--color-${token}) 35%, transparent)`,
      backgroundColor: `color-mix(in oklch, var(--color-${token}) 12%, transparent)`,
    }"
  >
    <span
      v-if="dot"
      class="size-1.5 rounded-full"
      :style="{ backgroundColor: `var(--color-${token})` }"
    />
    {{ text }}
  </span>
</template>
