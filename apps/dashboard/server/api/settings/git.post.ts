import { callCollector, requireAdmin } from "~~/server/utils/collector";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody(event);
  return callCollector(event, "/api/settings/git", { method: "POST", body });
});
