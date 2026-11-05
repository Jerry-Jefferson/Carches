<script>
import StatusTag from '@/components/common/StatusTag.vue'
import { bookingStatus } from '@/utils/bookings/bookingStatus'
import { tripCar, tripClient } from '@/utils/bookings/tripLabels'
import { fuelUsed, tripDistance, tripDuration } from '@/utils/bookings/tripMetrics'
import { shortId } from '@/utils/common/ids'
import { formatDateTime, formatDuration } from '@/utils/format/dateTime'
import { formatKm, formatPercent } from '@/utils/format/number'

const EMPTY = '—'

/**
 * Full booking: user, car, dates, start / finish values and computed metrics.
 * Presentational — the parent loads the booking (E20) and passes it in.
 * - trip / loading / error: the loaded booking and the state of its request
 * - emits `retry` when the user asks to load it again
 */
export default {
  name: 'TripDetailsDrawer',
  components: { StatusTag },
  props: {
    open: { type: Boolean, default: false },
    tripId: { type: String, default: null },
    trip: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    cars: { type: Array, required: true },
    now: { type: Number, required: true },
  },
  emits: ['update:open', 'retry'],
  computed: {
    carsById() {
      return Object.fromEntries(this.cars.map((car) => [car._id, car]))
    },
    title() {
      return this.tripId ? `Booking ${shortId(this.tripId)}` : 'Booking'
    },
    status() {
      return this.trip ? bookingStatus(this.trip, this.now) : null
    },
    client() {
      return tripClient(this.trip)
    },
    car() {
      return tripCar(this.trip, this.carsById)
    },
    sections() {
      const trip = this.trip
      const distance = tripDistance(trip)
      const fuel = fuelUsed(trip)
      return [
        {
          title: 'Client',
          rows: [
            { label: 'Name', value: this.client.name },
            { label: 'E-mail', value: this.client.email || EMPTY },
            { label: 'Licence number', value: this.client.licenseNumber || EMPTY },
          ],
        },
        {
          title: 'Car',
          rows: [
            { label: 'Car', value: this.car.name },
            { label: 'Plate', value: this.car.plate || EMPTY },
            { label: 'VIN', value: this.car.vin || EMPTY },
          ],
        },
        {
          title: 'Trip',
          rows: [
            { label: 'Start', value: formatDateTime(trip.startDate) },
            { label: 'End', value: trip.endDate ? formatDateTime(trip.endDate) : EMPTY },
            { label: 'Duration', value: formatDuration(tripDuration(trip, this.now)) },
            { label: 'Fuel at start', value: formatPercent(trip.startFuelLevel) },
            { label: 'Fuel at finish', value: formatPercent(trip.finishFuelLevel) },
            { label: 'Fuel used', value: fuel === null ? EMPTY : formatPercent(fuel) },
            { label: 'Mileage at start', value: formatKm(trip.startMileage) },
            { label: 'Mileage at finish', value: formatKm(trip.finishMileage) },
            { label: 'Distance', value: distance === null ? EMPTY : formatKm(distance) },
          ],
        },
      ]
    },
  },
  methods: {
    close() {
      this.$emit('update:open', false)
    },
  },
}
</script>

<template>
  <a-drawer :open="open" :title="title" :width="440" placement="right" @close="close">
    <div v-if="loading" class="flex justify-center py-10">
      <a-spin tip="Loading booking…" />
    </div>

    <a-alert
      v-else-if="error"
      type="error"
      show-icon
      message="Could not load the booking"
      :description="error"
    >
      <template #action>
        <a-button size="small" @click="$emit('retry')">Retry</a-button>
      </template>
    </a-alert>

    <div v-else-if="trip" class="flex flex-col gap-6">
      <StatusTag :status="status" kind="booking" class="self-start" />
      <section v-for="section in sections" :key="section.title" class="flex flex-col gap-2">
        <h3 class="m-0 text-label-sm text-muted-foreground uppercase">{{ section.title }}</h3>
        <dl class="m-0 flex flex-col gap-2 rounded-card bg-surface p-4 text-body-md">
          <div v-for="row in section.rows" :key="row.label" class="flex justify-between gap-4">
            <dt class="text-muted-foreground">{{ row.label }}</dt>
            <dd class="m-0 text-right text-label-md break-all">{{ row.value }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </a-drawer>
</template>
