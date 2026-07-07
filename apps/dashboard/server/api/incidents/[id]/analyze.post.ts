import type { Incident } from "~/lib/types";
import { callCollector, requireAdmin } from "~~/server/utils/collector";

export default defineEventHandler((event) => {
  requireAdmin(event);
  const id = getRouterParam(event, "id");
  return callCollector<Incident>(
    event,
    `/api/incidents/${encodeURIComponent(id ?? "")}/analyze`,
    { method: "POST" },
  );
});
