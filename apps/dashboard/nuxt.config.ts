import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  // Token-gated internal dashboard: render as a client SPA. Data comes from the
  // authenticated Nitro proxy at runtime, so there is no SSR cookie/hydration
  // dance and no server round-trip renders stale (empty) incident data.
  ssr: false,

  modules: ["@nuxt/fonts"],

  components: [
    { path: "~/components/ui", pathPrefix: false },
    { path: "~/components", pathPrefix: false },
  ],

  css: ["~/assets/css/main.css"],

  vite: {
    // PNPM can resolve Nuxt and Tailwind against different Vite type instances.
    plugins: tailwindcss() as any,
    optimizeDeps: {
      include: ["class-variance-authority", "clsx", "tailwind-merge", "lucide-vue-next", "reka-ui"],
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "en", class: "dark" },
      title: "BySentinel",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "AI-powered debugging and security layer for serverless applications.",
        },
        { name: "color-scheme", content: "dark" },
      ],
      link: [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
    },
  },

  fonts: {
    families: [
      { name: "Geist", provider: "google" },
      { name: "Geist Mono", provider: "google" },
    ],
  },

  runtimeConfig: {
    // Server-only. The collector base URL the Nitro proxy talks to.
    collectorUrl: "http://localhost:4000",
    // Optional: bootstrap an admin token from env so the dashboard can run
    // without an interactive login (useful in trusted/self-hosted setups).
    adminToken: "",
    public: {
      appName: "BySentinel",
    },
  },

  nitro: {
    // Keep the incident payloads out of any edge cache.
    routeRules: {
      "/api/**": { cache: false },
    },
  },

  typescript: {
    strict: true,
  },
});
