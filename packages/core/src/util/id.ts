import { randomUUID } from "node:crypto";

/** BySentinel event id, e.g. `bs_evt_<uuid-no-dashes>`. */
export function newEventId(): string {
  return `bs_evt_${randomUUID().replace(/-/g, "")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
