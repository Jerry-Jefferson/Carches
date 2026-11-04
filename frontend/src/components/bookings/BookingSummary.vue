<script>
import { CAR_STATUS, carStatusMeta } from '@/utils/derive'
import { formatDateTime, formatKm, formatPercent } from '@/utils/format'

// What the booking will record: start values from the car and the resulting status
export default {
  name: 'BookingSummary',
  props: {
    car: { type: Object, required: true },
    // null means "now"
    startAt: { type: Date, default: null },
  },
  computed: {
    rows() {
      const scheduled = Boolean(this.startAt)
      return [
        { label: 'Fuel at start', value: formatPercent(this.car.fuelLevel) },
        { label: 'Mileage at start', value: formatKm(this.car.mileage) },
        { label: 'Start time', value: scheduled ? formatDateTime(this.startAt) : 'Now' },
        {
          label: 'After booking',
          value: carStatusMeta(scheduled ? CAR_STATUS.RESERVED : CAR_STATUS.IN_USE).label,
        },
      ]
    },
    note() {
      return this.startAt
        ? 'The car will be reserved for you until your start time.'
        : 'Your trip starts immediately.'
    },
  },
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-card bg-surface p-4">
    <dl class="m-0 flex flex-col gap-2 text-body-md">
      <div v-for="row in rows" :key="row.label" class="flex justify-between gap-4">
        <dt class="text-muted-foreground">{{ row.label }}</dt>
        <dd class="m-0 text-right text-label-lg">{{ row.value }}</dd>
      </div>
    </dl>
    <p class="m-0 border-t border-border pt-2 text-body-sm text-muted-foreground">{{ note }}</p>
  </div>
</template>
