<script setup lang="ts">
import {
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  GitBranch,
  FlaskConical,
  UsersRound,
  BookText,
} from "lucide-vue-next";

const { isAdmin, role, username } = useAuth();

const monitorNav = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Incidents", to: "/incidents", icon: ShieldAlert },
];

const settingsNav = computed(() => [
  { label: "AI analysis", to: "/settings/ai", icon: Sparkles },
  { label: "Git repositories", to: "/settings/git", icon: GitBranch },
  { label: "Sandbox", to: "/settings/sandbox", icon: FlaskConical },
  ...(isAdmin.value ? [{ label: "Users", to: "/settings/users", icon: UsersRound }] : []),
]);

const route = useRoute();
const isActive = (to: string) =>
  to === "/" ? route.path === "/" : route.path.startsWith(to);
</script>

<template>
  <aside
    class="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex"
  >
    <div class="flex h-14 items-center gap-2.5 px-5">
      <BrandMark :size="26" />
      <span class="text-sm font-semibold tracking-tight">BySentinel</span>
    </div>

    <nav class="flex flex-1 flex-col gap-0.5 px-3 py-3">
      <p class="px-2 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Monitor
      </p>
      <NuxtLink
        v-for="item in monitorNav"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        :class="isActive(item.to) && 'bg-accent text-accent-foreground'"
      >
        <component
          :is="item.icon"
          class="size-4 shrink-0 transition-colors"
          :class="isActive(item.to) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'"
        />
        {{ item.label }}
      </NuxtLink>

      <p class="px-2 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        Settings
      </p>
      <NuxtLink
        v-for="item in settingsNav"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        :class="isActive(item.to) && 'bg-accent text-accent-foreground'"
      >
        <component
          :is="item.icon"
          class="size-4 shrink-0 transition-colors"
          :class="isActive(item.to) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'"
        />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="border-t border-sidebar-border p-3">
      <div class="flex items-center gap-2.5 px-2.5 pb-2.5">
        <span
          class="grid size-8 shrink-0 place-items-center rounded-full border border-border/60 bg-muted/40 text-xs font-semibold uppercase"
        >
          {{ (username ?? "bs").slice(0, 2) }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium">{{ username ?? "Signed in" }}</p>
          <p class="text-[11px] capitalize text-muted-foreground">{{ role ?? "admin" }}</p>
        </div>
      </div>
      <a
        href="https://github.com/byware/bysentinel"
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <BookText class="size-4" />
        Documentation
      </a>
    </div>
  </aside>
</template>
