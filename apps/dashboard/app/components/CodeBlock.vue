<script setup lang="ts">
import { Copy, Check } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{ code: string; label?: string; maxHeight?: string }>(),
  { maxHeight: "22rem" },
);

const copied = ref(false);
async function copy() {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border/70 bg-[oklch(0.14_0.008_265)]">
    <div
      class="flex items-center justify-between border-b border-border/50 px-3 py-1.5"
    >
      <span class="font-mono text-xs text-muted-foreground">{{ label ?? "json" }}</span>
      <button
        class="inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        @click="copy"
      >
        <component :is="copied ? Check : Copy" class="size-3.5" />
        {{ copied ? "Copied" : "Copy" }}
      </button>
    </div>
    <pre
      class="overflow-auto p-3.5 text-xs leading-relaxed"
      :style="{ maxHeight }"
    ><code class="font-mono text-foreground/90">{{ code }}</code></pre>
  </div>
</template>
