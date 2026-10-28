<script>
import { fuelTone } from '@/utils/derive'
import { formatPercent } from '@/utils/format'
import { toneClasses } from '@/theme/tones'

// Fuel level 0–100 %: red below 25 %, amber below 40 %
export default {
  name: 'EnergyBar',
  props: {
    level: { type: Number, required: true },
    showLabel: { type: Boolean, default: true },
    label: { type: String, default: 'Fuel level' },
  },
  computed: {
    value() {
      return Math.min(100, Math.max(0, Math.round(this.level)))
    },
    tone() {
      return toneClasses(fuelTone(this.value))
    },
    text() {
      return formatPercent(this.value)
    },
  },
}
</script>

<template>
  <div class="flex min-w-0 items-center gap-2">
    <div
      class="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="value"
      :aria-valuetext="text"
    >
      <div class="h-full rounded-full" :class="tone.solid" :style="{ width: `${value}%` }" />
    </div>
    <span v-if="showLabel" class="text-label-md whitespace-nowrap" :class="tone.text">
      {{ text }}
    </span>
  </div>
</template>
