<script setup lang="ts">
import {
  Sparkles,
  Loader2,
  Cloud,
  Server,
  Boxes,
  Wand2,
  Check,
  CircleAlert,
  ShieldCheck,
  BrainCircuit,
} from "lucide-vue-next";
import type { PublicAISettings, AIProvider } from "~/lib/types";
import { defaultModel } from "~/lib/display";

useHead({ title: "AI analysis — BySentinel" });

const api = useApi();
const { success, error: toastError } = useToast();

const providers: {
  value: AIProvider;
  label: string;
  desc: string;
  icon: typeof Cloud;
  needsBaseUrl: boolean;
  needsKey: boolean;
  local?: boolean;
}[] = [
  {
    value: "openai",
    label: "OpenAI",
    desc: "GPT models via the OpenAI API.",
    icon: Cloud,
    needsBaseUrl: false,
    needsKey: true,
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    desc: "Routed access to many hosted models.",
    icon: Boxes,
    needsBaseUrl: false,
    needsKey: true,
  },
  {
    value: "anthropic",
    label: "Anthropic",
    desc: "Claude models via the Anthropic API.",
    icon: Wand2,
    needsBaseUrl: false,
    needsKey: true,
  },
  {
    value: "deepseek",
    label: "DeepSeek",
    desc: "OpenAI-compatible DeepSeek chat models.",
    icon: BrainCircuit,
    needsBaseUrl: false,
    needsKey: true,
  },
  {
    value: "ollama",
    label: "Ollama / local",
    desc: "Local models, nothing leaves your network.",
    icon: Server,
    needsBaseUrl: true,
    needsKey: false,
    local: true,
  },
  {
    value: "custom-http",
    label: "Custom HTTP",
    desc: "A custom BySentinel analyzer endpoint.",
    icon: Server,
    needsBaseUrl: true,
    needsKey: false,
  },
];

const form = reactive({
  enabled: false,
  provider: "openai" as AIProvider,
  model: "",
  baseUrl: "",
  apiKey: "",
  timeoutMs: 20000,
});
const hasStoredKey = ref(false);
const loading = ref(true);
const saving = ref(false);

const activeProvider = computed(() => providers.find((p) => p.value === form.provider)!);
const needsBaseUrl = computed(() => form.enabled && activeProvider.value.needsBaseUrl);
const baseUrlMissing = computed(() => needsBaseUrl.value && !form.baseUrl.trim());

function applySettings(s: PublicAISettings) {
  form.enabled = s.enabled;
  form.provider = s.provider;
  form.model = s.model ?? "";
  form.baseUrl = s.baseUrl ?? "";
  form.timeoutMs = s.timeoutMs ?? 20000;
  form.apiKey = "";
  hasStoredKey.value = s.hasApiKey;
}

onMounted(async () => {
  try {
    applySettings(await api.get<PublicAISettings>("/settings/ai"));
  } catch (err: unknown) {
    toastError(
      "Could not load AI settings",
      (err as { statusMessage?: string }).statusMessage ?? "",
    );
  } finally {
    loading.value = false;
  }
});

function selectProvider(p: AIProvider) {
  form.provider = p;
  const known = providers.map((x) => defaultModel(x.value));
  if (!form.model || known.includes(form.model)) form.model = defaultModel(p);
}

