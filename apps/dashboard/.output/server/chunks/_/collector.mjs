import { u as useRuntimeConfig, e as getCookie, c as createError } from '../nitro/nitro.mjs';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

const TOKEN_COOKIE = "bs_token";
const SESSION_COOKIE = "bs_session";
const USER_COOKIE = "bs_user";
const ROLE_COOKIE = "bs_role";
const UNAME_COOKIE = "bs_uname";
let processSecret;
function signingSecret(event) {
  const configured = useRuntimeConfig(event).adminToken;
  if (configured) return configured;
  processSecret != null ? processSecret : processSecret = randomBytes(32).toString("hex");
  return processSecret;
}
function signUserSession(event, user, ttlSec) {
  const payload = { ...user, exp: Math.floor(Date.now() / 1e3) + ttlSec };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", signingSecret(event)).update(body).digest("base64url");
  return `${body}.${mac}`;
}
function getSessionUser(event) {
  const raw = getCookie(event, USER_COOKIE);
  if (!raw) return void 0;
  const [body, mac] = raw.split(".");
  if (!body || !mac) return void 0;
  const expected = createHmac("sha256", signingSecret(event)).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return void 0;
  try {
    const user = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!user.username || user.exp < Math.floor(Date.now() / 1e3)) return void 0;
    return user;
  } catch {
    return void 0;
  }
}
function resolveToken(event) {
  const fromCookie = getCookie(event, TOKEN_COOKIE);
  if (fromCookie) return fromCookie;
  if (getSessionUser(event)) return useRuntimeConfig(event).adminToken || void 0;
  return void 0;
}
function requireAdmin(event) {
  if (getCookie(event, TOKEN_COOKIE)) return;
  const user = getSessionUser(event);
  if ((user == null ? void 0 : user.role) === "admin") return;
  if (!user) throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  throw createError({ statusCode: 403, statusMessage: "Admin access required" });
}
function collectorBase(event) {
  return useRuntimeConfig(event).collectorUrl.replace(/\/$/, "");
}
async function callCollector(event, path, init = {}) {
  var _a, _b, _c, _d;
  const token = resolveToken(event);
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }
  try {
    const call = $fetch;
    return await call(`${collectorBase(event)}${path}`, {
      method: (_a = init.method) != null ? _a : "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: init.body,
      retry: 0,
      timeout: (_b = init.timeout) != null ? _b : 3e4
    });
  } catch (err) {
    const status = (_c = err.statusCode) != null ? _c : err.status;
    if (status === 401) {
      throw createError({ statusCode: 401, statusMessage: "Collector rejected the token" });
    }
    if (status && status >= 400 && status < 500) {
      const data = err.data;
      throw createError({ statusCode: status, statusMessage: (_d = data == null ? void 0 : data.error) != null ? _d : "Request failed" });
    }
    throw createError({
      statusCode: 502,
      statusMessage: "Cannot reach the collector"
    });
  }
}

export { ROLE_COOKIE as R, SESSION_COOKIE as S, TOKEN_COOKIE as T, USER_COOKIE as U, UNAME_COOKIE as a, callCollector as b, collectorBase as c, getSessionUser as g, requireAdmin as r, signUserSession as s };
//# sourceMappingURL=collector.mjs.map
