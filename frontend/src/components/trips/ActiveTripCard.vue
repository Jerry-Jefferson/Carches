<script>
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import { mapActions, mapState } from 'vuex'

import StatusTag from '@/components/common/StatusTag.vue'
import { BOOKING_STATUS, tripDuration } from '@/utils/derive'
import { formatDateTime, formatDuration, formatKm, formatPercent } from '@/utils/format'
import notify from '@/utils/notify'
import { tripCarName, tripCarRoute } from './tripDisplay'

// The trip in progress, with a live duration. Users can finish trips themselves.
export default {
  name: 'ActiveTripCard',
  components: { StatusTag },
  props: {
    // { booking, carId, car, plate }
    trip: { type: Object, required: true },
    // Current time in ms, ticked by the page
    now: { type: Number, required: true },
    fleetLoaded: { type: Boolean, default: true },
  },
  emits: ['finished'],
  data() {
    return {
      status: BOOKING_STATUS.ACTIVE,
      finishIcon: CheckCircleOutlined,
      error: '',
    }
  },
  computed: {
    ...mapState('bookings', ['isSubmitting']),
    name() {
      return tripCarName(this.trip, this.fleetLoaded)
    },
    carRoute() {
      return tripCarRoute(this.trip)
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
  methods: {
    ...mapActions('bookings', ['finishTrip']),
    async handleFinish() {
      this.error = ''
      try {
        await this.finishTrip({ bookingId: this.trip.booking._id })
        notify.success('Trip finished!')
        this.$emit('finished')
      } catch (err) {
        this.error = err?.response?.data?.message || err.message || 'Could not finish the trip'
      }
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
      @click="handleFinish"
    >
      <component :is="finishIcon" aria-hidden="true" />
      Finish Trip
    </a-button>
  </section>
</template>
