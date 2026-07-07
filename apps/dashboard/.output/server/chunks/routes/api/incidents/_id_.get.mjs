import { d as defineEventHandler, f as getRouterParam } from '../../../nitro/nitro.mjs';
import { b as callCollector } from '../../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const _id__get = defineEventHandler((event) => {
  const id = getRouterParam(event, "id");
  return callCollector(event, `/api/incidents/${encodeURIComponent(id != null ? id : "")}`);
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
