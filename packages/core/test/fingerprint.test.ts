import { describe, it, expect } from "vitest";
import { fingerprint, normalizeStack } from "../src/fingerprint.js";

const stackA = `TypeError: cannot read x
    at processPayment (/var/task/src/pay.js:42:15)
    at handler (/var/task/index.js:10:3)`;

const stackB = `TypeError: cannot read x
    at processPayment (/var/task/src/pay.js:99:7)
    at handler (/var/task/index.js:88:9)`;

describe("fingerprint", () => {
  it("is stable across differing line numbers and paths", () => {
    const a = fingerprint({
      project: "payments",
      environment: "production",
      error: { type: "TypeError", stack: stackA },
      functionName: "pay",
    });
    const b = fingerprint({
      project: "payments",
      environment: "production",
      error: { type: "TypeError", stack: stackB },
      functionName: "pay",
    });
    expect(a).toBe(b);
  });

  it("differs when the error type differs", () => {
    const a = fingerprint({ project: "p", environment: "prod", error: { type: "TypeError" } });
    const b = fingerprint({ project: "p", environment: "prod", error: { type: "RangeError" } });
    expect(a).not.toBe(b);
  });

  it("differs across environments", () => {
    const base = { project: "p", error: { type: "E", stack: stackA } };
    expect(fingerprint({ ...base, environment: "prod" })).not.toBe(
      fingerprint({ ...base, environment: "staging" }),
    );
  });

  it("normalizeStack strips volatile detail", () => {
    const n = normalizeStack(stackA);
    expect(n).not.toMatch(/\d+:\d+/);
    expect(n).toContain("processPayment");
  });
});
