<script>
import { mapState } from 'vuex'

import MapView from '@/components/common/MapView.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { carStatusCounts } from '@/utils/admin'
import { CAR_STATUS, carStatusMeta } from '@/utils/derive'
import { carName, formatPercent } from '@/utils/format'
import { toLatLng } from '@/utils/geo'
import { toneClasses } from '@/theme/tones'

// Every car of the fleet on a map, coloured by status. showCar(id) is used by the table
// and the side widgets.
export default {
  name: 'AdminFleetMap',
  components: { MapView, StatusTag },
  emits: ['edit'],
  computed: {
    ...mapState('cars', { cars: 'items' }),
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
    legend() {
      const counts = carStatusCounts(this.cars)
      return Object.values(CAR_STATUS).map((status) => {
        const meta = carStatusMeta(status)
        return {
          status,
          label: meta.label,
          count: counts[status],
          dot: toneClasses(meta.tone).solid,
        }
      })
    },
  },
  methods: {
    carOf(marker) {
      return this.carsById[marker.id]
    },
    showCar(id) {
      this.$el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      this.$refs.map?.openPopup(id)
    },
    carName,
    formatPercent,
  },
}
</script>

<template>
  <section
    class="flex flex-col gap-3 rounded-card bg-card p-4 text-card-foreground shadow-card"
    aria-labelledby="admin-fleet-map-title"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="admin-fleet-map-title" class="m-0 flex items-center gap-2 text-headline-sm">
        <EnvironmentOutlined class="text-secondary-hover" aria-hidden="true" />
        Fleet map
      </h2>
      <ul class="m-0 flex list-none flex-wrap gap-3 p-0" aria-label="Legend">
        <li
          v-for="item in legend"
          :key="item.status"
          class="flex items-center gap-1.5 text-body-sm"
        >
          <span class="size-2.5 rounded-full" :class="item.dot" aria-hidden="true" />
          {{ item.label }} {{ item.count }}
        </li>
      </ul>
    </div>

    <MapView ref="map" class="h-96" :markers="markers" aria-label="Map of the fleet">
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
          <a-button size="small" @click="$emit('edit', carOf(marker))">
            <template #icon><EditOutlined /></template>
            Edit
          </a-button>
        </div>
      </template>
    </MapView>
  </section>
</template>
