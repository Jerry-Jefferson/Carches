<script>
import { mapActions, mapState } from 'vuex'

import ErrorState from '@/components/common/ErrorState.vue'
import PillGroup from '@/components/common/PillGroup.vue'
import { ALL, filterTrips } from '@/utils/admin'
import { BOOKING_STATUS, bookingStatus, bookingStatusMeta } from '@/utils/derive'
import { formatDate } from '@/utils/format'
import AdminTripsTable from './AdminTripsTable.vue'
import BookingFormModal from './BookingFormModal.vue'
import CompleteTripModal from './CompleteTripModal.vue'
import DeleteTripModal from './DeleteTripModal.vue'
import TripDetailsDrawer from './TripDetailsDrawer.vue'

/**
 * Trips & bookings section of the console (E19–E23). Filters live in `admin/trips`;
 * the date comes from the console header (`admin/insights`).
 * - focusId: a booking to open and highlight (from `?trip=`)
 * - openCreate(): opens the "New booking" form (used by the console header)
 */
export default {
  name: 'AdminTripsSection',
  components: {
    AdminTripsTable,
    BookingFormModal,
    CompleteTripModal,
    DeleteTripModal,
    ErrorState,
    PillGroup,
    TripDetailsDrawer,
  },
  props: {
    focusId: { type: String, default: null },
  },
  data() {
    return {
      detailsId: null,
      isDetailsOpen: false,
      formTrip: null,
      isFormOpen: false,
      tripToComplete: null,
      isCompleteOpen: false,
      tripToDelete: null,
      isDeleteOpen: false,
    }
  },
  computed: {
    ...mapState('admin/trips', ['items', 'filters', 'isLoading', 'error']),
    ...mapState('admin/insights', ['now', 'date']),
    ...mapState('cars', { cars: 'items' }),
    carsById() {
      return Object.fromEntries(this.cars.map((car) => [car._id, car]))
    },
    filterOptions() {
      return { carsById: this.carsById, day: this.date, now: this.now }
    },
    filtered() {
      return filterTrips(this.items, this.filters, this.filterOptions)
    },
    // Pill counts respect the search and the date, not the status itself
    statusOptions() {
      const base = filterTrips(this.items, { ...this.filters, status: ALL }, this.filterOptions)
      const counts = { [ALL]: base.length }
      for (const status of Object.values(BOOKING_STATUS)) counts[status] = 0
      for (const trip of base) counts[bookingStatus(trip, this.now)] += 1
      return [ALL, ...Object.values(BOOKING_STATUS)].map((value) => ({
        value,
        label: value === ALL ? 'All' : bookingStatusMeta(value).label,
        count: counts[value],
      }))
    },
    activeCount() {
      return this.items.filter((trip) => bookingStatus(trip, this.now) === BOOKING_STATUS.ACTIVE)
        .length
    },
    activeLabel() {
      return `${this.activeCount} active ${this.activeCount === 1 ? 'trip' : 'trips'} right now`
    },
    dateLabel() {
      return formatDate(`${this.date}T12:00:00+03:00`)
    },
    showError() {
      return Boolean(this.error) && this.items.length === 0
    },
    highlightId() {
      return this.focusId ?? (this.isDetailsOpen ? this.detailsId : null)
    },
  },
  watch: {
    focusId: {
      handler(id) {
        if (id) this.view({ _id: id })
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions('admin/trips', ['setFilters', 'fetchTrips']),
    async reload() {
      try {
        await this.fetchTrips()
      } catch {
        // shown by ErrorState
      }
    },
    openCreate() {
      this.formTrip = null
      this.isFormOpen = true
    },
    view(trip) {
      this.detailsId = trip._id
      this.isDetailsOpen = true
    },
    onDetailsOpen(isOpen) {
      this.isDetailsOpen = isOpen
      if (!isOpen && this.$route?.query.trip) {
        this.$router.replace({ query: { ...this.$route.query, trip: undefined } })
      }
    },
    edit(trip) {
      this.formTrip = trip
      this.isFormOpen = true
    },
    complete(trip) {
      this.tripToComplete = trip
      this.isCompleteOpen = true
    },
    remove(trip) {
      this.tripToDelete = trip
      this.isDeleteOpen = true
    },
  },
}
</script>

<template>
  <section class="flex flex-col gap-4" aria-labelledby="admin-trips-title">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="admin-trips-title" class="m-0 text-headline-sm">Trips & bookings</h2>
        <p class="m-0 flex items-center gap-2 text-body-sm text-muted-foreground">
          <span class="size-2 rounded-full bg-info" aria-hidden="true" />
          {{ activeLabel }}
        </p>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><PlusCircleOutlined /></template>
        New booking
      </a-button>
    </div>

    <div class="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card">
      <div class="flex flex-wrap items-center gap-3">
        <PillGroup
          :model-value="filters.status"
          :options="statusOptions"
          aria-label="Booking status"
          size="sm"
          @update:model-value="setFilters({ status: $event })"
        />
        <div class="ml-auto flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 text-body-sm">
            <a-switch
              :checked="filters.dateOnly"
              size="small"
              @update:checked="setFilters({ dateOnly: $event })"
            />
            {{ dateLabel }} only
          </label>
          <a-input-search
            :value="filters.q"
            allow-clear
            placeholder="Search client, car or plate"
            aria-label="Search bookings"
            class="w-64"
            @update:value="setFilters({ q: $event })"
          />
        </div>
      </div>

      <ErrorState
        v-if="showError"
        title="Could not load the bookings"
        :message="error"
        :retrying="isLoading"
        @retry="reload"
      />
      <AdminTripsTable
        v-else
        :trips="filtered"
        :now="now"
        :highlight-id="highlightId"
        :loading="isLoading && items.length === 0"
        @view="view"
        @complete="complete"
        @edit="edit"
        @delete="remove"
      />
    </div>

    <TripDetailsDrawer :open="isDetailsOpen" :trip-id="detailsId" @update:open="onDetailsOpen" />
    <BookingFormModal v-model:open="isFormOpen" :trip="formTrip" />
    <CompleteTripModal v-model:open="isCompleteOpen" :trip="tripToComplete" />
    <DeleteTripModal v-model:open="isDeleteOpen" :trip="tripToDelete" />
  </section>
</template>
