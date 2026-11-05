<script>
import { CheckCircleOutlined } from '@ant-design/icons-vue'

import StatusTag from '@/components/common/StatusTag.vue'
import { ROUTES } from '@/router/routes.constants'
import { BOOKING_STATUS } from '@/utils/bookings/bookingStatus'
import { tripCarName } from '@/utils/bookings/tripLabels'
import { tripDuration } from '@/utils/bookings/tripMetrics'
import { formatDateTime, formatDuration } from '@/utils/format/dateTime'
import { formatKm, formatPercent } from '@/utils/format/number'

/**
 * The trip in progress, with a live duration. Presentational: "Finish Trip" emits `finish`;
 * the page finishes the trip and passes back `isSubmitting` and any `error`.
 */
export default {
  name: 'ActiveTripCard',
  components: { StatusTag },
  props: {
    // { booking, carId, car, plate }
    trip: { type: Object, required: true },
    // Current time in ms, ticked by the page
    now: { type: Number, required: true },
    fleetLoaded: { type: Boolean, default: true },
    isSubmitting: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  emits: ['finish'],
  data() {
    return {
      status: BOOKING_STATUS.ACTIVE,
      finishIcon: CheckCircleOutlined,
    }
  },
  computed: {
    name() {
      return tripCarName(this.trip, this.fleetLoaded)
    },
    carRoute() {
      // A removed car has no page
      return this.trip.car
        ? { name: ROUTES.CAR_DETAILS.NAME, params: { id: this.trip.carId } }
        : null
    },
    rows() {
      const { booking } = this.trip
      return [
        { label: 'Started', value: formatDateTime(booking.startDate) },
        { label: 'Duration', value: formatDuration(tripDuration(booking, this.now)) },
        { label: 'Fuel at start', value: formatPercent(booking.startFuelLevel) },
        { label: 'Mileage at start', value: formatKm(booking.startMileage) },
      ]
    },
  },
}
</script>

<template>
  <section
    class="flex flex-col gap-5 rounded-dialog bg-card p-5 text-card-foreground shadow-card md:p-6"
    aria-labelledby="active-trip-title"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="m-0 text-label-sm text-muted-foreground uppercase">Current trip</p>
        <h2 id="active-trip-title" class="m-0 text-headline-md">
          <router-link v-if="carRoute" :to="carRoute" class="text-card-foreground hover:text-link">
            {{ name }}
          </router-link>
          <template v-else>{{ name }}</template>
        </h2>
        <p class="m-0 text-label-sm text-muted-foreground uppercase">{{ trip.plate }}</p>
      </div>
      <StatusTag :status="status" kind="booking" />
    </div>

    <dl class="m-0 grid grid-cols-2 gap-4 rounded-card bg-surface p-4 md:grid-cols-4">
      <div v-for="row in rows" :key="row.label" class="min-w-0">
        <dt class="text-body-sm text-muted-foreground">{{ row.label }}</dt>
        <dd class="m-0 text-label-lg">{{ row.value }}</dd>
      </div>
    </dl>

    <a-alert v-if="error" type="error" show-icon :message="error" />

    <a-button
      id="finish-trip-btn"
      type="primary"
      size="large"
      block
      :loading="isSubmitting"
      :disabled="isSubmitting"
      @click="$emit('finish')"
    >
      <component :is="finishIcon" aria-hidden="true" />
      Finish Trip
    </a-button>
  </section>
</template>
