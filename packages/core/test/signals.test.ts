import { describe, it, expect } from "vitest";
import { detectSecuritySignals } from "../src/security/signals.js";

describe("detectSecuritySignals", () => {
  it("flags SQL error leakage", () => {
    const s = detectSecuritySignals({
      error: { type: "Error", message: "error: syntax error at or near \"SELECT\"" },
    });
    expect(s.map((x) => x.type)).toContain("sql-error-leakage");
  });

  it("flags path traversal in body", () => {
    const s = detectSecuritySignals({ request: { body: { file: "../../etc/passwd" } } });
    expect(s.map((x) => x.type)).toContain("path-traversal");
  });

  it("flags command injection", () => {
    const s = detectSecuritySignals({ request: { query: { q: "x; cat /etc/shadow" } } });
    expect(s.map((x) => x.type)).toContain("command-injection");
  });

  it("flags SSRF-like metadata URL", () => {
    const s = detectSecuritySignals({
      request: { body: { url: "http://169.254.169.254/latest/meta-data/" } },
    });
    expect(s.map((x) => x.type)).toContain("ssrf-like-url");
  });

  it("flags a scanning user-agent", () => {
    const s = detectSecuritySignals({
      request: { headers: { "user-agent": "sqlmap/1.7" } },
    });
    expect(s.map((x) => x.type)).toContain("suspicious-user-agent");
  });

  it("flags a secret present in the request body", () => {
    const s = detectSecuritySignals({
      request: { body: { config: "postgresql://u:p@h:5432/db" } },
    });
    expect(s.map((x) => x.type)).toContain("sensitive-data-in-body");
  });

  it("returns nothing for a clean request", () => {
    const s = detectSecuritySignals({
      request: { method: "GET", path: "/health", body: { ok: true } },
    });
    expect(s).toHaveLength(0);
  });
});
