<script>
import { defineAsyncComponent } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import CarGrid from '@/components/cars/CarGrid.vue'
import FleetFilters from '@/components/cars/FleetFilters.vue'
import FleetHeader from '@/components/cars/FleetHeader.vue'
import QuickBookModal from '@/components/cars/QuickBookModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import { SORTS, filtersFromQuery, filtersToQuery } from '@/utils/fleetFilters'

/**
 * Fleet catalogue (E9; booking via E10 + E18 + E21).
 * The route query is the source of truth for the filters (`q`, `brand`, `available`,
 * `status`, `fuel`, `sort`) and the map drawer (`map=1`); the `cars` store mirrors it.
 */
export default {
  name: 'FleetView',
  components: {
    CarGrid,
    EmptyState,
    ErrorState,
    FleetFilters,
    FleetHeader,
    // Leaflet and the map code load only when the map is first opened. Not named
    // `FleetMap`: unplugin-vue-components would resolve that to a static import.
    LazyFleetMap: defineAsyncComponent(() => import('@/components/cars/FleetMap.vue')),
    QuickBookModal,
  },
  data() {
    return {
      bookingCar: null,
      isBookOpen: false,
    }
  },
  computed: {
    ...mapState('cars', ['items', 'isLoading', 'error', 'filters']),
    ...mapState('geo', { geoStatus: 'status', userLocation: 'coords' }),
    ...mapGetters('cars', [
      'visible',
      'sorted',
      'hasMore',
      'sort',
      'distances',
      'brandCounts',
      'statusCounts',
      'freeCount',
      'nearestFree',
    ]),
    ...mapGetters('geo', ['hasLocation']),
    isMapOpen() {
      return this.$route.query.map === '1'
    },
    isInitialLoad() {
      return this.isLoading && this.items.length === 0
    },
    showError() {
      return Boolean(this.error) && this.items.length === 0
    },
    isEmpty() {
      return !this.isLoading && !this.error && this.sorted.length === 0
    },
  },
  watch: {
    '$route.query': {
      handler(query) {
        // Leaving the page also changes the query; keep the filters for the way back
        if (this.$route.name !== 'fleet') return
        this.setFilters(filtersFromQuery(query))
      },
      immediate: true,
    },
  },
  created() {
    this.load()
    this.initGeo()
  },
  methods: {
    ...mapActions('cars', ['fetchCars', 'setFilters', 'showMore']),
    ...mapActions('geo', { initGeo: 'init', locate: 'locate' }),
    async load(force = false) {
      try {
        await this.fetchCars({ force })
      } catch {
        // the message is in cars.error and shown by ErrorState
      }
    },
    replaceQuery(filters, { map = this.isMapOpen } = {}) {
      const query = filtersToQuery(filters)
      if (map) query.map = '1'
      this.$router.replace({ name: 'fleet', query })
    },
    updateFilters(partial) {
      this.replaceQuery({ ...this.filters, ...partial })
    },
    resetFilters() {
      this.replaceQuery({})
    },
    toggleMap(open = !this.isMapOpen) {
      this.replaceQuery(this.filters, { map: open })
    },
    async useLocation() {
      await this.locate()
      // Switch to the closest cars first, unless the user picked another order
      if (this.hasLocation && !this.filters.sort) this.updateFilters({ sort: SORTS.DISTANCE })
    },
    openBooking(car) {
      this.bookingCar = car
      this.isBookOpen = true
    },
  },
}
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-8">
    <FleetHeader
      :free-count="freeCount"
      :nearest="nearestFree"
      :geo-status="geoStatus"
      :is-map-open="isMapOpen"
      :is-loading="isInitialLoad"
      @locate="useLocation"
      @toggle-map="toggleMap()"
    />

    <FleetFilters
      :filters="filters"
      :brand-counts="brandCounts"
      :status-counts="statusCounts"
      :sort="sort"
      :distance-enabled="hasLocation"
      :disabled="isInitialLoad"
      @change="updateFilters"
      @reset="resetFilters"
    />

    <LazyFleetMap
      v-if="isMapOpen"
      :cars="sorted"
      :distances="distances"
      :user-location="userLocation"
      @book="openBooking"
      @close="toggleMap(false)"
    />

    <ErrorState
      v-if="showError"
      title="Could not load the fleet"
      :message="error"
      :retrying="isLoading"
      @retry="load(true)"
    />
    <EmptyState
      v-else-if="isEmpty"
      title="No cars match your filters"
      description="Try another brand or turn off 'Available only'."
      action-label="Reset filters"
      @action="resetFilters"
    />
    <CarGrid
      v-else
      :cars="visible"
      :distances="distances"
      :is-loading="isLoading"
      :has-more="hasMore"
      :total="sorted.length"
      @book="openBooking"
      @show-more="showMore"
    />

    <a-button
      v-if="!isMapOpen && !isEmpty && !showError"
      type="primary"
      shape="round"
      size="large"
      class="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 shadow-popover lg:hidden"
      @click="toggleMap(true)"
    >
      <template #icon><CompassOutlined /></template>
      Show on map
    </a-button>

    <QuickBookModal v-model:open="isBookOpen" :car="bookingCar" />
  </div>
</template>
