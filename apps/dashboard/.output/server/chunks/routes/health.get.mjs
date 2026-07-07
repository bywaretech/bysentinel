import { d as defineEventHandler, h as setResponseStatus } from '../nitro/nitro.mjs';
import { c as collectorBase } from '../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const health_get = defineEventHandler(async (event) => {
  try {
    const health = await $fetch(`${collectorBase(event)}/health`, {
      retry: 0,
      timeout: 5e3
    });
    return { ok: true, collector: health };
  } catch {
    setResponseStatus(event, 502);
    return { ok: false, collector: { ok: false } };
  }
});

export { health_get as default };
//# sourceMappingURL=health.get.mjs.map
