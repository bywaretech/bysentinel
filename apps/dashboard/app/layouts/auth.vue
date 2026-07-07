<template>
  <div class="relative min-h-[100dvh] overflow-hidden">
    <!-- Ambient, low-intensity backdrop. No neon; single accent bloom. -->
    <div
      class="pointer-events-none absolute inset-0 -z-10 opacity-70"
      style="
        background:
          radial-gradient(60rem 40rem at 78% -10%, oklch(0.66 0.17 274 / 0.16), transparent 60%),
          radial-gradient(50rem 30rem at 10% 110%, oklch(0.66 0.17 274 / 0.08), transparent 55%);
      "
    />
    <div
      class="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
      style="
        background-image:
          linear-gradient(to right, currentColor 1px, transparent 1px),
          linear-gradient(to bottom, currentColor 1px, transparent 1px);
        background-size: 44px 44px;
      "
    />
    <slot />
  </div>
</template>
