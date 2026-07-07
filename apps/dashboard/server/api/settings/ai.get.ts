import type { PublicAISettings } from "~/lib/types";
import { callCollector } from "~~/server/utils/collector";

export default defineEventHandler((event) =>
  callCollector<PublicAISettings>(event, "/api/settings/ai"),
);
