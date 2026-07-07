<script setup lang="ts">
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-vue-next";
const { toasts, dismiss } = useToast();

const icon = (v: string) =>
  v === "success" ? CheckCircle2 : v === "error" ? AlertTriangle : Info;
const accent = (v: string) =>
  v === "success"
    ? "text-sev-low"
    : v === "error"
      ? "text-destructive"
      : "text-primary";
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2.5"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-x-4 opacity-0"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-lg border border-border/70 bg-popover/95 p-3.5 shadow-xl backdrop-blur"
      >
        <component :is="icon(t.variant)" :class="['mt-0.5 size-4 shrink-0', accent(t.variant)]" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium leading-tight">{{ t.title }}</p>
          <p v-if="t.description" class="mt-0.5 text-xs text-muted-foreground">
            {{ t.description }}
          </p>
        </div>
        <button
          class="text-muted-foreground/70 transition-colors hover:text-foreground"
          aria-label="Dismiss"
          @click="dismiss(t.id)"
        >
          <X class="size-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
