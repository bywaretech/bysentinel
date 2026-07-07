import { d as defineEventHandler, g as getRequestIP, c as createError, r as readBody, a as getRequestProtocol, u as useRuntimeConfig, s as setCookie } from '../../../nitro/nitro.mjs';
import { c as collectorBase, s as signUserSession, U as USER_COOKIE, R as ROLE_COOKIE, a as UNAME_COOKIE, S as SESSION_COOKIE, T as TOKEN_COOKIE } from '../../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class FixedWindowRateLimiter {
  constructor(limit, windowMs = 6e4) {
    __publicField(this, "limit", limit);
    __publicField(this, "windowMs", windowMs);
    __publicField(this, "buckets", /* @__PURE__ */ new Map());
  }
  hit(key) {
    const now = Date.now();
    const current = this.buckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + this.windowMs };
    bucket.count += 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 5e3) {
      for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
    }
    return bucket.count <= this.limit;
  }
}
const loginRateLimiter = new FixedWindowRateLimiter(10);

const SESSION_TTL_SEC = 60 * 60 * 12;
const login_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e;
  const ip = (_a = getRequestIP(event, { xForwardedFor: true })) != null ? _a : "unknown";
  if (!loginRateLimiter.hit(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many attempts. Wait a minute and try again."
    });
  }
  const body = await readBody(event);
  const secure = getRequestProtocol(event) === "https";
  const common = { path: "/", sameSite: "lax", secure, maxAge: SESSION_TTL_SEC };
  if (body == null ? void 0 : body.username) {
    const adminToken = useRuntimeConfig(event).adminToken;
    if (!adminToken) {
      throw createError({
        statusCode: 501,
        statusMessage: "User login requires NUXT_ADMIN_TOKEN configured on the dashboard server"
      });
    }
    let user;
    try {
      const result = await $fetch(
        `${collectorBase(event)}/api/auth/login`,
        {
          method: "POST",
          body: { username: body.username, password: (_b = body.password) != null ? _b : "" },
          retry: 0,
          timeout: 15e3
        }
      );
      user = result.user;
    } catch (err) {
      const status = (_c = err.statusCode) != null ? _c : err.status;
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
      httpOnly: true
    });
    setCookie(event, SESSION_COOKIE, "1", { ...common, httpOnly: false });
    setCookie(event, ROLE_COOKIE, user.role, { ...common, httpOnly: false });
    setCookie(event, UNAME_COOKIE, user.username, { ...common, httpOnly: false });
    return { ok: true, user };
  }
  const token = (_d = body == null ? void 0 : body.token) == null ? void 0 : _d.trim();
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Credentials are required" });
  }
  try {
    await $fetch(`${collectorBase(event)}/api/incidents`, {
      headers: { authorization: `Bearer ${token}` },
      retry: 0,
      timeout: 15e3
    });
  } catch (err) {
    const status = (_e = err.statusCode) != null ? _e : err.status;
    if (status === 401) {
      throw createError({ statusCode: 401, statusMessage: "Invalid admin token" });
    }
    throw createError({
      statusCode: 502,
      statusMessage: "Cannot reach the collector. Check its URL and that it is running."
    });
  }
  setCookie(event, TOKEN_COOKIE, token, { ...common, httpOnly: true });
  setCookie(event, SESSION_COOKIE, "1", { ...common, httpOnly: false });
  setCookie(event, ROLE_COOKIE, "admin", { ...common, httpOnly: false });
  setCookie(event, UNAME_COOKIE, "admin token", { ...common, httpOnly: false });
  return { ok: true, user: { username: "admin token", role: "admin" } };
});

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
