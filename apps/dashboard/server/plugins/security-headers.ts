// Applies hardening headers to every dashboard response. A Nitro plugin is used
// (instead of routeRules) so the headers also cover the API proxy routes.
export default defineNitroPlugin((nitro) => {
  const dev = import.meta.dev;

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    // SPA bundle + hydration. Vite HMR needs eval in dev only.
    dev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
    dev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  ].join("; ");

  nitro.hooks.hook("beforeResponse", (event) => {
    setResponseHeaders(event, {
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "cross-origin-opener-policy": "same-origin",
      "content-security-policy": csp,
    });
  });
});
