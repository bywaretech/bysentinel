import { describe, it, expect } from "vitest";
import { redact, redactString } from "../src/redaction/index.js";

describe("redactString – secrets", () => {
  it("redacts bearer tokens", () => {
    expect(redactString("Authorization: Bearer abc.def.ghi123")).toContain(
      "[REDACTED_BEARER_TOKEN]",
    );
  });

  it("redacts JWTs", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    expect(redactString(jwt)).toBe("[REDACTED_JWT]");
  });

  it("redacts AWS access key ids", () => {
    expect(redactString("key=AKIAIOSFODNN7EXAMPLE")).toContain("[REDACTED_AWS_ACCESS_KEY_ID]");
  });

  it("redacts GitHub tokens", () => {
    expect(redactString(`ghp_${"a".repeat(36)}`)).toBe("[REDACTED_GITHUB_TOKEN]");
  });

  it("redacts Anthropic keys before generic openai match", () => {
    expect(redactString(`sk-ant-api03-${"x".repeat(30)}`)).toBe("[REDACTED_ANTHROPIC_KEY]");
  });

  it("redacts Stripe secret keys", () => {
    expect(redactString(`sk_live_${"a".repeat(24)}`)).toBe("[REDACTED_STRIPE_KEY]");
  });

  it("redacts private keys", () => {
    const pem =
      "-----BEGIN RSA PRIVATE KEY-----\nMIIBderp+lines/here==\n-----END RSA PRIVATE KEY-----";
    expect(redactString(pem)).toBe("[REDACTED_PRIVATE_KEY]");
  });

  it("redacts database urls", () => {
    expect(redactString("postgresql://user:pw@host:5432/db")).toBe("[REDACTED_DATABASE_URL]");
  });

  it("catches unknown high-entropy tokens via fallback", () => {
    const token = "Zx9Qw7Lp2Mn4Rt6Yv8Bc0Df3Gh5Jk7"; // 31 chars, mixed classes
    expect(redactString(`token ${token}`)).toContain("[REDACTED_HIGH_ENTROPY]");
  });

  it("does not touch ordinary prose", () => {
    const text = "The payment failed because the provider timed out.";
    expect(redactString(text)).toBe(text);
  });
});

describe("redactString – PII & payment", () => {
  it("redacts CPF", () => {
    expect(redactString("cpf 123.456.789-09 here")).toContain("[REDACTED_CPF]");
  });

  it("redacts CNPJ", () => {
    expect(redactString("11.222.333/0001-81")).toContain("[REDACTED_CNPJ]");
  });

  it("redacts a Luhn-valid card number", () => {
    expect(redactString("card 4111 1111 1111 1111")).toContain("[REDACTED_CARD]");
  });

  it("does NOT redact a non-Luhn 16-digit sequence", () => {
    // 1111222233334445 fails the Luhn checksum, so it is left intact.
    const out = redactString("id 1111222233334445");
    expect(out).toContain("1111222233334445");
  });

  it("redacts emails", () => {
    expect(redactString("contact john.doe@example.com")).toContain("[REDACTED_EMAIL]");
  });

  it("keeps emails when redactEmails is off", () => {
    expect(redactString("john@example.com", { redactEmails: false })).toBe("john@example.com");
  });
});

describe("redact – deep objects", () => {
  it("redacts by sensitive key name", () => {
    const out = redact({
      authorization: "Bearer xyz",
      cpf: "123.456.789-09",
      cardNumber: "4111111111111111",
      cvv: "123",
      password: "hunter2",
      note: "all good",
    });
    expect(out).toEqual({
      authorization: "[REDACTED_AUTHORIZATION]",
      cpf: "[REDACTED_CPF]",
      cardNumber: "[REDACTED_CARD]",
      cvv: "[REDACTED_CVV]",
      password: "[REDACTED_PASSWORD]",
      note: "all good",
    });
  });

  it("matches the spec example transformation", () => {
    const out = redact({
      authorization: "Bearer abc.def.ghi",
      cpf: "12345678900",
      cardNumber: "4111111111111111",
    });
    expect(out).toEqual({
      authorization: "[REDACTED_AUTHORIZATION]",
      cpf: "[REDACTED_CPF]",
      cardNumber: "[REDACTED_CARD]",
    });
  });

  it("preserves git/release metadata instead of high-entropy-wiping it", () => {
    const out = redact({
      git: {
        commitSha: "9f2c1ab7de34c0915b6a4f0e2d1c8b7a6e5f4d3c",
        branch: "main",
        version: "2.4.0",
        repositoryUrl: "https://github.com/byware/checkout-api",
      },
    }) as any;
    expect(out.git.repositoryUrl).toBe("https://github.com/byware/checkout-api");
    expect(out.git.commitSha).toBe("9f2c1ab7de34c0915b6a4f0e2d1c8b7a6e5f4d3c");
    expect(out.git.branch).toBe("main");
  });

  it("still redacts a real secret embedded in a metadata field", () => {
    const out = redact({
      git: { repositoryUrl: "https://x-access-token:ghp_abcd1234efgh5678ijkl@github.com/org/repo" },
    }) as any;
    expect(out.git.repositoryUrl).not.toContain("ghp_abcd1234efgh5678ijkl");
  });

  it("recurses into nested structures and arrays", () => {
    const out = redact({
      user: { profile: { email: "a@b.com" } },
      tokens: ["Bearer secret.jwt.here"],
    }) as any;
    expect(out.user.profile.email).toBe("[REDACTED_EMAIL]");
    expect(out.tokens[0]).toContain("[REDACTED_BEARER_TOKEN]");
  });

  it("handles circular references without throwing", () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    const out = redact(obj) as any;
    expect(out.self).toBe("[REDACTED_CIRCULAR]");
  });

  it("respects category toggles", () => {
    const out = redact(
      { cpf: "123.456.789-09", token: "abc" },
      { redactPII: false },
    ) as any;
    expect(out.cpf).toBe("123.456.789-09");
    expect(out.token).toBe("[REDACTED_SECRET]");
  });
});
