/**
 * Same-origin API client. All requests hit the Nuxt Nitro proxy, which injects
 * the admin token server-side. On 401 we drop the session and bounce to login.
 */
export function useApi() {
  async function request<T>(
    path: string,
    opts: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    try {
      // Cast away Nitro's typed-route inference: the path is dynamic, which
      // otherwise triggers deep recursive route matching in the type checker.
      const call = $fetch as unknown as (
        url: string,
        opts: Record<string, unknown>,
      ) => Promise<unknown>;
      return (await call(`/api${path}`, {
        method: opts.method ?? "GET",
        body: opts.body,
        retry: 0,
      })) as T;
    } catch (err: unknown) {
      const status =
        (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status;
      if (status === 401 && import.meta.client) {
        const session = useCookie("bs_session");
        session.value = null;
        await navigateTo("/login");
      }
      throw err;
    }
  }

  return {
    request,
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  };
}
