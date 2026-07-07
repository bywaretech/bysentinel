import { d as defineEventHandler, f as getRouterParam } from '../../../../nitro/nitro.mjs';
import { r as requireAdmin, b as callCollector } from '../../../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const simulate_post = defineEventHandler((event) => {
  requireAdmin(event);
  const id = getRouterParam(event, "id");
  return callCollector(event, `/api/incidents/${encodeURIComponent(id != null ? id : "")}/simulate`, {
    method: "POST",
    timeout: 3e5
  });
});

export { simulate_post as default };
//# sourceMappingURL=simulate.post.mjs.map
