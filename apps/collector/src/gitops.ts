import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitAuthType = "none" | "http" | "ssh";

export interface GitRepositoryConfig {
  /** BySentinel project name this repository maps to. */
  project: string;
  /** Clone URL: https://... for http/none, git@host:org/repo.git for ssh. */
  url: string;
  authType: GitAuthType;
  /** HTTP auth username. Defaults to x-access-token (GitHub PAT style). */
  username?: string;
  /** HTTP token / password. Stored server-side, never returned to clients. */
  token?: string;
  /** SSH private key (PEM). Stored server-side, never returned to clients. */
  sshKey?: string;
  /** Sub-directory that holds the Lambda source (also the sandbox zip root). */
  sourceDir?: string;
  /** Lambda handler for sandbox simulation, e.g. "index.handler". */
  handler?: string;
}

export interface GitSettings {
  repositories: GitRepositoryConfig[];
}

export interface PublicGitRepository extends Omit<GitRepositoryConfig, "token" | "sshKey"> {
  hasToken: boolean;
  hasSshKey: boolean;
}

export interface SourceFileSnippet {
  path: string;
  /** 1-indexed line the snippet starts at. */
  startLine: number;
  /** Line referenced by the stack trace, when known. */
  focusLine?: number;
  content: string;
}

export interface SourceContext {
  commitSha: string;
  repositoryUrl: string;
  files: SourceFileSnippet[];
  fetchedAt: string;
  warnings: string[];
}

export const DEFAULT_GIT_SETTINGS: GitSettings = { repositories: [] };

export function publicGitSettings(settings: GitSettings): { repositories: PublicGitRepository[] } {
  return {
    repositories: settings.repositories.map(({ token, sshKey, ...rest }) => ({
      ...rest,
      hasToken: Boolean(token),
      hasSshKey: Boolean(sshKey),
    })),
  };
}

export function normalizeGitSettings(input: unknown, current: GitSettings): GitSettings {
  if (typeof input !== "object" || input === null) throw new Error("settings must be an object");
  const record = input as { repositories?: unknown };
  if (!Array.isArray(record.repositories)) throw new Error("settings must include repositories[]");
  if (record.repositories.length > 50) throw new Error("too many repositories");

  const repositories = record.repositories.map((raw) => {
    if (typeof raw !== "object" || raw === null) throw new Error("repository must be an object");
    const r = raw as Record<string, unknown>;
    const project = text(r.project, 120);
    const url = text(r.url, 2048);
    if (!project) throw new Error("repository requires a project name");
    if (!url) throw new Error("repository requires a clone URL");
    const authType: GitAuthType =
      r.authType === "http" || r.authType === "ssh" ? r.authType : "none";
    // file:// is allowed for "none" so local/self-hosted repos can be mapped.
    if (authType !== "ssh" && !/^(https?|file):\/\//.test(url)) {
      throw new Error("http/none repositories must use an http(s) or file clone URL");
    }
    if (authType === "http" && !/^https?:\/\//.test(url)) {
      throw new Error("http repositories must use an http(s) clone URL");
    }

    // Keep previously stored secrets when the client omits them (masked round-trip).
    const previous = current.repositories.find((p) => p.project === project);
    const token = secret(r.token) ?? previous?.token;
    const sshKey = secret(r.sshKey) ?? previous?.sshKey;

    return {
      project,
      url,
      authType,
      username: text(r.username, 120) || undefined,
      token: authType === "http" ? token : undefined,
      sshKey: authType === "ssh" ? sshKey : undefined,
      sourceDir: sanitizeRelPath(text(r.sourceDir, 300)) || undefined,
      handler: text(r.handler, 120) || undefined,
    } satisfies GitRepositoryConfig;
  });

  const seen = new Set<string>();
  for (const repo of repositories) {
    if (seen.has(repo.project)) throw new Error(`duplicate repository for project ${repo.project}`);
    seen.add(repo.project);
  }
  return { repositories };
}

/**
 * Shallow-fetch a repository at an exact commit SHA into the data dir cache.
 * Returns the checkout directory. Secrets are passed per-invocation (http
 * extraheader / GIT_SSH_COMMAND) so they never land in .git/config.
 */
