/**
 * Deduplication marker so an error captured manually (via `captureException`)
 * is not captured a second time by the `withBySentinel` wrapper when it
 * re-propagates. One failure → one incident.
 */
const CAPTURED = Symbol.for("bysentinel.captured");

export function markCaptured(error: unknown): void {
  if (error && typeof error === "object") {
    try {
      Object.defineProperty(error, CAPTURED, {
        value: true,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    } catch {
      /* frozen/sealed error — best effort, ignore */
    }
  }
}

export function isCaptured(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as Record<symbol, unknown>)[CAPTURED]);
}
