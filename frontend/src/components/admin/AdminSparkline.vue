<script>
const WIDTH = 120
const HEIGHT = 32
const PAD = 2

// Small SVG line chart, e.g. trips started per day; the values are also read out
export default {
  name: 'AdminSparkline',
  props: {
    // [{ label, value }], oldest first
    points: { type: Array, required: true },
    label: { type: String, required: true },
  },
  data() {
    return { width: WIDTH, height: HEIGHT }
  },
  computed: {
    coords() {
      const values = this.points.map((point) => point.value)
      const max = Math.max(1, ...values)
      const step = values.length > 1 ? (WIDTH - PAD * 2) / (values.length - 1) : 0
      return values.map((value, i) => [
        PAD + i * step,
        HEIGHT - PAD - (value / max) * (HEIGHT - PAD * 2),
      ])
    },
    line() {
      return this.coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    },
    area() {
      if (this.coords.length === 0) return ''
      const first = this.coords[0][0]
      const last = this.coords.at(-1)[0]
      return `${first},${HEIGHT} ${this.line} ${last},${HEIGHT}`
    },
    description() {
      const values = this.points.map((point) => `${point.label}: ${point.value}`).join(', ')
      return `${this.label}. ${values}`
    },
  },
}
</script>

<template>
  <svg
    class="h-8 w-full text-info"
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="none"
    role="img"
    :aria-label="description"
  >
    <polygon :points="area" fill="currentColor" fill-opacity="0.12" />
    <polyline
      :points="line"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linejoin="round"
      stroke-linecap="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
