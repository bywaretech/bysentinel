import { deliver, type BySentinelEvent, type ResolvedBaseOptions } from "./deps.js";

/**
 * Deliver an event honoring `delivery.mode`. Unlike Lambda (which must await so
 * the send is not frozen), a long-running Node process can fire-and-forget:
 * - "background" (default): return immediately; delivery runs in the background.
 * - "blocking": await delivery before resolving.
 * Delivery always swallows its own errors and is bounded by `timeoutMs`.
 */
export async function dispatch(
  options: ResolvedBaseOptions,
  event: BySentinelEvent,
): Promise<void> {
  if (options.delivery.mode === "blocking") {
    await deliver(options, event);
  } else {
    void deliver(options, event);
  }
}
