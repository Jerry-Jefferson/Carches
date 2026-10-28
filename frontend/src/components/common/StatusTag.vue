<script>
import { bookingStatusMeta, carStatusMeta } from '@/utils/derive'
import { toneClasses } from '@/theme/tones'

// Car or booking status as text + colour + icon (never colour alone)
export default {
  name: 'StatusTag',
  props: {
    status: { type: String, required: true },
    kind: {
      type: String,
      default: 'car',
      validator: (value) => ['car', 'booking'].includes(value),
    },
    // Pulsing dot instead of the icon, e.g. for an available car
    pulse: { type: Boolean, default: false },
  },
  computed: {
    meta() {
      return this.kind === 'booking' ? bookingStatusMeta(this.status) : carStatusMeta(this.status)
    },
    tone() {
      return toneClasses(this.meta.tone)
    },
  },
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-md whitespace-nowrap"
    :class="tone.soft"
  >
    <span v-if="pulse" class="relative flex size-2" aria-hidden="true">
      <span
        class="absolute inline-flex size-full animate-status-pulse rounded-full"
        :class="tone.solid"
      />
      <span class="relative inline-flex size-2 rounded-full" :class="tone.solid" />
    </span>
    <component :is="meta.icon" v-else aria-hidden="true" />
    {{ meta.label }}
  </span>
</template>
