<script>
import MapView from '@/components/common/MapView.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { CAR_STATUS, carStatusMeta } from '@/utils/derive'
import { carName, formatPercent } from '@/utils/format'
import { toLatLng } from '@/utils/geo'

const NEARBY_RADIUS_M = 1500

// Map drawer of the fleet page: the filtered cars coloured by status, plus the user
export default {
  name: 'FleetMap',
  components: { MapView, StatusTag },
  props: {
    cars: { type: Array, required: true },
    // { [carId]: metres }
    distances: { type: Object, default: () => ({}) },
    userLocation: { type: Object, default: null },
  },
  emits: ['book', 'close'],
  computed: {
    carsById() {
      return Object.fromEntries(this.cars.map((car) => [car._id, car]))
    },
    markers() {
      return this.cars.flatMap((car) => {
        const point = toLatLng(car.location)
        if (!point) return []
        return [
          {
            id: car._id,
            ...point,
            tone: carStatusMeta(car.status).tone,
            label: `${carName(car)}, ${car.registrationNumber}`,
          },
        ]
      })
    },
    caption() {
      if (!this.userLocation) {
        const count = this.markers.length
        return `${count} ${count === 1 ? 'car' : 'cars'} on the map`
      }
      const nearby = this.markers.filter(
        (marker) => (this.distances[marker.id] ?? Infinity) <= NEARBY_RADIUS_M,
      ).length
      return `${nearby} ${nearby === 1 ? 'car' : 'cars'} within 1.5 km`
    },
  },
  mounted() {
    this.$el.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  },
  methods: {
    carOf(marker) {
      return this.carsById[marker.id]
    },
    isFree(car) {
      return car.status === CAR_STATUS.FREE
    },
    carName,
    formatPercent,
  },
}
</script>

<template>
  <section
    id="fleet-map"
    class="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card"
    aria-label="Fleet map"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="m-0 flex items-center gap-2 text-label-lg">
        <EnvironmentOutlined class="text-secondary-hover" aria-hidden="true" />
        {{ caption }}
      </p>
      <a-button type="text" shape="circle" aria-label="Close map" @click="$emit('close')">
        <template #icon><CloseOutlined /></template>
      </a-button>
    </div>

    <MapView
      class="h-80 lg:h-[28rem]"
      :markers="markers"
      :user-location="userLocation"
      aria-label="Map of the fleet"
    >
      <template #popup="{ marker }">
        <div v-if="carOf(marker)" class="flex min-w-48 flex-col gap-2">
          <div>
            <p class="m-0 text-label-lg">{{ carName(carOf(marker)) }}</p>
            <p class="m-0 text-label-sm text-muted-foreground uppercase">
              {{ carOf(marker).registrationNumber }}
            </p>
          </div>
          <div class="flex items-center justify-between gap-2">
            <StatusTag :status="carOf(marker).status" />
            <span class="flex items-center gap-1 text-label-md">
              <DashboardOutlined aria-hidden="true" />
              {{ formatPercent(carOf(marker).fuelLevel) }}
            </span>
          </div>
          <div class="flex gap-2">
            <router-link
              :to="{ name: 'car-details', params: { id: marker.id } }"
              class="inline-flex flex-1 items-center justify-center rounded-control border border-border px-3 py-1 text-label-md text-foreground hover:bg-muted"
            >
              Details
            </router-link>
            <a-button
              v-if="isFree(carOf(marker))"
              type="primary"
              size="small"
              class="flex-1"
              @click="$emit('book', carOf(marker))"
            >
              Book Now
            </a-button>
          </div>
        </div>
      </template>
    </MapView>
  </section>
</template>
