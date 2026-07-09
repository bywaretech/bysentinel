import { describe, it, expect } from "vitest";
import { resolveBaseOptions } from "@bywaretech/bysentinel-core/sdk";
import { extractHttpRequest } from "../src/request.js";

const opts = (overrides = {}) =>
  resolveBaseOptions({ project: "p", environment: "test", ...overrides });

describe("extractHttpRequest", () => {
  it("extracts method and strips the query string from the path", () => {
    const info = extractHttpRequest({ method: "GET", url: "/orders?page=2" }, opts());
    expect(info).toEqual({ method: "GET", path: "/orders" });
  });

  it("prefers path, then originalUrl, then url", () => {
    expect(extractHttpRequest({ path: "/a", originalUrl: "/b", url: "/c" }, opts())?.path).toBe("/a");
    expect(extractHttpRequest({ originalUrl: "/b", url: "/c" }, opts())?.path).toBe("/b");
    expect(extractHttpRequest({ url: "/c" }, opts())?.path).toBe("/c");
  });

  it("captures the query only when capture.query is on (default)", () => {
    const withQuery = extractHttpRequest(
      { method: "GET", path: "/x", query: { page: "2" } },
      opts({ capture: { query: true } }),
    );
    expect(withQuery?.query).toEqual({ page: "2" });

    const noQuery = extractHttpRequest(
      { method: "GET", path: "/x", query: { page: "2" } },
      opts({ capture: { query: false } }),
    );
    expect(noQuery?.query).toBeUndefined();
  });

  it("captures headers and body only when explicitly enabled", () => {
    const req = { method: "POST", path: "/x", headers: { authorization: "secret" }, body: { a: 1 } };

    const off = extractHttpRequest(req, opts());
    expect(off?.headers).toBeUndefined();
    expect(off?.body).toBeUndefined();

    const on = extractHttpRequest(req, opts({ capture: { headers: true, requestBody: true } }));
    expect(on?.headers).toEqual({ authorization: "secret" });
    expect(on?.body).toEqual({ a: 1 });
  });

  it("strict mode forces headers and body off even when requested", () => {
    const req = { method: "POST", path: "/x", headers: { a: "1" }, body: { b: 2 } };
    const info = extractHttpRequest(
      req,
      opts({ capture: { headers: true, requestBody: true }, security: { strictMode: true } }),
    );
    expect(info?.headers).toBeUndefined();
    expect(info?.body).toBeUndefined();
    expect(info?.method).toBe("POST");
  });

  it("returns undefined for non-HTTP-ish input", () => {
    expect(extractHttpRequest(undefined, opts())).toBeUndefined();
    expect(extractHttpRequest({}, opts())).toBeUndefined();
    expect(extractHttpRequest({ foo: "bar" } as never, opts())).toBeUndefined();
  });

  it("keeps a body-only object when body capture is enabled", () => {
    const info = extractHttpRequest({ body: { local: true } }, opts({ capture: { requestBody: true } }));
    expect(info).toEqual({ body: { local: true } });
  });
});
