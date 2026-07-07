import {
  ROLE_COOKIE,
  SESSION_COOKIE,
  TOKEN_COOKIE,
  UNAME_COOKIE,
  USER_COOKIE,
} from "~~/server/utils/collector";

export default defineEventHandler((event) => {
  for (const name of [TOKEN_COOKIE, SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE, UNAME_COOKIE]) {
    deleteCookie(event, name, { path: "/" });
  }
  return { ok: true };
});
