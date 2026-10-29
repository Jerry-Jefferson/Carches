<script>
import CarPlaceholder from '@/components/common/CarPlaceholder.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { BOOKING_STATUS, bookingStatus, fuelUsed, tripDistance, tripDuration } from '@/utils/derive'
import { formatDateTime, formatDuration, formatKm, formatPercent } from '@/utils/format'
import { tripCarName, tripCarRoute } from './tripDisplay'

const EMPTY = '—'

// One booking in the My Trips list
export default {
  name: 'TripListItem',
  components: { CarPlaceholder, StatusTag },
  props: {
    // { booking, carId, car, plate }
    trip: { type: Object, required: true },
    now: { type: Number, required: true },
    fleetLoaded: { type: Boolean, default: true },
  },
  computed: {
    booking() {
      return this.trip.booking
    },
    status() {
      return bookingStatus(this.booking, this.now)
    },
    name() {
      return tripCarName(this.trip, this.fleetLoaded)
    },
    carRoute() {
      return tripCarRoute(this.trip)
    },
    period() {
      const start = formatDateTime(this.booking.startDate)
      if (this.status === BOOKING_STATUS.UPCOMING) return `Starts ${start}`
      if (this.status === BOOKING_STATUS.ACTIVE) return `${start} → In progress`
      return `${start} → ${formatDateTime(this.booking.endDate)}`
    },
    stats() {
      const isUpcoming = this.status === BOOKING_STATUS.UPCOMING
      const distance = tripDistance(this.booking)
      const fuel = fuelUsed(this.booking)
      return [
        {
          label: 'Duration',
          value: isUpcoming ? EMPTY : formatDuration(tripDuration(this.booking, this.now)),
        },
        { label: 'Distance', value: distance === null ? EMPTY : formatKm(distance) },
        { label: 'Fuel used', value: fuel === null ? EMPTY : formatPercent(fuel) },
      ]
    },
  },
}
</script>

<template>
  <article
    class="flex flex-col gap-4 rounded-card bg-card p-4 text-card-foreground shadow-card md:flex-row md:items-center"
    :aria-label="`${name}, ${trip.plate}`"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <CarPlaceholder :car="trip.car" size="thumb" />
      <div class="min-w-0">
        <p class="m-0 truncate text-label-lg">
          <router-link
            v-if="carRoute"
            :to="carRoute"
            class="text-card-foreground hover:text-secondary-hover"
          >
            {{ name }}
          </router-link>
          <span v-else :class="{ 'text-muted-foreground': !trip.car }">{{ name }}</span>
        </p>
        <p class="m-0 text-label-sm text-muted-foreground uppercase">{{ trip.plate }}</p>
        <p class="m-0 mt-1 text-body-sm text-muted-foreground">{{ period }}</p>
      </div>
    </div>

    <dl class="m-0 grid grid-cols-3 gap-4 text-body-sm md:w-80">
      <div v-for="stat in stats" :key="stat.label" class="min-w-0">
        <dt class="text-muted-foreground">{{ stat.label }}</dt>
        <dd class="m-0 truncate text-label-md">{{ stat.value }}</dd>
      </div>
    </dl>

    <div class="flex items-center justify-between gap-3 md:w-44 md:justify-end">
      <StatusTag :status="status" kind="booking" />
      <router-link
        v-if="carRoute"
        :to="carRoute"
        class="text-label-md whitespace-nowrap text-secondary-hover hover:underline"
      >
        View car
        <span class="sr-only">{{ name }}</span>
      </router-link>
    </div>
  </article>
</template>
