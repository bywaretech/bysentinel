import { callCollector } from "~~/server/utils/collector";

export default defineEventHandler((event) => callCollector(event, "/api/settings/git"));
