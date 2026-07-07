import type { Incident } from "~/lib/types";
import { callCollector } from "~~/server/utils/collector";

export default defineEventHandler((event) =>
  callCollector<Incident[]>(event, "/api/incidents"),
);
