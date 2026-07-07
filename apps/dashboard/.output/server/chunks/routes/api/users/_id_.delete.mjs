import { d as defineEventHandler, f as getRouterParam } from '../../../nitro/nitro.mjs';
import { r as requireAdmin, b as callCollector } from '../../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const _id__delete = defineEventHandler((event) => {
  requireAdmin(event);
  const id = getRouterParam(event, "id");
  return callCollector(event, `/api/users/${encodeURIComponent(id != null ? id : "")}`, {
    method: "DELETE"
  });
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
