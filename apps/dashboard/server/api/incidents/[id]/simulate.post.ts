import { callCollector, requireAdmin } from "~~/server/utils/collector";

export default defineEventHandler((event) => {
  requireAdmin(event);
  const id = getRouterParam(event, "id");
  return callCollector(event, `/api/incidents/${encodeURIComponent(id ?? "")}/simulate`, {
    method: "POST",
    timeout: 300_000,
  });
});
