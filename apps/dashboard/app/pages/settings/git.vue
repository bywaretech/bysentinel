<script setup lang="ts">
import {
  GitBranch,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Check,
  KeyRound,
  ShieldCheck,
  FolderGit2,
} from "lucide-vue-next";
import type { PublicGitRepository, PublicGitSettings, GitAuthType } from "~/lib/types";

useHead({ title: "Git repositories — BySentinel" });

const api = useApi();
const { success, error: toastError } = useToast();
const { isAdmin } = useAuth();

const repos = ref<PublicGitRepository[]>([]);
const loading = ref(true);
const saving = ref(false);

interface RepoForm {
  project: string;
  url: string;
  authType: GitAuthType;
  username: string;
  token: string;
  sshKey: string;
  sourceDir: string;
  handler: string;
}
const emptyForm = (): RepoForm => ({
  project: "",
  url: "",
  authType: "http",
  username: "",
  token: "",
  sshKey: "",
  sourceDir: "",
  handler: "index.handler",
});

const editing = ref<RepoForm | null>(null);
const editingOriginal = ref<string | null>(null); // project key being edited

const authOptions = [
  { value: "http", label: "HTTPS + token" },
  { value: "ssh", label: "SSH key" },
  { value: "none", label: "Public (no auth)" },
];

onMounted(load);
async function load() {
  loading.value = true;
  try {
    repos.value = (await api.get<PublicGitSettings>("/settings/git")).repositories;
  } catch (err: unknown) {
    toastError("Could not load git settings", msg(err));
  } finally {
    loading.value = false;
  }
}

function startAdd() {
  editing.value = emptyForm();
  editingOriginal.value = null;
}

function startEdit(repo: PublicGitRepository) {
  editing.value = {
    project: repo.project,
    url: repo.url,
    authType: repo.authType,
    username: repo.username ?? "",
    token: "",
    sshKey: "",
    sourceDir: repo.sourceDir ?? "",
    handler: repo.handler ?? "index.handler",
  };
  editingOriginal.value = repo.project;
}

async function persist(next: PublicGitRepository[], message: string) {
  saving.value = true;
  try {
    const payload = {
      repositories: next.map((r) => ({
        project: r.project,
        url: r.url,
        authType: r.authType,
        username: r.username || undefined,
        sourceDir: r.sourceDir || undefined,
        handler: r.handler || undefined,
        // Secrets are only sent when the temp form carries them (see save()).
        token: (r as PublicGitRepository & { token?: string }).token || undefined,
        sshKey: (r as PublicGitRepository & { sshKey?: string }).sshKey || undefined,
      })),
    };
    repos.value = (await api.post<PublicGitSettings>("/settings/git", payload)).repositories;
    success(message);
    editing.value = null;
    editingOriginal.value = null;
  } catch (err: unknown) {
    toastError("Could not save", msg(err));
  } finally {
    saving.value = false;
  }
}

async function save() {
  const form = editing.value;
  if (!form || !form.project.trim() || !form.url.trim()) return;
  const entry = {
    project: form.project.trim(),
    url: form.url.trim(),
    authType: form.authType,
    username: form.username.trim() || undefined,
    sourceDir: form.sourceDir.trim() || undefined,
    handler: form.handler.trim() || undefined,
    hasToken: false,
    hasSshKey: false,
    token: form.token.trim() || undefined,
    sshKey: form.sshKey.trim() || undefined,
  } as PublicGitRepository & { token?: string; sshKey?: string };

  const next = repos.value.filter((r) => r.project !== editingOriginal.value && r.project !== entry.project);
  next.push(entry);
  await persist(next, "Repository saved");
}

async function remove(project: string) {
  await persist(
    repos.value.filter((r) => r.project !== project),
    "Repository removed",
  );
}

function msg(err: unknown): string {
  return (err as { statusMessage?: string }).statusMessage ?? "Unexpected error.";
}
</script>

