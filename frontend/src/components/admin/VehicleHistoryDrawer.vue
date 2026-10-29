<script>
import { mapGetters } from 'vuex'

import StatusTag from '@/components/common/StatusTag.vue'
import { fullName } from '@/utils/admin'
import { bookingStatus, tripDistance } from '@/utils/derive'
import { carName, formatDateTime, formatKm, formatPercent, shortId } from '@/utils/format'

// A car's bookings (E19, filtered on the client), newest first
export default {
  name: 'VehicleHistoryDrawer',
  components: { StatusTag },
  props: {
    open: { type: Boolean, default: false },
    car: { type: Object, default: null },
  },
  emits: ['update:open', 'view-trip'],
  computed: {
    ...mapGetters('admin/trips', ['tripsByCar']),
    title() {
      return this.car ? `History of ${carName(this.car)}` : 'History'
    },
    trips() {
      return this.car ? (this.tripsByCar[this.car._id] ?? []) : []
    },
    summary() {
      if (!this.car) return []
      return [
        { label: 'Plate', value: this.car.registrationNumber },
        { label: 'VIN', value: this.car.vin },
        { label: 'Mileage', value: formatKm(this.car.mileage) },
        { label: 'Fuel', value: formatPercent(this.car.fuelLevel) },
      ]
    },
  },
  methods: {
    statusOf(trip) {
      return bookingStatus(trip)
    },
    userOf(trip) {
      const user = typeof trip.userId === 'object' ? trip.userId : null
      return user ? fullName(user) : 'Deleted user'
    },
    period(trip) {
      const end = trip.endDate ? formatDateTime(trip.endDate) : 'in progress'
      return `${formatDateTime(trip.startDate)} → ${end}`
    },
    distance(trip) {
      const km = tripDistance(trip)
      return km === null ? '' : formatKm(km)
    },
    shortId,
  },
}
</script>

<template>
  <a-drawer
    :open="open"
    :title="title"
    :width="480"
    placement="right"
    @close="$emit('update:open', false)"
  >
    <template v-if="car">
      <div class="mb-6 flex items-center justify-between gap-2">
        <StatusTag :status="car.status" />
        <span class="text-body-sm text-muted-foreground">
          {{ trips.length }} {{ trips.length === 1 ? 'booking' : 'bookings' }}
        </span>
      </div>
      <dl class="m-0 mb-6 grid grid-cols-2 gap-3 rounded-card bg-surface p-4">
        <div v-for="row in summary" :key="row.label" class="min-w-0">
          <dt class="text-body-sm text-muted-foreground">{{ row.label }}</dt>
          <dd class="m-0 truncate text-label-md">{{ row.value }}</dd>
        </div>
      </dl>

      <p v-if="trips.length === 0" class="m-0 text-body-md text-muted-foreground">
        This car has not been booked yet.
      </p>
      <ul v-else class="m-0 flex list-none flex-col gap-3 p-0" aria-label="Bookings of this car">
        <li
          v-for="trip in trips"
          :key="trip._id"
          class="flex flex-col gap-2 rounded-card border border-border p-3"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-label-md">{{ shortId(trip._id) }} · {{ userOf(trip) }}</span>
            <StatusTag :status="statusOf(trip)" kind="booking" />
          </div>
          <p class="m-0 text-body-sm text-muted-foreground">{{ period(trip) }}</p>
          <div class="flex items-center justify-between gap-2">
            <span class="text-body-sm">{{ distance(trip) }}</span>
            <a-button size="small" @click="$emit('view-trip', trip._id)">Details</a-button>
          </div>
        </li>
      </ul>
    </template>
  </a-drawer>
</template>