async function save() {
  if (baseUrlMissing.value || saving.value) return;
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      enabled: form.enabled,
      provider: form.provider,
      model: form.model.trim() || defaultModel(form.provider),
      baseUrl: form.baseUrl.trim() || undefined,
      timeoutMs: Number(form.timeoutMs) || 20000,
    };
    if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();
    applySettings(await api.post<PublicAISettings>("/settings/ai", payload));
    success("Settings saved", "New analyses will use this configuration.");
  } catch (err: unknown) {
    toastError(
      "Could not save",
      (err as { statusMessage?: string }).statusMessage ?? "Check the values and retry.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppTopbar title="AI analysis" subtitle="Configure the model used for incident analysis" />

  <main class="mx-auto w-full max-w-3xl flex-1 space-y-4 p-5">
    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-28 w-full" />
      <Skeleton class="h-64 w-full" />
    </div>

    <template v-else>
      <!-- Enable -->
      <Card>
        <CardContent class="flex items-center justify-between gap-4 p-5">
          <div class="flex items-start gap-3">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary"
            >
              <Sparkles class="size-4" />
            </span>
            <div>
              <p class="text-sm font-medium">AI analysis</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                When off, incidents still get a safe heuristic analysis. No model is called.
              </p>
            </div>
          </div>
          <Switch v-model="form.enabled" />
        </CardContent>
      </Card>

      <!-- Provider -->
      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
          <CardDescription
            >Pick where analysis runs. Local keeps data in your network.</CardDescription
          >
        </CardHeader>
        <CardContent>
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="p in providers"
              :key="p.value"
              type="button"
              class="group relative flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors"
              :class="
                form.provider === p.value
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border/70 hover:border-border hover:bg-accent/40'
              "
              @click="selectProvider(p.value)"
            >
              <span
                class="grid size-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted/40"
                :class="form.provider === p.value && 'text-primary'"
              >
                <component :is="p.icon" class="size-4" />
              </span>
              <div class="min-w-0">
                <p class="flex items-center gap-1.5 text-sm font-medium">
                  {{ p.label }}
                  <Badge v-if="p.local" variant="muted" class="px-1.5 py-0 text-[10px]"
                    >local</Badge
                  >
                </p>
                <p class="mt-0.5 text-xs leading-snug text-muted-foreground">{{ p.desc }}</p>
              </div>
              <span
                v-if="form.provider === p.value"
                class="absolute right-3 top-3 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <Check class="size-3" />
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- Connection -->
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <Label for="model">Model</Label>
              <Input id="model" v-model="form.model" :placeholder="defaultModel(form.provider)" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                v-model="form.timeoutMs"
                type="number"
                :min="1000"
                :max="120000"
                :step="1000"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <Label for="baseUrl">
              Base URL
              <span v-if="activeProvider.needsBaseUrl" class="text-primary">required</span>
              <span v-else class="normal-case tracking-normal text-muted-foreground/70"
                >optional</span
              >
            </Label>
            <Input
              id="baseUrl"
              v-model="form.baseUrl"
              :placeholder="
                activeProvider.needsBaseUrl ? 'http://localhost:11434' : 'Provider default'
              "
              :class="
                baseUrlMissing
                  ? 'border-destructive/60 focus-visible:ring-destructive/40'
                  : undefined
              "
            />
            <p v-if="baseUrlMissing" class="flex items-center gap-1.5 text-xs text-destructive">
              <CircleAlert class="size-3.5" />
              {{ activeProvider.label }} needs a base URL when AI is enabled.
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <Label for="apiKey">API key</Label>
            <Input
              id="apiKey"
              v-model="form.apiKey"
              type="password"
              autocomplete="new-password"
              :placeholder="
                hasStoredKey
                  ? 'Stored. Leave empty to keep the current key.'
                  : activeProvider.needsKey
                    ? 'Required for this provider'
                    : 'Not required'
              "
            />
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck class="size-3.5" />
              <span v-if="hasStoredKey"
                >A key is stored on the collector. It is never sent back to the browser.</span
              >
              <span v-else>Stored only on the collector. Never returned to the browser.</span>
            </p>
          </div>
        </CardContent>
        <CardFooter class="justify-between">
          <p class="text-xs text-muted-foreground">
            {{
              form.enabled
                ? "Active for new incidents."
                : "Disabled. Heuristic fallback still runs."
            }}
          </p>
          <Button :disabled="saving || baseUrlMissing" @click="save">
            <Loader2 v-if="saving" class="size-4 animate-spin" />
            <Check v-else class="size-4" />
            Save configuration
          </Button>
        </CardFooter>
      </Card>
    </template>
  </main>
</template>
