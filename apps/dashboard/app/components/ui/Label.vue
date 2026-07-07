<script setup lang="ts">
import { Label } from "reka-ui";
import { cn } from "~/lib/utils";
const props = defineProps<{ for?: string; class?: string }>();
</script>

<template>
  <Label
    :for="props.for"
    :class="
      cn(
        'text-xs font-medium uppercase tracking-wide text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
  </Label>
</template>
