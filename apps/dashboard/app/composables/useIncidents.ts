import type { Incident } from "~/lib/types";
import { severityRank } from "~/lib/display";

export function useIncidents() {
  const api = useApi();

  const incidents = useState<Incident[]>("bs-incidents", () => []);
  const loaded = useState<boolean>("bs-incidents-loaded", () => false);
  const pending = useState<boolean>("bs-incidents-pending", () => false);
  const error = useState<string | null>("bs-incidents-error", () => null);

  async function refresh() {
    pending.value = true;
    error.value = null;
    try {
      incidents.value = await api.get<Incident[]>("/incidents");
      loaded.value = true;
    } catch (err: unknown) {
      error.value =
        (err as { statusMessage?: string }).statusMessage ??
        "Could not load incidents from the collector.";
    } finally {
      pending.value = false;
    }
  }

  const stats = computed(() => {
    const list = incidents.value;
    const analyzed = list.filter((i) => i.analysis).length;
    const highRisk = list.filter((i) =>
      ["critical", "high"].includes(i.analysis?.result?.severity ?? ""),
    ).length;
    const occurrences = list.reduce((n, i) => n + (i.occurrences ?? 0), 0);
    const securityFlags = list.filter(
      (i) =>
        i.analysis?.result?.securityImpact?.hasSensitiveDataRisk ||
        (i.latestEvent?.securitySignals?.length ?? 0) > 0,
    ).length;
    return {
      total: list.length,
      analyzed,
      highRisk,
      occurrences,
      securityFlags,
    };
  });

  const severityDistribution = computed(() => {
    const buckets: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      pending: 0,
    };
    for (const i of incidents.value) {
      const sev = i.analysis?.result?.severity ?? "pending";
      buckets[sev] = (buckets[sev] ?? 0) + 1;
    }
    return (["critical", "high", "medium", "low", "pending"] as const).map((s) => ({
      severity: s,
      count: buckets[s] ?? 0,
    }));
  });

  /** Occurrences bucketed by day for the last `days` days (oldest first). */
  function activitySeries(days = 14): number[] {
    const now = new Date();
    const series = new Array(days).fill(0);
    for (const i of incidents.value) {
      const seen = new Date(i.lastSeenAt).getTime();
      if (Number.isNaN(seen)) continue;
      const dayDiff = Math.floor((now.getTime() - seen) / 86_400_000);
      if (dayDiff >= 0 && dayDiff < days) {
        series[days - 1 - dayDiff] += i.occurrences ?? 1;
      }
    }
    return series;
  }

  const projects = computed(() => {
    const set = new Set(incidents.value.map((i) => i.project).filter(Boolean));
    return Array.from(set).sort();
  });

  function sortedBySeverity() {
    return [...incidents.value].sort((a, b) => {
      const r = severityRank(a.analysis?.result?.severity) -
        severityRank(b.analysis?.result?.severity);
      if (r !== 0) return r;
      return b.lastSeenAt.localeCompare(a.lastSeenAt);
    });
  }

  return {
    incidents,
    loaded,
    pending,
    error,
    refresh,
    stats,
    severityDistribution,
    activitySeries,
    projects,
    sortedBySeverity,
  };
}