export async function syncRepoAtSha(
  repo: GitRepositoryConfig,
  commitSha: string,
  dataDir: string,
): Promise<string> {
  if (!/^[0-9a-f]{7,40}$/i.test(commitSha)) throw new Error("invalid commit SHA");
  const key = createHash("sha256").update(`${repo.url}#${commitSha}`).digest("hex").slice(0, 16);
  const dir = join(dataDir, "repos", `${safeName(repo.project)}-${key}`);

  const marker = join(dir, ".bysentinel-sha");
  try {
    if ((await readFile(marker, "utf8")).trim() === commitSha) return dir; // cache hit
  } catch {
    /* not cached yet */
  }

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  const configArgs: string[] = [];

  let keyFile: string | undefined;
  if (repo.authType === "ssh" && repo.sshKey) {
    keyFile = join(dataDir, "keys", `${safeName(repo.project)}-${key}.pem`);
    await mkdir(join(dataDir, "keys"), { recursive: true });
    await writeFile(keyFile, repo.sshKey.endsWith("\n") ? repo.sshKey : repo.sshKey + "\n", {
      mode: 0o600,
    });
    await chmod(keyFile, 0o600);
    env.GIT_SSH_COMMAND = `ssh -i ${keyFile} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes`;
  } else if (repo.authType === "http" && repo.token) {
    const basic = Buffer.from(`${repo.username || "x-access-token"}:${repo.token}`).toString(
      "base64",
    );
    configArgs.push("-c", `http.extraheader=Authorization: Basic ${basic}`);
  }

  const git = async (...args: string[]) => {
    await execFileAsync("git", [...configArgs, ...args], {
      cwd: dir,
      env,
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
  };

  try {
    await git("init", "--quiet");
    await git("remote", "add", "origin", repo.url);
    await git("fetch", "--quiet", "--depth", "1", "origin", commitSha);
    await git("checkout", "--quiet", "FETCH_HEAD");
    await writeFile(marker, commitSha);
    return dir;
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    const message = error instanceof Error ? error.message : "git error";
    // Never surface tokens embedded in git's stderr.
    throw new Error(`git fetch failed: ${message.replace(/Basic [A-Za-z0-9+/=]+/g, "Basic ***")}`);
  } finally {
    if (keyFile) await rm(keyFile, { force: true }).catch(() => {});
  }
}

const STACK_PATH_RE = /(?:at\s+.*?\(|at\s+|\()?\/?(?:var\/task\/)?([\w@./-]+\.(?:mjs|cjs|js|ts))(?::(\d+))?/g;
const MAX_FILES = 4;
const MAX_TOTAL_BYTES = 14_000;
const WINDOW = 60;

/**
 * Read the files referenced by a stack trace from the checked-out repository.
 * Returns focused snippets, capped so prompts stay bounded.
 */
export async function extractSourceContext(
  repo: GitRepositoryConfig,
  repoDir: string,
  commitSha: string,
  stack: string | undefined,
  extraPaths: string[] = [],
): Promise<SourceContext> {
  const warnings: string[] = [];
  const refs = new Map<string, number | undefined>();

  for (const match of (stack ?? "").matchAll(STACK_PATH_RE)) {
    const rel = sanitizeRelPath(match[1] ?? "");
    if (!rel || rel.includes("node_modules")) continue;
    const line = match[2] ? Number(match[2]) : undefined;
    if (!refs.has(rel) || (line && !refs.get(rel))) refs.set(rel, line);
  }
  for (const extra of extraPaths) {
    const rel = sanitizeRelPath(extra).replace(/^var\/task\//, "");
    if (rel && !refs.has(rel)) refs.set(rel, undefined);
  }

  const base = repo.sourceDir ? join(repoDir, repo.sourceDir) : repoDir;
  const files: SourceFileSnippet[] = [];
  let budget = MAX_TOTAL_BYTES;

  for (const [rel, focusLine] of refs) {
    if (files.length >= MAX_FILES || budget <= 0) break;
    const candidates = repo.sourceDir ? [join(base, rel), join(repoDir, rel)] : [join(repoDir, rel)];
    let resolved: string | undefined;
    for (const candidate of candidates) {
      try {
        if ((await stat(candidate)).isFile()) {
          resolved = candidate;
          break;
        }
      } catch {
        /* keep looking */
      }
    }
    if (!resolved) {
      warnings.push(`file not found in repository: ${rel}`);
      continue;
    }

    const raw = await readFile(resolved, "utf8");
    const lines = raw.split("\n");
    let startLine = 1;
    let slice = lines;
    if (focusLine && lines.length > WINDOW * 2) {
      startLine = Math.max(1, focusLine - WINDOW);
      slice = lines.slice(startLine - 1, focusLine + WINDOW);
    }
    let content = slice.join("\n");
    if (content.length > budget) content = content.slice(0, budget) + "\n... [truncated]";
    budget -= content.length;
    files.push({ path: rel, startLine, focusLine, content });
  }

  if (!files.length) warnings.push("no stack-referenced files could be resolved in the repository");
  return {
    commitSha,
    repositoryUrl: repo.url,
    files,
    fetchedAt: new Date().toISOString(),
    warnings,
  };
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error("value is too long");
  return trimmed;
}

function secret(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 16_384) throw new Error("secret is too long");
  return trimmed;
}

function sanitizeRelPath(value: string): string {
  const cleaned = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..")) return "";
  return cleaned;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60);
}
