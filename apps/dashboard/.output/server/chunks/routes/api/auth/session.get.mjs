import { d as defineEventHandler, e as getCookie } from '../../../nitro/nitro.mjs';
import { g as getSessionUser, T as TOKEN_COOKIE } from '../../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const session_get = defineEventHandler((event) => {
  const tokenSession = Boolean(getCookie(event, TOKEN_COOKIE));
  const user = getSessionUser(event);
  return {
    authenticated: tokenSession || Boolean(user),
    user: user != null ? user : tokenSession ? { username: "admin token", role: "admin" } : void 0
  };
});

export { session_get as default };
//# sourceMappingURL=session.get.mjs.map
