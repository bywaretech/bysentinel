import type { Incident } from "~/lib/types";
import { callCollector } from "~~/server/utils/collector";

export default defineEventHandler((event) => {
  const id = getRouterParam(event, "id");
  return callCollector<Incident>(event, `/api/incidents/${encodeURIComponent(id ?? "")}`);
});