<template>
  <AppTopbar title="Git repositories" subtitle="Map projects to repositories for code-aware analysis" />

  <main class="mx-auto w-full max-w-3xl flex-1 space-y-4 p-5">
    <Card>
      <CardContent class="flex items-start gap-3 p-5">
        <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <GitBranch class="size-4" />
        </span>
        <div class="text-sm text-muted-foreground">
          <p class="font-medium text-foreground">How it works</p>
          <p class="mt-0.5 leading-relaxed">
            When an incident carries a commit SHA, BySentinel clones the mapped repository at
            that exact commit, reads the files referenced by the stack trace and feeds them to
            the AI analysis. The same checkout powers the sandbox simulation.
          </p>
        </div>
      </CardContent>
    </Card>

    <div v-if="loading" class="space-y-3">
      <Skeleton class="h-20 w-full" />
      <Skeleton class="h-20 w-full" />
    </div>

    <template v-else>
      <!-- Repo list -->
      <Card v-for="repo in repos" :key="repo.project">
        <CardContent class="flex items-center justify-between gap-4 p-4">
          <div class="min-w-0">
            <p class="flex items-center gap-2 text-sm font-medium">
              <FolderGit2 class="size-4 text-muted-foreground" />
              {{ repo.project }}
              <Badge variant="muted" class="font-mono text-[10px] uppercase">{{ repo.authType }}</Badge>
              <Badge v-if="repo.hasToken || repo.hasSshKey" variant="secondary" class="text-[10px]">
                <ShieldCheck class="size-3" /> credential stored
              </Badge>
            </p>
            <p class="mt-0.5 truncate font-mono text-xs text-muted-foreground">{{ repo.url }}</p>
            <p v-if="repo.sourceDir || repo.handler" class="mt-0.5 font-mono text-xs text-muted-foreground/70">
              {{ repo.sourceDir || "." }} · {{ repo.handler || "index.handler" }}
            </p>
          </div>
          <div v-if="isAdmin" class="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Edit" @click="startEdit(repo)">
              <Pencil class="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove"
              class="text-destructive hover:text-destructive"
              :disabled="saving"
              @click="remove(repo.project)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmptyState
        v-if="!repos.length && !editing"
        :icon="GitBranch"
        title="No repositories configured"
        description="Map a project to its repository so incidents can be analyzed with real code."
      >
        <Button v-if="isAdmin" size="sm" @click="startAdd">
          <Plus class="size-4" /> Add repository
        </Button>
      </EmptyState>

      <Button v-else-if="isAdmin && !editing" variant="secondary" size="sm" @click="startAdd">
        <Plus class="size-4" /> Add repository
      </Button>

      <!-- Editor -->
      <Card v-if="editing">
        <CardHeader>
          <CardTitle>{{ editingOriginal ? `Edit ${editingOriginal}` : "New repository" }}</CardTitle>
          <CardDescription>
            Credentials are stored on the collector only and never shown again.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <Label for="repo-project">Project</Label>
              <Input id="repo-project" v-model="editing.project" placeholder="checkout-api" />
              <p class="text-xs text-muted-foreground">Must match the SDK project name.</p>
            </div>
            <div class="flex flex-col gap-2">
              <Label for="repo-auth">Authentication</Label>
              <Select id="repo-auth" v-model="editing.authType" :options="authOptions" />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <Label for="repo-url">Clone URL</Label>
            <Input
              id="repo-url"
              v-model="editing.url"
              :placeholder="editing.authType === 'ssh' ? 'git@github.com:org/repo.git' : 'https://github.com/org/repo.git'"
            />
          </div>

          <template v-if="editing.authType === 'http'">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <Label for="repo-username">Username</Label>
                <Input id="repo-username" v-model="editing.username" placeholder="x-access-token (default)" />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="repo-token">Access token</Label>
                <Input
                  id="repo-token"
                  v-model="editing.token"
                  type="password"
                  autocomplete="new-password"
                  :placeholder="editingOriginal ? 'Leave empty to keep the stored token' : 'ghp_... / glpat-...'"
                />
              </div>
            </div>
          </template>

          <div v-else-if="editing.authType === 'ssh'" class="flex flex-col gap-2">
            <Label for="repo-key">SSH private key</Label>
            <textarea
              id="repo-key"
              v-model="editing.sshKey"
              rows="5"
              :placeholder="editingOriginal ? 'Leave empty to keep the stored key' : '-----BEGIN OPENSSH PRIVATE KEY-----'"
              class="w-full rounded-md border border-input bg-background/40 p-3 font-mono text-xs shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            />
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <KeyRound class="size-3.5" /> Use a read-only deploy key scoped to this repository.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <Label for="repo-dir">Source directory <span class="normal-case tracking-normal text-muted-foreground/70">optional</span></Label>
              <Input id="repo-dir" v-model="editing.sourceDir" placeholder="services/checkout" />
              <p class="text-xs text-muted-foreground">Lambda source root, also used as the sandbox package.</p>
            </div>
            <div class="flex flex-col gap-2">
              <Label for="repo-handler">Handler <span class="normal-case tracking-normal text-muted-foreground/70">for sandbox</span></Label>
              <Input id="repo-handler" v-model="editing.handler" placeholder="index.handler" />
            </div>
          </div>
        </CardContent>
        <CardFooter class="justify-end gap-2">
          <Button variant="ghost" :disabled="saving" @click="editing = null">Cancel</Button>
          <Button :disabled="saving || !editing.project.trim() || !editing.url.trim()" @click="save">
            <Loader2 v-if="saving" class="size-4 animate-spin" />
            <Check v-else class="size-4" />
            Save repository
          </Button>
        </CardFooter>
      </Card>
    </template>
  </main>
</template>
