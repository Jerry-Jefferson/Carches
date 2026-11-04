<script>
import { carName } from '@/utils/cars/carDisplay'

const SIZES = {
  thumb: { box: 'size-12 rounded-control', icon: 'text-2xl', initial: 'hidden' },
  card: {
    box: 'aspect-[16/10] w-full rounded-card',
    icon: 'text-6xl',
    initial: 'text-headline-lg',
  },
  hero: { box: 'aspect-[16/10] w-full rounded-dialog', icon: 'text-8xl', initial: 'text-display' },
}

// Stands in for car photos, which the backend does not have. Slot content (e.g. a fuel
// chip) sits beside the image, not inside it: children of role="img" are hidden from
// assistive technology.
export default {
  name: 'CarPlaceholder',
  props: {
    car: { type: Object, default: null },
    size: {
      type: String,
      default: 'card',
      validator: (value) => Object.keys(SIZES).includes(value),
    },
  },
  computed: {
    classes() {
      return SIZES[this.size]
    },
    brand() {
      return this.car?.productionInfo?.brand ?? ''
    },
    label() {
      return this.car ? carName(this.car) : 'Car'
    },
  },
}
</script>

<template>
  <div class="relative overflow-hidden bg-muted text-secondary" :class="classes.box">
    <div
      class="absolute inset-0 flex items-center justify-center"
      role="img"
      :aria-label="`${label} (no photo)`"
    >
      <CarOutlined :class="classes.icon" aria-hidden="true" />
      <span
        v-if="brand"
        class="absolute right-4 bottom-2 text-secondary/40 select-none"
        :class="classes.initial"
        aria-hidden="true"
      >
        {{ brand[0].toUpperCase() }}
      </span>
    </div>
    <slot />
  </div>
</template>
