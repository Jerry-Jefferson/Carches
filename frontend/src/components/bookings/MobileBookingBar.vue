<script>
import StatusTag from '@/components/common/StatusTag.vue'
import { CAR_STATUS } from '@/utils/derive'
import { carName } from '@/utils/format'

// Fixed bottom bar below `lg`, so "Book" stays in reach while scrolling the car page
export default {
  name: 'MobileBookingBar',
  components: { StatusTag },
  props: {
    car: { type: Object, required: true },
  },
  emits: ['book'],
  computed: {
    name() {
      return carName(this.car)
    },
    isFree() {
      return this.car.status === CAR_STATUS.FREE
    },
  },
}
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-card-foreground shadow-popover lg:hidden"
  >
    <div class="min-w-0">
      <p class="m-0 truncate text-label-lg">{{ name }}</p>
      <StatusTag :status="car.status" :pulse="isFree" />
    </div>
    <a-button type="primary" size="large" aria-controls="booking-panel" @click="$emit('book')">
      Book
    </a-button>
  </div>
</template>
