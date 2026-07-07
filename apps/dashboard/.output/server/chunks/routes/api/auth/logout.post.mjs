import { d as defineEventHandler, b as deleteCookie } from '../../../nitro/nitro.mjs';
import { T as TOKEN_COOKIE, S as SESSION_COOKIE, U as USER_COOKIE, R as ROLE_COOKIE, a as UNAME_COOKIE } from '../../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const logout_post = defineEventHandler((event) => {
  for (const name of [TOKEN_COOKIE, SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE, UNAME_COOKIE]) {
    deleteCookie(event, name, { path: "/" });
  }
  return { ok: true };
});

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
