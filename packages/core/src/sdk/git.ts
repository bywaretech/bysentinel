import type { GitContext } from "../types/event.js";

const pick = (...keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.length > 0) return v;
  }
  return undefined;
};

/**
 * Resolve Git/release correlation metadata. Explicit `overrides` win; otherwise
 * we read BySentinel vars first, then common CI providers (GitHub Actions,
 * GitLab CI, Vercel). Returns undefined when nothing is known.
 */
export function resolveGitContext(overrides?: GitContext): GitContext | undefined {
  const repoFromGithub =
    pick("GITHUB_SERVER_URL") && pick("GITHUB_REPOSITORY")
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
      : undefined;

  const git: GitContext = {
    commitSha:
      overrides?.commitSha ??
      pick("BYSENTINEL_GIT_SHA", "GIT_SHA", "GITHUB_SHA", "CI_COMMIT_SHA", "VERCEL_GIT_COMMIT_SHA"),
    branch:
      overrides?.branch ??
      pick("BYSENTINEL_GIT_BRANCH", "GITHUB_REF_NAME", "CI_COMMIT_BRANCH", "VERCEL_GIT_COMMIT_REF"),
    version: overrides?.version ?? pick("BYSENTINEL_VERSION", "npm_package_version"),
    release: overrides?.release ?? pick("BYSENTINEL_RELEASE"),
    buildTimestamp: overrides?.buildTimestamp ?? pick("BYSENTINEL_BUILD_TIME"),
    repositoryUrl:
      overrides?.repositoryUrl ?? pick("BYSENTINEL_GIT_REPO_URL", "CI_PROJECT_URL") ?? repoFromGithub,
  };

  // Drop the object entirely if every field is empty.
  return Object.values(git).some((v) => v != null) ? git : undefined;
}
