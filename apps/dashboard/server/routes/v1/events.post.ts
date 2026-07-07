import { collectorBase } from "~~/server/utils/collector";

export default defineEventHandler(async (event) => {
  const body = await readRawBody(event, "utf8");
  const response = await fetch(`${collectorBase(event)}/v1/events`, {
    method: "POST",
    headers: {
      "content-type": getHeader(event, "content-type") ?? "application/json",
      "x-api-key": getHeader(event, "x-api-key") ?? "",
      "x-bysentinel-event-id": getHeader(event, "x-bysentinel-event-id") ?? "",
    },
    body: body ?? "",
  });

  const text = await response.text();
  setResponseStatus(event, response.status);
  setHeader(event, "content-type", response.headers.get("content-type") ?? "application/json");
  for (const header of ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]) {
    const value = response.headers.get(header);
    if (value) setHeader(event, header, value);
  }

  return text ? JSON.parse(text) : {};
});
