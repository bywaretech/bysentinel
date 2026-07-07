<script setup lang="ts">
const props = withDefaults(
  defineProps<{ points: number[]; height?: number }>(),
  { height: 120 },
);

const W = 600;
const H = computed(() => props.height);
const PAD = 6;

const geometry = computed(() => {
  const pts = props.points.length ? props.points : [0];
  const max = Math.max(1, ...pts);
  const n = pts.length;
  const stepX = n > 1 ? (W - PAD * 2) / (n - 1) : 0;
  const y = (v: number) => H.value - PAD - (v / max) * (H.value - PAD * 2);
  const coords = pts.map((v, i) => [PAD + i * stepX, y(v)] as const);

  const line = coords
    .map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yy.toFixed(1)}`)
    .join(" ");
  const area =
    `M${PAD},${H.value - PAD} ` +
    coords.map(([x, yy]) => `L${x.toFixed(1)},${yy.toFixed(1)}`).join(" ") +
    ` L${(PAD + (n - 1) * stepX).toFixed(1)},${H.value - PAD} Z`;

  return { line, area, coords, max };
});
</script>

<template>
  <div class="w-full">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      class="h-full w-full"
      :style="{ height: H + 'px' }"
      role="img"
      aria-label="Incident activity trend"
    >
      <defs>
        <linearGradient id="bs-trend" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.28" />
          <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path :d="geometry.area" fill="url(#bs-trend)" />
      <path
        :d="geometry.line"
        fill="none"
        stroke="var(--color-primary)"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
      <circle
        v-if="geometry.coords.length"
        :cx="geometry.coords[geometry.coords.length - 1]![0]"
        :cy="geometry.coords[geometry.coords.length - 1]![1]"
        r="3"
        fill="var(--color-primary)"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </div>
</template>
