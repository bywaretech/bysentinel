<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import type { Incident } from "~/lib/types";
import { relativeTime, categoryLabel } from "~/lib/display";

defineProps<{ incidents: Incident[]; dense?: boolean }>();

function title(i: Incident): string {
  return i.analysis?.result?.summary || i.latestEvent?.error?.message || i.id;
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="border-b border-border/70 text-left">
          <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Incident
          </th>
          <th class="hidden px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
            Project
          </th>
          <th class="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Severity
          </th>
          <th class="hidden px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
            Category
          </th>
          <th class="hidden px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
            Count
          </th>
          <th class="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last seen
          </th>
          <th class="w-8" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="i in incidents"
          :key="i.id"
          class="group cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40"
          @click="navigateTo(`/incidents/${i.id}`)"
        >
          <td class="max-w-[26rem] px-4" :class="dense ? 'py-2.5' : 'py-3.5'">
            <div class="truncate font-medium text-foreground">{{ title(i) }}</div>
            <div class="truncate font-mono text-xs text-muted-foreground/80">
              {{ i.latestEvent?.lambda?.functionName || i.fingerprint }}
            </div>
          </td>
          <td class="hidden px-4 sm:table-cell" :class="dense ? 'py-2.5' : 'py-3.5'">
            <div class="text-foreground/90">{{ i.project }}</div>
            <div class="text-xs text-muted-foreground">{{ i.environment }}</div>
          </td>
          <td class="px-4" :class="dense ? 'py-2.5' : 'py-3.5'">
            <SeverityBadge :severity="i.analysis?.result?.severity" />
          </td>
          <td
            class="hidden px-4 text-muted-foreground md:table-cell"
            :class="dense ? 'py-2.5' : 'py-3.5'"
          >
            {{ i.analysis ? categoryLabel(i.analysis.result.category) : "-" }}
          </td>
          <td
            class="hidden px-4 text-right font-mono tabular-nums sm:table-cell"
            :class="dense ? 'py-2.5' : 'py-3.5'"
          >
            {{ i.occurrences }}
          </td>
          <td
            class="whitespace-nowrap px-4 text-right text-muted-foreground"
            :class="dense ? 'py-2.5' : 'py-3.5'"
          >
            {{ relativeTime(i.lastSeenAt) }}
          </td>
          <td class="pr-3">
            <ChevronRight
              class="size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
