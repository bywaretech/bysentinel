import { describe, it, expect } from "vitest";
import { validateAnalysis } from "../src/analysis/validate.js";

const valid = {
  summary: "Null deref in payment handler",
  likelyCause: "event.body is undefined",
  severity: "high",
  category: "bug",
  affectedArea: { file: "src/pay.js", functionName: "processPayment", line: 42 },
  suggestedFix: "Guard against missing body",
  examplePatch: "if (!event.body) return badRequest();",
  securityImpact: { hasSensitiveDataRisk: false },
  confidence: 0.82,
};

describe("validateAnalysis", () => {
  it("accepts a well-formed object", () => {
    const r = validateAnalysis(valid);
    expect(r.ok).toBe(true);
  });

  it("parses JSON strings", () => {
    const r = validateAnalysis(JSON.stringify(valid));
    expect(r.ok).toBe(true);
  });

  it("tolerates ```json fenced output", () => {
    const r = validateAnalysis("```json\n" + JSON.stringify(valid) + "\n```");
    expect(r.ok).toBe(true);
  });

  it("extracts the outer object from surrounding prose", () => {
    const r = validateAnalysis(`Here is the result: ${JSON.stringify(valid)} thanks!`);
    expect(r.ok).toBe(true);
  });

  it("accepts JSON whose examplePatch contains its own fenced code block", () => {
    // Regression: models often return a ```javascript block inside examplePatch.
    // The parser must not mistake that inner fence for the whole response.
    const withPatch = {
      ...valid,
      examplePatch:
        "Wrap the call with a retry:\n\n```javascript\nconst charge = async () => {\n  return await gateway();\n};\n```\nAlso raise the timeout.",
    };
    const r = validateAnalysis(JSON.stringify(withPatch, null, 2));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.examplePatch).toContain("```javascript");
  });

  it("still unwraps a fully fenced response that also contains an inner fence", () => {
    const withPatch = {
      ...valid,
      examplePatch: "```javascript\nconst x = 1;\n```",
    };
    const r = validateAnalysis("```json\n" + JSON.stringify(withPatch) + "\n```");
    expect(r.ok).toBe(true);
  });

  it("rejects invalid severity", () => {
    const r = validateAnalysis({ ...valid, severity: "catastrophic" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/severity/);
  });

  it("rejects out-of-range confidence", () => {
    const r = validateAnalysis({ ...valid, confidence: 2 });
    expect(r.ok).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { summary, ...rest } = valid;
    const r = validateAnalysis(rest);
    expect(r.ok).toBe(false);
  });

  it("rejects non-JSON", () => {
    const r = validateAnalysis("not json at all");
    expect(r.ok).toBe(false);
  });
});
