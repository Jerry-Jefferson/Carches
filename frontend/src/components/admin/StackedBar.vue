<script>
import { toneClasses } from '@/theme/tones'

// Horizontal bar split by share, e.g. cars by status. Segments: [{ key, label, value, tone }]
export default {
  name: 'StackedBar',
  props: {
    segments: { type: Array, required: true },
    label: { type: String, required: true },
  },
  computed: {
    total() {
      return this.segments.reduce((sum, segment) => sum + segment.value, 0)
    },
    parts() {
      return this.segments
        .filter((segment) => segment.value > 0)
        .map((segment) => ({
          ...segment,
          width: `${(segment.value / this.total) * 100}%`,
          className: toneClasses(segment.tone).solid,
        }))
    },
    description() {
      const parts = this.segments.map((segment) => `${segment.label} ${segment.value}`).join(', ')
      return `${this.label}: ${parts}`
    },
  },
}
</script>

<template>
  <div
    class="flex h-2 w-full overflow-hidden rounded-full bg-muted"
    role="img"
    :aria-label="description"
  >
    <span
      v-for="part in parts"
      :key="part.key"
      :class="part.className"
      :style="{ width: part.width }"
    />
  </div>
</template>
