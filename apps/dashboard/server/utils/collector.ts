import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";

export const TOKEN_COOKIE = "bs_token";
export const SESSION_COOKIE = "bs_session";
export const USER_COOKIE = "bs_user";
export const ROLE_COOKIE = "bs_role";
/** Display-only username for the UI. Never used for authorization. */
export const UNAME_COOKIE = "bs_uname";

export interface SessionUser {
  username: string;
  role: "admin" | "viewer";
  exp: number;
}

/** Secret for signing user-session cookies. Falls back to a per-process key. */
let processSecret: string | undefined;
function signingSecret(event: H3Event): string {
  const configured = useRuntimeConfig(event).adminToken;
  if (configured) return configured;
  processSecret ??= randomBytes(32).toString("hex");
  return processSecret;
}

export function signUserSession(event: H3Event, user: Omit<SessionUser, "exp">, ttlSec: number): string {
  const payload: SessionUser = { ...user, exp: Math.floor(Date.now() / 1000) + ttlSec };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", signingSecret(event)).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function getSessionUser(event: H3Event): SessionUser | undefined {
  const raw = getCookie(event, USER_COOKIE);
  if (!raw) return undefined;
  const [body, mac] = raw.split(".");
  if (!body || !mac) return undefined;
  const expected = createHmac("sha256", signingSecret(event)).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  try {
    const user = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionUser;
    if (!user.username || user.exp < Math.floor(Date.now() / 1000)) return undefined;
    return user;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the upstream admin credential for this request.
 * - Token sessions carry the collector admin token in a httpOnly cookie.
 * - User sessions (signed cookie) use the server-configured admin token.
 * The env token alone never authenticates a browser request.
 */
export function resolveToken(event: H3Event): string | undefined {
  const fromCookie = getCookie(event, TOKEN_COOKIE);
  if (fromCookie) return fromCookie;
  if (getSessionUser(event)) return useRuntimeConfig(event).adminToken || undefined;
  return undefined;
}

/** Admin gate: token sessions are admin; user sessions must carry the role. */
export function requireAdmin(event: H3Event): void {
  if (getCookie(event, TOKEN_COOKIE)) return;
  const user = getSessionUser(event);
  if (user?.role === "admin") return;
  // Distinguish "not signed in" (401) from "signed in but not allowed" (403).
  if (!user) throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  throw createError({ statusCode: 403, statusMessage: "Admin access required" });
}

export function collectorBase(event: H3Event): string {
  return useRuntimeConfig(event).collectorUrl.replace(/\/$/, "");
}

/**
 * Proxy a request to the collector's admin API using the session credential
 * as Bearer. The token never reaches the browser.
 */
export async function callCollector<T>(
  event: H3Event,
  path: string,
  init: { method?: string; body?: unknown; timeout?: number } = {},
): Promise<T> {
  const token = resolveToken(event);
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  try {
    const call = $fetch as unknown as (
      url: string,
      opts: Record<string, unknown>,
    ) => Promise<unknown>;
    return (await call(`${collectorBase(event)}${path}`, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: init.body,
      retry: 0,
      timeout: init.timeout ?? 30000,
    })) as T;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number; status?: number }).statusCode ??
      (err as { status?: number }).status;
    if (status === 401) {
      throw createError({ statusCode: 401, statusMessage: "Collector rejected the token" });
    }
    if (status && status >= 400 && status < 500) {
      const data = (err as { data?: { error?: string } }).data;
      throw createError({ statusCode: status, statusMessage: data?.error ?? "Request failed" });
    }
    throw createError({
      statusCode: 502,
      statusMessage: "Cannot reach the collector",
    });
  }
}
