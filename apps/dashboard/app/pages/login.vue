<script setup lang="ts">
import {
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  KeyRound,
  UserRound,
  Sparkles,
  Activity,
  FlaskConical,
} from "lucide-vue-next";

definePageMeta({ layout: "auth" });
useHead({ title: "Sign in — BySentinel" });

const { loginWithToken, loginWithUser } = useAuth();
const route = useRoute();

const mode = ref<"user" | "token">("user");
const username = ref("");
const password = ref("");
const token = ref("");
const reveal = ref(false);
const submitting = ref(false);
const errorMsg = ref<string | null>(null);

const canSubmit = computed(() =>
  mode.value === "user"
    ? username.value.trim().length > 0 && password.value.length > 0
    : token.value.trim().length > 0,
);

async function onSubmit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  errorMsg.value = null;
  try {
    if (mode.value === "user") {
      await loginWithUser(username.value.trim(), password.value);
    } else {
      await loginWithToken(token.value.trim());
    }
    await navigateTo((route.query.redirect as string) || "/");
  } catch (err: unknown) {
    errorMsg.value =
      (err as { statusMessage?: string }).statusMessage ??
      "Could not sign in. Check the credentials and the collector URL.";
  } finally {
    submitting.value = false;
  }
}

const highlights = [
  { icon: Activity, text: "Live incident timeline with bottleneck attribution" },
  { icon: Sparkles, text: "AI root cause with your code fetched at the failing commit" },
  { icon: FlaskConical, text: "Replay failures in a local ministack sandbox" },
  { icon: ShieldCheck, text: "Secrets redacted before anything is stored or shown" },
];
</script>

<template>
  <div class="grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
    <!-- Brand / value panel -->
    <section class="relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
      <div class="flex items-center gap-2.5">
        <BrandMark :size="30" />
        <span class="text-base font-semibold tracking-tight">BySentinel</span>
      </div>

      <div class="max-w-md">
        <p class="text-xs font-medium uppercase tracking-widest text-primary/90">
          Serverless incident intelligence
        </p>
        <h2 class="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight">
          From error to explained fix, automatically.
        </h2>
        <p class="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          BySentinel correlates the failure with the exact commit, reads the code
          involved, reproduces the case in a sandbox and suggests the fix.
        </p>

        <ul class="mt-8 flex flex-col gap-3.5">
          <li
            v-for="h in highlights"
            :key="h.text"
            class="flex items-center gap-3 text-sm text-foreground/90"
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg border border-border/60 bg-card/60 text-primary"
            >
              <component :is="h.icon" class="size-4" />
            </span>
            {{ h.text }}
          </li>
        </ul>
      </div>

      <p class="font-mono text-xs text-muted-foreground/70">
        Apache-2.0 · self-hosted · your data stays yours
      </p>
    </section>

    <!-- Auth form -->
    <section class="flex items-center justify-center p-6 sm:p-10">
      <div class="w-full max-w-sm">
        <div class="mb-8 flex items-center gap-2.5 lg:hidden">
          <BrandMark :size="28" />
          <span class="text-sm font-semibold tracking-tight">BySentinel</span>
        </div>

        <h1 class="text-xl font-semibold tracking-tight">Sign in</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">
          Use your account, or the collector admin token.
        </p>

        <!-- Mode switch -->
        <div class="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border/70 bg-muted/30 p-1">
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="mode === 'user' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="mode = 'user'; errorMsg = null"
          >
            <UserRound class="size-3.5" />
            Account
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="mode === 'token' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            @click="mode = 'token'; errorMsg = null"
          >
            <KeyRound class="size-3.5" />
            Admin token
          </button>
        </div>

        <form class="mt-5 flex flex-col gap-4" @submit.prevent="onSubmit">
          <template v-if="mode === 'user'">
            <div class="flex flex-col gap-2">
              <Label for="username">Username</Label>
              <Input
                id="username"
                v-model="username"
                autocomplete="username"
                placeholder="your.name"
              />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="password">Password</Label>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="reveal ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="flex h-10 w-full rounded-md border border-input bg-background/40 px-3 pr-10 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
                />
                <button
                  type="button"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground"
                  :aria-label="reveal ? 'Hide password' : 'Show password'"
                  @click="reveal = !reveal"
                >
                  <component :is="reveal ? EyeOff : Eye" class="size-4" />
                </button>
              </div>
            </div>
          </template>

          <div v-else class="flex flex-col gap-2">
            <Label for="token">Admin token</Label>
            <div class="relative">
              <KeyRound
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
              />
              <input
                id="token"
                v-model="token"
                :type="reveal ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="bs_admin_..."
                class="flex h-10 w-full rounded-md border border-input bg-background/40 pl-9 pr-10 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground"
                :aria-label="reveal ? 'Hide token' : 'Show token'"
                @click="reveal = !reveal"
              >
                <component :is="reveal ? EyeOff : Eye" class="size-4" />
              </button>
            </div>
          </div>

          <p
            v-if="errorMsg"
            class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {{ errorMsg }}
          </p>

          <Button type="submit" size="lg" :disabled="submitting || !canSubmit">
            <Loader2 v-if="submitting" class="size-4 animate-spin" />
            <template v-else>
              Sign in
              <ArrowRight class="size-4" />
            </template>
          </Button>
        </form>

        <p class="mt-6 text-xs leading-relaxed text-muted-foreground">
          {{
            mode === "user"
              ? "First time here? Sign in once with the admin token and create accounts in Settings."
              : "Credentials are stored in secure, httpOnly session cookies. They never reach the browser."
          }}
        </p>
      </div>
    </section>
  </div>
</template>
