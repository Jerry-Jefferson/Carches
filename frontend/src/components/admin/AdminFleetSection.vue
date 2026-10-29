<script>
import { mapActions, mapGetters, mapState } from 'vuex'

import PillGroup from '@/components/common/PillGroup.vue'
import { ALL } from '@/utils/admin'
import { CAR_STATUS, carStatusMeta } from '@/utils/derive'
import AdminFleetMap from './AdminFleetMap.vue'
import AdminFleetTable from './AdminFleetTable.vue'
import LowFuelAlerts from './LowFuelAlerts.vue'
import MaintenanceActions from './MaintenanceActions.vue'
import ReservedCardsWidget from './ReservedCardsWidget.vue'
import VehicleFormModal from './VehicleFormModal.vue'
import VehicleHistoryDrawer from './VehicleHistoryDrawer.vue'

const HIGHLIGHT_MS = 3000

/**
 * "Vehicle fleet" section of the admin console: status pills, toolbar, table, map and
 * side widgets. Public: prop `focusId` (a car to find and highlight), method openCreate().
 */
export default {
  name: 'AdminFleetSection',
  components: {
    AdminFleetMap,
    AdminFleetTable,
    LowFuelAlerts,
    MaintenanceActions,
    PillGroup,
    ReservedCardsWidget,
    VehicleFormModal,
    VehicleHistoryDrawer,
  },
  props: {
    // A car id from `?car=`
    focusId: { type: String, default: null },
  },
  data() {
    return {
      isFormOpen: false,
      editedCar: null,
      isHistoryOpen: false,
      historyCar: null,
      highlightId: null,
    }
  },
  computed: {
    ...mapState('cars', { cars: 'items', isLoadingCars: 'isLoading' }),
    ...mapState('admin/fleet', ['filters']),
    ...mapGetters('admin/fleet', ['filteredCars', 'statusCounts', 'brands']),
    statusOptions() {
      const total = Object.values(this.statusCounts).reduce((sum, count) => sum + count, 0)
      return [
        { value: ALL, label: 'All', count: total },
        ...Object.values(CAR_STATUS).map((status) => ({
          value: status,
          label: carStatusMeta(status).label,
          count: this.statusCounts[status],
        })),
      ]
    },
    brandOptions() {
      return [
        { value: ALL, label: 'All brands' },
        ...this.brands.map((brand) => ({ value: brand, label: brand })),
      ]
    },
    status: {
      get() {
        return this.filters.status
      },
      set(status) {
        this.setFilters({ status })
      },
    },
    shownLabel() {
      return `Showing ${this.filteredCars.length} of ${this.cars.length} cars`
    },
  },
  watch: {
    focusId: {
      handler(id) {
        if (id) this.focus(id)
      },
      immediate: true,
    },
    // The car may arrive after the focus request (first load)
    cars() {
      if (this.focusId && this.highlightId !== this.focusId) this.focus(this.focusId)
    },
  },
  beforeUnmount() {
    clearTimeout(this.highlightTimer)
  },
  methods: {
    ...mapActions('admin/fleet', ['setFilters', 'resetFilters']),
    openCreate() {
      this.editedCar = null
      this.isFormOpen = true
    },
    openEdit(car) {
      this.editedCar = car
      this.isFormOpen = true
    },
    openHistory(car) {
      this.historyCar = car
      this.isHistoryOpen = true
    },
    viewTrip(tripId) {
      this.isHistoryOpen = false
      this.$router.push({
        name: 'admin',
        query: { ...this.$route.query, tab: 'trips', trip: tripId },
      })
    },
    showOnMap(car) {
      this.$refs.map?.showCar(car._id)
    },
    // Narrows the table to the car (by VIN) so it is on the first page, then highlights it
    async focus(id) {
      const car = this.cars.find((item) => item._id === id)
      if (!car) return
      await this.resetFilters()
      await this.setFilters({ q: car.vin })
      this.highlightId = id
      await this.$nextTick()
      this.$el.querySelector?.(`[data-row-key="${id}"]`)?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'center',
      })
      clearTimeout(this.highlightTimer)
      this.highlightTimer = setTimeout(() => {
        this.highlightId = null
      }, HIGHLIGHT_MS)
    },
    onQuery(q) {
      this.setFilters({ q })
    },
  },
}
</script>

<template>
  <section class="flex flex-col gap-6" aria-labelledby="admin-fleet-title">
    <h2 id="admin-fleet-title" class="sr-only">Vehicle fleet</h2>

    <div class="flex flex-col gap-4 rounded-card bg-card p-4 text-card-foreground shadow-card">
      <PillGroup v-model="status" :options="statusOptions" aria-label="Fleet status" size="sm" />

      <div class="flex flex-wrap items-end gap-3">
        <a-input
          :value="filters.q"
          allow-clear
          placeholder="Search brand, model, plate or VIN"
          aria-label="Search cars"
          class="w-full sm:w-72"
          @update:value="onQuery"
        >
          <template #prefix><SearchOutlined class="text-muted-foreground" /></template>
        </a-input>
        <a-select
          :value="filters.brand"
          :options="brandOptions"
          aria-label="Brand"
          class="w-40"
          @update:value="setFilters({ brand: $event })"
        />
        <a-input-number
          :value="filters.yearFrom"
          :min="1886"
          :precision="0"
          placeholder="Year from"
          aria-label="Year from"
          class="w-28"
          @update:value="setFilters({ yearFrom: $event })"
        />
        <a-input-number
          :value="filters.yearTo"
          :min="1886"
          :precision="0"
          placeholder="Year to"
          aria-label="Year to"
          class="w-28"
          @update:value="setFilters({ yearTo: $event })"
        />
        <a-button @click="resetFilters">Reset</a-button>
        <span class="ml-auto text-body-sm text-muted-foreground" aria-live="polite">
          {{ shownLabel }}
        </span>
      </div>

      <AdminFleetTable
        :cars="filteredCars"
        :highlight-id="highlightId"
        :loading="isLoadingCars && !cars.length"
        @edit="openEdit"
        @history="openHistory"
        @show-on-map="showOnMap"
      />
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div class="xl:col-span-2">
        <AdminFleetMap ref="map" @edit="openEdit" />
      </div>
      <div class="flex flex-col gap-6">
        <LowFuelAlerts @show-on-map="showOnMap" />
        <ReservedCardsWidget @show-on-map="showOnMap" />
        <MaintenanceActions />
      </div>
    </div>

    <VehicleFormModal v-model:open="isFormOpen" :car="editedCar" />
    <VehicleHistoryDrawer v-model:open="isHistoryOpen" :car="historyCar" @view-trip="viewTrip" />
  </section>
</template>
