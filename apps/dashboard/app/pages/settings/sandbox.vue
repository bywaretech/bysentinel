<script setup lang="ts">
import { FlaskConical, Loader2, Check, Container, CircleAlert } from "lucide-vue-next";
import type { SandboxSettings } from "~/lib/types";

useHead({ title: "Sandbox — BySentinel" });

const api = useApi();
const { success, error: toastError } = useToast();
const { isAdmin } = useAuth();

const form = reactive<SandboxSettings>({
  enabled: false,
  ministackUrl: "http://ministack:4566",
  region: "us-east-1",
  runtime: "nodejs20.x",
  timeoutMs: 60000,
});
const loading = ref(true);
const saving = ref(false);

const runtimeOptions = [
  { value: "nodejs20.x", label: "nodejs20.x" },
  { value: "nodejs22.x", label: "nodejs22.x" },
  { value: "nodejs18.x", label: "nodejs18.x" },
];

onMounted(async () => {
  try {
    Object.assign(form, await api.get<SandboxSettings>("/settings/sandbox"));
  } catch (err: unknown) {
    toastError("Could not load sandbox settings", msg(err));
  } finally {
    loading.value = false;
  }
});

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    Object.assign(form, await api.post<SandboxSettings>("/settings/sandbox", { ...form }));
    success("Sandbox settings saved");
  } catch (err: unknown) {
    toastError("Could not save", msg(err));
  } finally {
    saving.value = false;
  }
}

function msg(err: unknown): string {
  return (err as { statusMessage?: string }).statusMessage ?? "Unexpected error.";
}
</script>

<template>
  <AppTopbar title="Sandbox" subtitle="Reproduce incidents locally on ministack" />

  <main class="mx-auto w-full max-w-3xl flex-1 space-y-4 p-5">
    <Card>
      <CardContent class="flex items-start gap-3 p-5">
        <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <FlaskConical class="size-4" />
        </span>
        <div class="text-sm text-muted-foreground">
          <p class="font-medium text-foreground">Local incident reproduction</p>
          <p class="mt-0.5 leading-relaxed">
            BySentinel packages the repository at the failing commit, deploys it as a Lambda on
            your ministack instance and replays the sanitized request. The result and execution
            logs land on the incident, ready for the developer.
          </p>
        </div>
      </CardContent>
    </Card>

    <div v-if="loading" class="space-y-3">
      <Skeleton class="h-16 w-full" />
      <Skeleton class="h-48 w-full" />
    </div>

    <template v-else>
      <Card>
        <CardContent class="flex items-center justify-between gap-4 p-5">
          <div class="flex items-start gap-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-muted/40">
              <Container class="size-4" />
            </span>
            <div>
              <p class="text-sm font-medium">Enable sandbox simulations</p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                Requires the ministack service from docker-compose (port 4566).
              </p>
            </div>
          </div>
          <Switch v-model="form.enabled" :disabled="!isAdmin" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-col gap-2">
            <Label for="sb-url">Ministack URL</Label>
            <Input id="sb-url" v-model="form.ministackUrl" placeholder="http://ministack:4566" :disabled="!isAdmin" />
            <p class="text-xs text-muted-foreground">
              From the collector's network. Inside docker-compose use http://ministack:4566.
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="flex flex-col gap-2">
              <Label for="sb-region">Region</Label>
              <Input id="sb-region" v-model="form.region" placeholder="us-east-1" :disabled="!isAdmin" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="sb-runtime">Runtime</Label>
              <Select id="sb-runtime" v-model="form.runtime" :options="runtimeOptions" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="sb-timeout">Timeout (ms)</Label>
              <Input id="sb-timeout" v-model="form.timeoutMs" type="number" :min="5000" :max="300000" :step="5000" :disabled="!isAdmin" />
            </div>
          </div>
          <p v-if="!isAdmin" class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleAlert class="size-3.5" /> Viewer accounts cannot change these settings.
          </p>
        </CardContent>
        <CardFooter class="justify-end">
          <Button :disabled="saving || !isAdmin" @click="save">
            <Loader2 v-if="saving" class="size-4 animate-spin" />
            <Check v-else class="size-4" />
            Save configuration
          </Button>
        </CardFooter>
      </Card>
    </template>
  </main>
</template>
