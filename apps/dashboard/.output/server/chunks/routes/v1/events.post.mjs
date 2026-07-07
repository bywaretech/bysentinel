import { d as defineEventHandler, i as readRawBody, j as getHeader, h as setResponseStatus, k as setHeader } from '../../nitro/nitro.mjs';
import { c as collectorBase } from '../../_/collector.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const events_post = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const body = await readRawBody(event, "utf8");
  const response = await fetch(`${collectorBase(event)}/v1/events`, {
    method: "POST",
    headers: {
      "content-type": (_a = getHeader(event, "content-type")) != null ? _a : "application/json",
      "x-api-key": (_b = getHeader(event, "x-api-key")) != null ? _b : "",
      "x-bysentinel-event-id": (_c = getHeader(event, "x-bysentinel-event-id")) != null ? _c : ""
    },
    body: body != null ? body : ""
  });
  const text = await response.text();
  setResponseStatus(event, response.status);
  setHeader(event, "content-type", (_d = response.headers.get("content-type")) != null ? _d : "application/json");
  for (const header of ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]) {
    const value = response.headers.get(header);
    if (value) setHeader(event, header, value);
  }
  return text ? JSON.parse(text) : {};
});

export { events_post as default };
//# sourceMappingURL=events.post.mjs.map
