import { describe, expect, it } from "vitest";
import {
  analyzeIncident,
  buildHeuristicAnalysis,
  type AIProvider,
  type BySentinelEvent,
} from "../src/index.js";

const event: BySentinelEvent = {
  id: "evt_1",
  timestamp: "2026-07-05T00:00:00.000Z",
  project: "payments",
  environment: "test",
  runtime: { provider: "aws", service: "lambda", language: "nodejs", version: "20.x" },
  lambda: { functionName: "checkout", remainingTimeMs: 250 },
  error: {
    type: "TypeError",
    message: "Cannot read properties of undefined",
    stack: "TypeError\n    at processPayment (/var/task/src/handler.ts:42:10)",
  },
  performance: { durationMs: 980, timeoutRisk: false },
  sanitized: true,
};

describe("analyzeIncident", () => {
  it("calls a provider and validates the model JSON", async () => {
    const provider: AIProvider = {
      name: "fake",
      isLocal: true,
      async complete() {
        return {
          model: "fake-model",
          content: JSON.stringify({
            summary: "Payment handler crashed",
            likelyCause: "Missing request body guard",
            severity: "medium",
            category: "bug",
            suggestedFix: "Validate the input body before use.",
            securityImpact: { hasSensitiveDataRisk: false },
            confidence: 0.81,
            confidenceReason: "Stack trace points to the handler.",
          }),
        };
      },
    };

    const result = await analyzeIncident({ event, provider, model: "fake-model" });
    expect(result.errors).toBeUndefined();
    expect(result.analysis?.summary).toBe("Payment handler crashed");
    expect(result.provider).toBe("fake");
  });

  it("retries once with a repair prompt when validation fails", async () => {
    let calls = 0;
    const provider: AIProvider = {
      name: "fake",
      isLocal: true,
      async complete(request) {
        calls += 1;
        if (calls === 1) return { model: request.model, content: "{\"summary\":\"missing fields\"}" };
        expect(request.userPrompt).toContain("Schema validation errors");
        return {
          model: request.model,
          content: JSON.stringify({
            summary: "Fixed JSON",
            likelyCause: "The previous answer was incomplete",
            severity: "low",
            category: "unknown",
            suggestedFix: "Return every required field.",
            securityImpact: { hasSensitiveDataRisk: false },
            confidence: 0.4,
          }),
        };
      },
    };

    const result = await analyzeIncident({ event, provider, model: "fake-model" });
    expect(calls).toBe(2);
    expect(result.analysis?.summary).toBe("Fixed JSON");
  });

  it("refuses to send unsanitized events to providers", async () => {
    let called = false;
    const provider: AIProvider = {
      name: "fake",
      isLocal: false,
      async complete() {
        called = true;
        throw new Error("should not be called");
      },
    };

    const result = await analyzeIncident({
      event: { ...event, sanitized: false },
      provider,
      model: "fake-model",
    });

    expect(called).toBe(false);
    expect(result.errors?.[0]).toMatch(/unsanitized/);
    expect(result.analysis?.confidence).toBe(0.35);
  });
});

describe("buildHeuristicAnalysis", () => {
  it("uses timeline bottleneck evidence when available", () => {
    const analysis = buildHeuristicAnalysis({
      ...event,
      timeline: {
        startedAt: "2026-07-05T00:00:00.000Z",
        totalMs: 1_000,
        steps: [],
        bottleneck: { name: "charge-card", durationMs: 820, percentOfTotal: 82 },
        aborted: false,
      },
    });

    expect(analysis.category).toBe("performance");
    expect(analysis.bottleneck?.step).toBe("charge-card");
  });
});
