import { describe, it, expect } from "vitest";
import { Timeline } from "../src/timeline/timeline.js";

/** Deterministic fake clock: each read advances by the queued deltas. */
function fakeClock(startAt: number, deltas: number[]): () => number {
  let t = startAt;
  let i = 0;
  return () => {
    const now = t;
    if (i < deltas.length) t += deltas[i++]!;
    return now;
  };
}

describe("Timeline", () => {
  it("computes per-step durations and picks the bottleneck", () => {
    // reads: start(0) step1@0, step2@+12, step3@+84, finish@+6
    const clock = fakeClock(1_000, [0, 12, 84, 6, 0]);
    const tl = new Timeline({ clock });
    tl.step("Validate Request"); // starts at 1000
    tl.step("Create Payment"); // closes Validate (12ms), starts at 1012
    tl.step("Save Database"); // closes Create (84ms), starts at 1096
    const snap = tl.finish(); // closes Save (6ms) at 1102

    const byName = Object.fromEntries(snap.steps.map((s) => [s.name, s.durationMs]));
    expect(byName["Validate Request"]).toBe(12);
    expect(byName["Create Payment"]).toBe(84);
    expect(byName["Save Database"]).toBe(6);
    expect(snap.totalMs).toBe(102);
    expect(snap.bottleneck?.name).toBe("Create Payment");
    expect(snap.bottleneck?.percentOfTotal).toBeCloseTo(82.4, 1);
  });

  it("records absolute timestamps (chronological incident timeline)", () => {
    const tl = new Timeline();
    tl.step("Lambda started");
    tl.step("Request validated");
    const snap = tl.finish();
    expect(snap.steps[0]!.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(snap.steps[1]!.startedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(snap.steps[0]!.startedAt).getTime(),
    );
  });

  it("marks the last running step as failed on abort", () => {
    const clock = fakeClock(0, [0, 10, 5]);
    const tl = new Timeline({ clock });
    tl.step("Notify ERP");
    tl.fail({ reason: "timeout" });
    const snap = tl.toJSON(true);
    expect(snap.aborted).toBe(true);
    expect(snap.steps[0]!.status).toBe("failed");
    expect(snap.steps[0]!.meta).toEqual({ reason: "timeout" });
  });

  it("toJSON before finish reports aborted=true", () => {
    const tl = new Timeline();
    tl.step("running");
    expect(tl.toJSON().aborted).toBe(true);
  });

  it("annotate attaches metadata to the current step", () => {
    const tl = new Timeline();
    tl.step("Notify ERP").annotate({ url: "https://erp.example.com" });
    const snap = tl.finish();
    expect(snap.steps[0]!.meta).toEqual({ url: "https://erp.example.com" });
  });
});
