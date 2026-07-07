import {
  ROLE_COOKIE,
  SESSION_COOKIE,
  TOKEN_COOKIE,
  UNAME_COOKIE,
  USER_COOKIE,
  collectorBase,
  signUserSession,
} from "~~/server/utils/collector";
import { loginRateLimiter } from "~~/server/utils/rateLimit";

const SESSION_TTL_SEC = 60 * 60 * 12;

export default defineEventHandler(async (event) => {
  // Throttle by real client IP (Caddy/proxy sets X-Forwarded-For).
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  if (!loginRateLimiter.hit(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many attempts. Wait a minute and try again.",
    });
  }

  const body = await readBody<{ token?: string; username?: string; password?: string }>(event);
  const secure = getRequestProtocol(event) === "https";
  const common = { path: "/", sameSite: "lax" as const, secure, maxAge: SESSION_TTL_SEC };

  // Mode 1: username/password against the collector's user store.
  if (body?.username) {
    const adminToken = useRuntimeConfig(event).adminToken;
    if (!adminToken) {
      throw createError({
        statusCode: 501,
        statusMessage:
          "User login requires NUXT_ADMIN_TOKEN configured on the dashboard server",
      });
    }
    let user: { username: string; role: "admin" | "viewer" };
    try {
      const result = await $fetch<{ ok: boolean; user: { username: string; role: "admin" | "viewer" } }>(
        `${collectorBase(event)}/api/auth/login`,
        {
          method: "POST",
          body: { username: body.username, password: body.password ?? "" },
          retry: 0,
          timeout: 15000,
        },
      );
      user = result.user;
    } catch (err: unknown) {
      const status =
        (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status;
      if (status === 401) {
        throw createError({ statusCode: 401, statusMessage: "Invalid username or password" });
      }
      if (status === 429) {
        throw createError({ statusCode: 429, statusMessage: "Too many attempts. Wait a minute." });
      }
      throw createError({ statusCode: 502, statusMessage: "Cannot reach the collector" });
    }

    setCookie(event, USER_COOKIE, signUserSession(event, user, SESSION_TTL_SEC), {
      ...common,
      httpOnly: true,
    });
    setCookie(event, SESSION_COOKIE, "1", { ...common, httpOnly: false });
    setCookie(event, ROLE_COOKIE, user.role, { ...common, httpOnly: false });
    setCookie(event, UNAME_COOKIE, user.username, { ...common, httpOnly: false });
    return { ok: true, user };
  }

  // Mode 2: collector admin token.
  const token = body?.token?.trim();
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Credentials are required" });
  }
  try {
    await $fetch(`${collectorBase(event)}/api/incidents`, {
      headers: { authorization: `Bearer ${token}` },
      retry: 0,
      timeout: 15000,
    });
  } catch (err: unknown) {
    const status =
      (err as { statusCode?: number }).statusCode ?? (err as { status?: number }).status;
    if (status === 401) {
      throw createError({ statusCode: 401, statusMessage: "Invalid admin token" });
    }
    throw createError({
      statusCode: 502,
      statusMessage: "Cannot reach the collector. Check its URL and that it is running.",
    });
  }

  setCookie(event, TOKEN_COOKIE, token, { ...common, httpOnly: true });
  setCookie(event, SESSION_COOKIE, "1", { ...common, httpOnly: false });
  setCookie(event, ROLE_COOKIE, "admin", { ...common, httpOnly: false });
  setCookie(event, UNAME_COOKIE, "admin token", { ...common, httpOnly: false });
  return { ok: true, user: { username: "admin token", role: "admin" as const } };
});
