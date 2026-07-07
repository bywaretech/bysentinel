<script setup lang="ts">
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from "reka-ui";
import { Check, ChevronDown } from "lucide-vue-next";
import { cn } from "~/lib/utils";

defineProps<{
  options: { value: string; label: string }[];
  placeholder?: string;
  class?: string;
  id?: string;
}>();
const model = defineModel<string>();
</script>

<template>
  <SelectRoot :id="id" v-model="model">
    <SelectTrigger
      :class="
        cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background/40 px-3 py-1 text-sm shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring/70 data-[placeholder]:text-muted-foreground/70',
          $props.class,
        )
      "
    >
      <SelectValue :placeholder="placeholder ?? 'Select'" />
      <SelectIcon>
        <ChevronDown class="size-4 opacity-60" />
      </SelectIcon>
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="6"
        class="z-50 min-w-[--reka-select-trigger-width] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
            class="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-3 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:font-medium"
          >
            <SelectItemIndicator class="absolute left-2 inline-flex items-center">
              <Check class="size-4 text-primary" />
            </SelectItemIndicator>
            <SelectItemText>{{ opt.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
