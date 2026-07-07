<script setup lang="ts">
import {
  LogOut,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
} from "lucide-vue-next";

defineProps<{ title: string; subtitle?: string }>();

const { logout } = useAuth();
const route = useRoute();

const mobileNav = [
  { to: "/", icon: LayoutDashboard },
  { to: "/incidents", icon: ShieldAlert },
  { to: "/settings/ai", icon: Sparkles },
];
const isActive = (to: string) =>
  to === "/" ? route.path === "/" : route.path.startsWith(to);
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border/70 bg-background/80 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-sm font-semibold tracking-tight">{{ title }}</h1>
      <p v-if="subtitle" class="hidden truncate text-xs text-muted-foreground sm:block">
        {{ subtitle }}
      </p>
    </div>

    <div class="flex shrink-0 items-center gap-1.5">
      <nav class="flex items-center gap-0.5 md:hidden">
        <NuxtLink
          v-for="item in mobileNav"
          :key="item.to"
          :to="item.to"
          class="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
          :class="isActive(item.to) && 'bg-accent text-primary'"
        >
          <component :is="item.icon" class="size-4" />
        </NuxtLink>
      </nav>

      <slot name="actions" />

      <Button variant="ghost" size="icon" aria-label="Sign out" @click="logout">
        <LogOut class="size-4" />
      </Button>
    </div>
  </header>
</template>
