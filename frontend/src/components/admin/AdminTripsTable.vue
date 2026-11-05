<script>
import { CheckOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons-vue'

import StatusTag from '@/components/common/StatusTag.vue'
import { BOOKING_STATUS, bookingStatus } from '@/utils/bookings/bookingStatus'
import { distanceFuelText, durationText, tripCar, tripClient } from '@/utils/bookings/tripLabels'
import { shortId } from '@/utils/common/ids'
import { formatDateTime } from '@/utils/format/dateTime'

const PAGE_SIZES = ['5', '10', '20', '50']

// Row buttons: each emits its `event` with the booking. "Complete" only for open bookings.
const ACTIONS = Object.freeze([
  { event: 'view', title: 'View', icon: EyeOutlined },
  { event: 'complete', title: 'Complete', icon: CheckOutlined, openOnly: true },
  { event: 'edit', title: 'Edit', icon: EditOutlined },
  { event: 'delete', title: 'Delete', icon: DeleteOutlined, danger: true },
])

// Trip log of the console (E19 rows). Car names are joined from the `cars` store (Q5).
export default {
  name: 'AdminTripsTable',
  components: { StatusTag },
  props: {
    cars: { type: Array, required: true },
    trips: { type: Array, required: true },
    // Current time in ms, ticked by the console
    now: { type: Number, required: true },
    // A booking to show and mark, e.g. from ?trip=
    highlightId: { type: String, default: null },
    loading: { type: Boolean, default: false },
  },
  emits: ['view', 'complete', 'edit', 'delete'],
  data() {
    return {
      page: 1,
      pageSize: 10,
      columns: [
        { title: 'Trip', key: 'trip', width: 170 },
        { title: 'Client', key: 'client', width: 220 },
        { title: 'Vehicle', key: 'vehicle', width: 200 },
        { title: 'Duration', key: 'duration', width: 210 },
        { title: 'Distance & fuel', key: 'distance', width: 170 },
        { title: 'Status', key: 'status', width: 120 },
        { title: 'Actions', key: 'actions', width: 170, fixed: 'right' },
      ],
    }
  },
  computed: {
    carsById() {
      return Object.fromEntries(this.cars.map((car) => [car._id, car]))
    },
    rows() {
      return this.trips.map((trip) => {
        const status = bookingStatus(trip, this.now)
        const isOpen = status !== BOOKING_STATUS.COMPLETED
        return {
          key: trip._id,
          trip,
          status,
          id: shortId(trip._id),
          start: formatDateTime(trip.startDate),
          client: tripClient(trip),
          car: tripCar(trip, this.carsById),
          duration: durationText(trip, this.now),
          distance: distanceFuelText(trip),
          actions: ACTIONS.filter((action) => isOpen || !action.openOnly),
        }
      })
    },
    pagination() {
      return {
        current: this.page,
        pageSize: this.pageSize,
        pageSizeOptions: PAGE_SIZES,
        showSizeChanger: true,
        showTotal: (total) => `${total} ${total === 1 ? 'booking' : 'bookings'}`,
      }
    },
  },
  watch: {
    // Jump to the page of the highlighted booking
    highlightId: {
      handler(id) {
        this.showRow(id)
      },
      immediate: true,
    },
    trips() {
      if (this.highlightId) this.showRow(this.highlightId)
      const lastPage = Math.max(1, Math.ceil(this.trips.length / this.pageSize))
      if (this.page > lastPage) this.page = lastPage
    },
  },
  methods: {
    showRow(id) {
      const index = id ? this.trips.findIndex((trip) => trip._id === id) : -1
      if (index !== -1) this.page = Math.floor(index / this.pageSize) + 1
    },
    onChange({ current, pageSize }) {
      this.page = current
      this.pageSize = pageSize
    },
    rowClass(row) {
      return row.key === this.highlightId ? '*:bg-primary/15' : ''
    },
  },
}
</script>

<template>
  <a-table
    :columns="columns"
    :data-source="rows"
    :pagination="pagination"
    :loading="loading"
    :scroll="{ x: 1100 }"
    :row-class-name="rowClass"
    size="middle"
    @change="onChange"
  >
    <template #emptyText>
      <span class="text-body-md text-muted-foreground">No bookings match these filters</span>
    </template>

    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'trip'">
        <p class="m-0 font-mono text-label-md">{{ record.id }}</p>
        <p class="m-0 text-body-sm text-muted-foreground">{{ record.start }}</p>
      </template>

      <template v-else-if="column.key === 'client'">
        <p class="m-0 text-label-md" :class="{ 'text-muted-foreground': record.client.deleted }">
          {{ record.client.name }}
        </p>
        <p class="m-0 truncate text-body-sm text-muted-foreground">{{ record.client.email }}</p>
      </template>

      <template v-else-if="column.key === 'vehicle'">
        <p class="m-0 text-label-md" :class="{ 'text-muted-foreground': !record.car.car }">
          {{ record.car.name }}
        </p>
        <p class="m-0 text-label-sm text-muted-foreground uppercase">{{ record.car.plate }}</p>
      </template>

      <span v-else-if="column.key === 'duration'" class="text-body-sm">{{ record.duration }}</span>

      <span v-else-if="column.key === 'distance'" class="text-body-sm">{{ record.distance }}</span>

      <StatusTag v-else-if="column.key === 'status'" :status="record.status" kind="booking" />

      <div v-else-if="column.key === 'actions'" class="flex gap-1">
        <a-tooltip v-for="action in record.actions" :key="action.event" :title="action.title">
          <a-button
            type="text"
            shape="circle"
            :danger="action.danger"
            :aria-label="`${action.title} booking ${record.id}`"
            @click="$emit(action.event, record.trip)"
          >
            <template #icon><component :is="action.icon" /></template>
          </a-button>
        </a-tooltip>
      </div>
    </template>
  </a-table>
</template>
