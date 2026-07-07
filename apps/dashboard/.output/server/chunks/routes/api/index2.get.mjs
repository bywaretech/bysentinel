import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { r as requireAdmin, b as callCollector } from '../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const index_get = defineEventHandler((event) => {
  requireAdmin(event);
  return callCollector(event, "/api/users");
});

export { index_get as default };
//# sourceMappingURL=index2.get.mjs.map
