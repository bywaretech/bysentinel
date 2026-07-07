import type { UserRole } from "~/lib/types";

export function useAuth() {
  const session = useCookie<string | null>("bs_session", { sameSite: "lax" });
  const role = useCookie<UserRole | null>("bs_role", { sameSite: "lax" });
  const username = useCookie<string | null>("bs_uname", { sameSite: "lax" });

  const isAuthenticated = computed(() => Boolean(session.value));
  const isAdmin = computed(() => role.value !== "viewer");

  async function loginWithToken(token: string) {
    await $fetch("/api/auth/login", { method: "POST", body: { token } });
    session.value = "1";
    role.value = "admin";
    username.value = "admin token";
  }

  async function loginWithUser(name: string, password: string) {
    const result = await $fetch<{ ok: boolean; user: { username: string; role: UserRole } }>(
      "/api/auth/login",
      { method: "POST", body: { username: name, password } },
    );
    session.value = "1";
    role.value = result.user.role;
    username.value = result.user.username;
  }

  async function logout() {
    await $fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    session.value = null;
    role.value = null;
    username.value = null;
    await navigateTo("/login");
  }

  return { isAuthenticated, isAdmin, role, username, loginWithToken, loginWithUser, logout };
}
