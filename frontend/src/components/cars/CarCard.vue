<script>
import { CalendarOutlined, DashboardOutlined, FieldTimeOutlined } from '@ant-design/icons-vue'

import CarPlaceholder from '@/components/common/CarPlaceholder.vue'
import EnergyBar from '@/components/common/EnergyBar.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { carName } from '@/utils/cars/carDisplay'
import { CAR_STATUS, carStatusMeta } from '@/utils/cars/carStatus'
import { fuelTone } from '@/utils/cars/fuelLevel'
import { EMPTY_VALUE } from '@/utils/format/locale'
import { formatKm, formatPercent } from '@/utils/format/number'
import { walkingMinutes } from '@/utils/geo/coordinates'
import { formatDistance } from '@/utils/geo/geoFormat'
import { toneClasses } from '@/assets/styles/tones'
import { ROUTES } from '@/router/routes.constants'

// One car in the fleet grid. Only free cars can be booked; the others show their status.
export default {
  name: 'CarCard',
  components: { CarPlaceholder, EnergyBar, StatusTag },
  props: {
    car: { type: Object, required: true },
    // Metres from the user, or null without location
    distance: { type: Number, default: null },
  },
  emits: ['book'],
  computed: {
    name() {
      return carName(this.car)
    },
    year() {
      return this.car.productionInfo?.year ?? null
    },
    isFree() {
      return this.car.status === CAR_STATUS.FREE
    },
    statusLabel() {
      return carStatusMeta(this.car.status).label
    },
    fuel() {
      return formatPercent(this.car.fuelLevel)
    },
    fuelClass() {
      return toneClasses(fuelTone(this.car.fuelLevel)).text
    },
    mileage() {
      return formatKm(this.car.mileage)
    },
    // Spec strip under the photo. Fuel shows a bar instead of text (`isFuel`).
    stats() {
      return [
        { label: 'Year', icon: CalendarOutlined, value: this.year ?? EMPTY_VALUE },
        { label: 'Mileage', icon: FieldTimeOutlined, value: this.mileage },
        { label: 'Fuel', icon: DashboardOutlined, isFuel: true },
      ]
    },
    distanceText() {
      if (this.distance === null) return ''
      return `≈ ${formatDistance(this.distance)} • ${walkingMinutes(this.distance)} min walk`
    },
    detailsRoute() {
      return { name: ROUTES.CAR_DETAILS.NAME, params: { id: this.car._id } }
    },
  },
}
</script>

<template>
  <article
    class="group flex h-full flex-col overflow-hidden rounded-card bg-card text-card-foreground shadow-card transition-transform duration-300 ease-soft hover:-translate-y-1"
    :aria-label="name"
  >
    <div class="flex items-center justify-between gap-2 px-4 pt-4">
      <span v-if="year" class="rounded-full bg-surface px-2.5 py-0.5 text-label-md">{{
        year
      }}</span>
      <span v-else />
      <StatusTag :status="car.status" :pulse="isFree" />
    </div>

    <div class="px-4 pt-3">
      <CarPlaceholder :car="car">
        <span
          class="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-0.5 text-label-md"
          :class="fuelClass"
        >
          <DashboardOutlined aria-hidden="true" />
          <span class="sr-only">Fuel level</span>
          {{ fuel }}
        </span>
      </CarPlaceholder>
    </div>

    <div class="flex flex-1 flex-col gap-3 p-4">
      <div>
        <p class="m-0 text-label-sm text-muted-foreground uppercase">
          {{ car.registrationNumber }}
        </p>
        <h3 class="m-0 text-headline-sm">
          <router-link
            :to="detailsRoute"
            class="text-card-foreground hover:text-link focus-visible:underline"
          >
            {{ name }}
          </router-link>
        </h3>
        <p v-if="distanceText" class="m-0 mt-1 flex items-center gap-1.5 text-body-sm">
          <AimOutlined class="text-link" aria-hidden="true" />
          <span class="text-muted-foreground">{{ distanceText }}</span>
        </p>
      </div>

      <dl class="m-0 grid grid-cols-3 gap-2 rounded-control bg-surface p-3 text-body-sm">
        <div v-for="stat in stats" :key="stat.label" class="min-w-0">
          <dt class="flex items-center gap-1 text-muted-foreground">
            <component :is="stat.icon" aria-hidden="true" /> {{ stat.label }}
          </dt>
          <dd v-if="stat.isFuel" class="m-0 pt-1">
            <EnergyBar :level="car.fuelLevel ?? 0" :show-label="false" />
          </dd>
          <dd v-else class="m-0 truncate text-label-md">{{ stat.value }}</dd>
        </div>
      </dl>

      <div class="mt-auto flex items-center justify-between gap-2 pt-1">
        <router-link :to="detailsRoute" class="text-label-lg text-link hover:underline">
          Details
          <span class="sr-only">about {{ name }}</span>
        </router-link>
        <a-button v-if="isFree" type="primary" @click="$emit('book', car)">
          Book Now
          <span class="sr-only">{{ name }}</span>
        </a-button>
        <a-button v-else disabled>{{ statusLabel }}</a-button>
      </div>
    </div>
  </article>
</template>
