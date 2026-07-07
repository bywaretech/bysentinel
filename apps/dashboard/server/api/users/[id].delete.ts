import { callCollector, requireAdmin } from "~~/server/utils/collector";

export default defineEventHandler((event) => {
  requireAdmin(event);
  const id = getRouterParam(event, "id");
  return callCollector(event, `/api/users/${encodeURIComponent(id ?? "")}`, {
    method: "DELETE",
  });
});
