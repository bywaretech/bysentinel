import type { PublicAISettings } from "~/lib/types";
import { callCollector, requireAdmin } from "~~/server/utils/collector";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody(event);
  return callCollector<PublicAISettings>(event, "/api/settings/ai", {
    method: "POST",
    body,
  });
});
