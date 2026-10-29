<script>
import { CarOutlined } from '@ant-design/icons-vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PillGroup from '@/components/common/PillGroup.vue'
import ActiveTripCard from '@/components/trips/ActiveTripCard.vue'
import TripListItem from '@/components/trips/TripListItem.vue'
import { BOOKING_STATUS, bookingStatusMeta, bookingStatus } from '@/utils/derive'

const ALL = 'all'
const TICK_MS = 60000

/**
 * The user's bookings (E18), joined with the fleet (E9) for brand and model (Q5).
 * Read-only: users can't finish or cancel trips (Q6). Durations tick every minute.
 */
export default {
  name: 'MyTripsView',
  components: { ActiveTripCard, EmptyState, ErrorState, PillGroup, TripListItem },
  data() {
    return {
      filter: ALL,
      now: Date.now(),
      carIcon: CarOutlined,
    }
  },
  computed: {
    ...mapState('bookings', ['mine', 'isLoading', 'error']),
    ...mapState('cars', { carsLoadedAt: 'loadedAt', carsError: 'error' }),
    ...mapGetters('bookings', ['trips']),
    // Without the fleet list, a missing car can't be told apart from a removed one
    fleetLoaded() {
      return Boolean(this.carsLoadedAt) && !this.carsError
    },
    // Statuses depend on the time, so they are worked out here rather than in the store
    withStatus() {
      return this.trips.map((trip) => ({ ...trip, status: bookingStatus(trip.booking, this.now) }))
    },
    activeTrip() {
      return this.withStatus.find((trip) => trip.status === BOOKING_STATUS.ACTIVE) ?? null
    },
    showActiveCard() {
      return Boolean(this.activeTrip) && [ALL, BOOKING_STATUS.ACTIVE].includes(this.filter)
    },
    counts() {
      const counts = { [ALL]: this.withStatus.length }
      for (const status of Object.values(BOOKING_STATUS)) {
        counts[status] = this.withStatus.filter((trip) => trip.status === status).length
      }
      return counts
    },
    filterOptions() {
      return [ALL, ...Object.values(BOOKING_STATUS)].map((value) => ({
        value,
        label: value === ALL ? 'All' : bookingStatusMeta(value).label,
        count: this.counts[value],
      }))
    },
    visible() {
      if (this.filter === ALL) return this.withStatus
      return this.withStatus.filter((trip) => trip.status === this.filter)
    },
    countLabel() {
      const count = this.counts[ALL]
      return `${count} ${count === 1 ? 'trip' : 'trips'}`
    },
    isInitialLoad() {
      return this.isLoading && this.mine.length === 0
    },
    showError() {
      return Boolean(this.error) && this.mine.length === 0
    },
    filterLabel() {
      return bookingStatusMeta(this.filter).label.toLowerCase()
    },
  },
  created() {
    this.load()
  },
  mounted() {
    this.timer = setInterval(() => {
      this.now = Date.now()
    }, TICK_MS)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    ...mapActions('bookings', ['fetchMine']),
    ...mapActions('cars', ['fetchCars']),
    async load(force = false) {
      this.now = Date.now()
      // Failures land in the stores: the trips error is shown, the cars error only
      // hides car names
      await Promise.allSettled([this.fetchMine({ force }), this.fetchCars({ force })])
    },
    showAll() {
      this.filter = ALL
    },
  },
}
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-8">
    <header class="flex flex-col gap-4">
      <div>
        <p class="m-0 text-label-sm text-secondary-hover uppercase">
          {{ isInitialLoad ? 'Loading trips…' : countLabel }}
        </p>
        <h1 class="m-0 text-headline-lg">My Trips</h1>
      </div>
      <PillGroup
        v-if="!showError && mine.length > 0"
        v-model="filter"
        :options="filterOptions"
        aria-label="Trip status"
        size="sm"
      />
    </header>

    <ErrorState
      v-if="showError"
      title="Could not load your trips"
      :message="error"
      :retrying="isLoading"
      @retry="load(true)"
    />

    <div v-else-if="isInitialLoad" class="flex flex-col gap-4" aria-busy="true">
      <div v-for="index in 3" :key="index" class="rounded-card bg-card p-4 shadow-card">
        <a-skeleton active avatar :paragraph="{ rows: 1 }" />
      </div>
    </div>

    <EmptyState
      v-else-if="mine.length === 0"
      title="No trips yet"
      description="Book a car and your trips will appear here."
      action-label="Find a car"
      :icon="carIcon"
      @action="$router.push({ name: 'fleet' })"
    />

    <template v-else>
      <ActiveTripCard
        v-if="showActiveCard"
        :trip="activeTrip"
        :now="now"
        :fleet-loaded="fleetLoaded"
      />

      <EmptyState
        v-if="visible.length === 0"
        :title="`No ${filterLabel} trips`"
        action-label="Show all trips"
        @action="showAll"
      />
      <ul v-else class="m-0 flex list-none flex-col gap-3 p-0" aria-label="Trips">
        <li v-for="trip in visible" :key="trip.booking._id">
          <TripListItem :trip="trip" :now="now" :fleet-loaded="fleetLoaded" />
        </li>
      </ul>
    </template>
  </div>
</template>
