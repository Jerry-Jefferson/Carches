<script>
import { mapActions, mapState } from 'vuex'

import StatusTag from '@/components/common/StatusTag.vue'
import { bookingStatus, fuelUsed, tripDistance, tripDuration } from '@/utils/derive'
import { formatDateTime, formatDuration, formatKm, formatPercent, shortId } from '@/utils/format'
import { tripCar, tripClient } from './tripText'

const EMPTY = '—'

// Full booking from E20: user, car, dates, start / finish values and computed metrics
export default {
  name: 'TripDetailsDrawer',
  components: { StatusTag },
  props: {
    open: { type: Boolean, default: false },
    tripId: { type: String, default: null },
  },
  emits: ['update:open'],
  data() {
    return {
      trip: null,
      isLoading: false,
      error: '',
    }
  },
  computed: {
    ...mapState('cars', { cars: 'items' }),
    ...mapState('admin/insights', ['now']),
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
  watch: {
    open: {
      handler(isOpen) {
        if (isOpen) this.load()
      },
      immediate: true,
    },
    tripId() {
      if (this.open) this.load()
    },
  },
  methods: {
    ...mapActions('admin/trips', ['fetchTrip']),
    async load() {
      if (!this.tripId) return
      this.trip = null
      this.error = ''
      this.isLoading = true
      try {
        this.trip = await this.fetchTrip(this.tripId)
      } catch (err) {
        this.error = err.message
      } finally {
        this.isLoading = false
      }
    },
    close() {
      this.$emit('update:open', false)
    },
  },
}
</script>

<template>
  <a-drawer :open="open" :title="title" :width="440" placement="right" @close="close">
    <div v-if="isLoading" class="flex justify-center py-10">
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
        <a-button size="small" @click="load">Retry</a-button>
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
