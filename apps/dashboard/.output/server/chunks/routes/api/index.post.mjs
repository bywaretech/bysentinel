import { d as defineEventHandler, r as readBody } from '../../nitro/nitro.mjs';
import { r as requireAdmin, b as callCollector } from '../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const index_post = defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody(event);
  return callCollector(event, "/api/users", { method: "POST", body });
});

export { index_post as default };
//# sourceMappingURL=index.post.mjs.map
