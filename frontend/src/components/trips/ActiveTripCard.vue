<script>
import { CustomerServiceOutlined } from '@ant-design/icons-vue'

import InfoCallout from '@/components/common/InfoCallout.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { SITE } from '@/constants/site'
import { BOOKING_STATUS, tripDuration } from '@/utils/derive'
import { formatDateTime, formatDuration, formatKm, formatPercent } from '@/utils/format'
import { tripCarName, tripCarRoute } from './tripDisplay'

// The trip in progress, with a live duration. Users can't finish trips themselves (Q6).
export default {
  name: 'ActiveTripCard',
  components: { InfoCallout, StatusTag },
  props: {
    // { booking, carId, car, plate }
    trip: { type: Object, required: true },
    // Current time in ms, ticked by the page
    now: { type: Number, required: true },
    fleetLoaded: { type: Boolean, default: true },
  },
  data() {
    return {
      status: BOOKING_STATUS.ACTIVE,
      support: SITE.support,
      supportIcon: CustomerServiceOutlined,
    }
  },
  computed: {
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
          <router-link
            v-if="carRoute"
            :to="carRoute"
            class="text-card-foreground hover:text-secondary-hover"
          >
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

    <InfoCallout :icon="supportIcon" title="To finish this trip, contact support">
      Call <a :href="support.phoneHref">{{ support.phone }}</a> or write to
      <a :href="`mailto:${support.email}`">{{ support.email }}</a
      >.
    </InfoCallout>
  </section>
</template>
