<script setup lang="ts">
import {
  UsersRound,
  Plus,
  Trash2,
  Loader2,
  Check,
  ShieldCheck,
  Eye as EyeIcon,
} from "lucide-vue-next";
import type { PublicUser, UserRole } from "~/lib/types";
import { relativeTime } from "~/lib/display";

useHead({ title: "Users — BySentinel" });

const api = useApi();
const { success, error: toastError, } = useToast();
const { isAdmin } = useAuth();

// Viewer accounts should not land here.
if (import.meta.client && !isAdmin.value) {
  await navigateTo("/");
}

const users = ref<PublicUser[]>([]);
const loading = ref(true);
const saving = ref(false);
const adding = ref(false);

const form = reactive({ username: "", password: "", role: "admin" as UserRole });
const roleOptions = [
  { value: "admin", label: "Admin — full access" },
  { value: "viewer", label: "Viewer — read only" },
];

onMounted(load);
async function load() {
  loading.value = true;
  try {
    users.value = await api.get<PublicUser[]>("/users");
  } catch (err: unknown) {
    toastError("Could not load users", msg(err));
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (saving.value || !form.username.trim() || form.password.length < 8) return;
  saving.value = true;
  try {
    const user = await api.post<PublicUser>("/users", { ...form });
    users.value = [...users.value, user];
    success("User created", `${user.username} can sign in now.`);
    form.username = "";
    form.password = "";
    adding.value = false;
  } catch (err: unknown) {
    toastError("Could not create user", msg(err));
  } finally {
    saving.value = false;
  }
}

async function remove(user: PublicUser) {
  try {
    await api.request(`/users/${user.id}`, { method: "DELETE" });
    users.value = users.value.filter((u) => u.id !== user.id);
    success("User removed", user.username);
  } catch (err: unknown) {
    toastError("Could not remove user", msg(err));
  }
}

function msg(err: unknown): string {
  return (err as { statusMessage?: string }).statusMessage ?? "Unexpected error.";
}
</script>

<template>
  <AppTopbar title="Users" subtitle="Accounts that can sign in to this dashboard" />

  <main class="mx-auto w-full max-w-3xl flex-1 space-y-4 p-5">
    <div v-if="loading" class="space-y-3">
      <Skeleton class="h-16 w-full" />
      <Skeleton class="h-16 w-full" />
    </div>

    <template v-else>
      <Card
        v-if="users.some((u) => u.username === 'bysentinel')"
        class="border-sev-medium/30"
      >
        <CardContent class="flex items-start gap-3 p-4">
          <ShieldCheck class="mt-0.5 size-4 shrink-0 text-sev-medium" />
          <p class="text-sm text-muted-foreground">
            The default <span class="font-mono text-foreground">bysentinel</span> account from the
            install is still active. Create named accounts for the team and remove it, or make sure
            its password was changed via <span class="font-mono">BYSENTINEL_DEFAULT_PASSWORD</span>.
          </p>
        </CardContent>
      </Card>

      <Card v-if="users.length">
        <div class="divide-y divide-border/50">
          <div
            v-for="user in users"
            :key="user.id"
            class="flex items-center justify-between gap-4 px-5 py-3.5"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="grid size-9 shrink-0 place-items-center rounded-full border border-border/60 bg-muted/40 text-sm font-semibold uppercase"
              >
                {{ user.username.slice(0, 2) }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ user.username }}</p>
                <p class="text-xs text-muted-foreground">
                  Created {{ relativeTime(user.createdAt) }}
                </p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <Badge :variant="user.role === 'admin' ? 'default' : 'muted'" class="capitalize">
                <component :is="user.role === 'admin' ? ShieldCheck : EyeIcon" class="size-3" />
                {{ user.role }}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove user"
                class="text-destructive hover:text-destructive"
                @click="remove(user)"
              >
                <Trash2 class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <EmptyState
        v-else-if="!adding"
        :icon="UsersRound"
        title="No accounts yet"
        description="You are signed in with the admin token. Create named accounts so the team stops sharing it."
      >
        <Button size="sm" @click="adding = true"><Plus class="size-4" /> Create account</Button>
      </EmptyState>

      <Button v-if="users.length && !adding" variant="secondary" size="sm" @click="adding = true">
        <Plus class="size-4" /> Create account
      </Button>

      <Card v-if="adding">
        <CardHeader>
          <CardTitle>New account</CardTitle>
          <CardDescription>Passwords are hashed on the collector (scrypt). Minimum 8 characters.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 sm:grid-cols-3">
          <div class="flex flex-col gap-2">
            <Label for="u-name">Username</Label>
            <Input id="u-name" v-model="form.username" autocomplete="off" placeholder="ana.souza" />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="u-pass">Password</Label>
            <Input id="u-pass" v-model="form.password" type="password" autocomplete="new-password" placeholder="At least 8 characters" />
          </div>
          <div class="flex flex-col gap-2">
            <Label for="u-role">Role</Label>
            <Select id="u-role" v-model="form.role" :options="roleOptions" />
          </div>
        </CardContent>
        <CardFooter class="justify-end gap-2">
          <Button variant="ghost" :disabled="saving" @click="adding = false">Cancel</Button>
          <Button :disabled="saving || !form.username.trim() || form.password.length < 8" @click="create">
            <Loader2 v-if="saving" class="size-4 animate-spin" />
            <Check v-else class="size-4" />
            Create account
          </Button>
        </CardFooter>
      </Card>
    </template>
  </main>
</template>
