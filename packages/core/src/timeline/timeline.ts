/**
 * Execution timeline: a lightweight sequential span recorder.
 *
 * `step(name)` closes the previous running step and opens a new one, so the
 * duration of a step is the wall-clock time until the next `step()`/`finish()`.
 * This matches the roadmap's dashboard model (per-step ms + a single bottleneck)
 * and, because each step carries an absolute timestamp, it doubles as the
 * chronological "incident timeline".
 */

export type TimelineStepStatus = "completed" | "running" | "failed";

export interface TimelineStep {
  name: string;
  /** Absolute ISO time the step started. */
  startedAt: string;
  /** Milliseconds from the timeline start to this step's start. */
  startOffsetMs: number;
  /** Filled once the step is closed. */
  durationMs?: number;
  status: TimelineStepStatus;
  meta?: Record<string, unknown>;
}

export interface TimelineBottleneck {
  name: string;
  durationMs: number;
  /** Share of the total timeline duration, 0..100. */
  percentOfTotal: number;
}

export interface ExecutionTimeline {
  startedAt: string;
  totalMs: number;
  steps: TimelineStep[];
  bottleneck?: TimelineBottleneck;
  /** True when the timeline was finalized abnormally (error/timeout). */
  aborted: boolean;
}

export interface TimelineOptions {
  /** Injectable monotonic-ish clock for tests. Defaults to `Date.now`. */
  clock?: () => number;
}

export class Timeline {
  private readonly clock: () => number;
  private readonly startMs: number;
  private readonly startedAtIso: string;
  private readonly steps: TimelineStep[] = [];
  private finalized = false;

  constructor(options: TimelineOptions = {}) {
    this.clock = options.clock ?? Date.now;
    this.startMs = this.clock();
    this.startedAtIso = new Date(this.startMs).toISOString();
  }

  /** Open a new step, closing any currently running one. */
  step(name: string, meta?: Record<string, unknown>): this {
    const at = this.clock();
    this.closeRunning(at, "completed");
    this.steps.push({
      name,
      startedAt: new Date(at).toISOString(),
      startOffsetMs: at - this.startMs,
      status: "running",
      meta,
    });
    return this;
  }

  /** Attach metadata to the currently running step. */
  annotate(meta: Record<string, unknown>): this {
    const current = this.steps.at(-1);
    if (current && current.status === "running") {
      current.meta = { ...current.meta, ...meta };
    }
    return this;
  }

  /** Mark the running step as failed (used on exception/timeout). */
  fail(meta?: Record<string, unknown>): this {
    const at = this.clock();
    if (meta) this.annotate(meta);
    this.closeRunning(at, "failed");
    return this;
  }

  /** Close the timeline and return the immutable snapshot. Idempotent. */
  finish(status: "completed" | "failed" = "completed"): ExecutionTimeline {
    const at = this.clock();
    this.closeRunning(at, status === "failed" ? "failed" : "completed");
    this.finalized = true;
    return this.snapshot(at, status === "failed");
  }

  /** Snapshot without finalizing (for capturing mid-flight, e.g. on error). */
  toJSON(aborted = false): ExecutionTimeline {
    const at = this.clock();
    return this.snapshot(at, aborted || !this.finalized);
  }

  get hasSteps(): boolean {
    return this.steps.length > 0;
  }

  private closeRunning(at: number, status: TimelineStepStatus): void {
    const current = this.steps.at(-1);
    if (current && current.status === "running") {
      current.durationMs = at - (this.startMs + current.startOffsetMs);
      current.status = status;
    }
  }

  private snapshot(at: number, aborted: boolean): ExecutionTimeline {
    const totalMs = at - this.startMs;
    const steps = this.steps.map((s) => ({ ...s }));

    let bottleneck: TimelineBottleneck | undefined;
    for (const s of steps) {
      if (s.durationMs == null) continue;
      if (!bottleneck || s.durationMs > bottleneck.durationMs) {
        bottleneck = {
          name: s.name,
          durationMs: s.durationMs,
          percentOfTotal: totalMs > 0 ? Math.round((s.durationMs / totalMs) * 1000) / 10 : 0,
        };
      }
    }

    return { startedAt: this.startedAtIso, totalMs, steps, bottleneck, aborted };
  }
}
