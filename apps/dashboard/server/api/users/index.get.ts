import { callCollector, requireAdmin } from "~~/server/utils/collector";

export default defineEventHandler((event) => {
  requireAdmin(event);
  return callCollector(event, "/api/users");
});
