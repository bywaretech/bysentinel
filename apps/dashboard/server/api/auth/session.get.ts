import { TOKEN_COOKIE, getSessionUser } from "~~/server/utils/collector";

export default defineEventHandler((event) => {
  const tokenSession = Boolean(getCookie(event, TOKEN_COOKIE));
  const user = getSessionUser(event);
  return {
    authenticated: tokenSession || Boolean(user),
    user: user ?? (tokenSession ? { username: "admin token", role: "admin" as const } : undefined),
  };
});
