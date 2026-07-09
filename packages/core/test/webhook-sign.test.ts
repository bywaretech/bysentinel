import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { signWebhookPayload, buildWebhookSignatureHeaders } from "../src/webhooks/sign.js";

describe("signWebhookPayload", () => {
  it("computes HMAC-SHA256 over `${timestamp}.${body}`", () => {
    const expected = createHmac("sha256", "secret").update("123.{\"a\":1}").digest("hex");
    expect(signWebhookPayload("secret", "123", '{"a":1}')).toBe(expected);
  });

  it("is deterministic for the same inputs and changes with the secret", () => {
    const a = signWebhookPayload("s1", "100", "body");
    const b = signWebhookPayload("s1", "100", "body");
    const c = signWebhookPayload("s2", "100", "body");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("buildWebhookSignatureHeaders", () => {
  it("returns timestamp, sha256-prefixed signature and a unique idempotency key", () => {
    const body = '{"hello":"world"}';
    const headers = buildWebhookSignatureHeaders("whsec", body, 1_700_000_000_000);

    expect(headers["x-bysentinel-timestamp"]).toBe("1700000000");
    const expectedSig = signWebhookPayload("whsec", "1700000000", body);
    expect(headers["x-bysentinel-signature"]).toBe(`sha256=${expectedSig}`);
    expect(headers["x-bysentinel-idempotency-key"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );

    // A second call gets a fresh idempotency key.
    const again = buildWebhookSignatureHeaders("whsec", body, 1_700_000_000_000);
    expect(again["x-bysentinel-idempotency-key"]).not.toBe(headers["x-bysentinel-idempotency-key"]);
  });
});
