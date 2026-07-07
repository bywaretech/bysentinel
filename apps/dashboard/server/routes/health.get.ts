import { collectorBase } from "~~/server/utils/collector";

interface DashboardHealth {
  ok: boolean;
  collector: unknown;
}

export default defineEventHandler(async (event): Promise<DashboardHealth> => {
  try {
    const health: unknown = await $fetch(`${collectorBase(event)}/health`, {
      retry: 0,
      timeout: 5000,
    });
    return { ok: true, collector: health };
  } catch {
    setResponseStatus(event, 502);
    return { ok: false, collector: { ok: false } };
  }
});
