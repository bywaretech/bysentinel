import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { b as callCollector } from '../../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const sandbox_get = defineEventHandler((event) => callCollector(event, "/api/settings/sandbox"));

export { sandbox_get as default };
//# sourceMappingURL=sandbox.get.mjs.map
