<script>
import InitialsAvatar from '@/components/common/InitialsAvatar.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { bookingStatus } from '@/utils/bookings/bookingStatus'
import { carName } from '@/utils/cars/carDisplay'
import { refId } from '@/utils/common/collections'
import { shortId } from '@/utils/common/ids'
import { formatDate, formatDateTime } from '@/utils/format/dateTime'
import { ROLE, fullName } from '@/utils/users/userDisplay'

/**
 * One user with their trips. Presentational: the parent loads the user (E6) and picks
 * their bookings (E19); the drawer only formats them.
 * - loading / error: the state of the user request; `retry` asks for it again
 * - emits `view-trip` with a booking ID and `edit` with the user
 */
export default {
  name: 'UserDetailsDrawer',
  components: { InitialsAvatar, StatusTag },
  props: {
    open: { type: Boolean, default: false },
    user: { type: Object, default: null },
    trips: { type: Array, default: () => [] },
    cars: { type: Array, required: true },
    now: { type: Number, required: true },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  emits: ['update:open', 'edit', 'retry', 'view-trip'],
  computed: {
    carsById() {
      return Object.fromEntries(this.cars.map((car) => [car._id, car]))
    },
    name() {
      return fullName(this.user)
    },
    isAdmin() {
      return this.user?.role === ROLE.ADMIN
    },
    tripRows() {
      return this.trips.map((trip) => {
        const car = this.carsById[refId(trip.carId)]
        const populated = typeof trip.carId === 'object' ? trip.carId : null
        return {
          id: trip._id,
          shortId: shortId(trip._id),
          car: car ? carName(car) : 'Car no longer in fleet',
          plate: car?.registrationNumber ?? populated?.registrationNumber ?? '',
          start: formatDateTime(trip.startDate),
          status: bookingStatus(trip, this.now),
        }
      })
    },
  },
  methods: {
    formatDate,
    close() {
      this.$emit('update:open', false)
    },
  },
}
</script>

<template>
  <a-drawer :open="open" title="User details" :width="520" @close="close">
    <a-spin :spinning="loading">
      <a-alert v-if="error" type="error" show-icon :message="error" class="mb-4">
        <template #action>
          <a-button size="small" @click="$emit('retry')">Retry</a-button>
        </template>
      </a-alert>

      <div v-if="user" class="flex flex-col gap-6">
        <div class="flex items-center gap-3">
          <InitialsAvatar :user="user" :size="56" />
          <div class="min-w-0">
            <p class="m-0 truncate text-headline-sm">{{ name }}</p>
            <p class="m-0 text-label-sm text-muted-foreground">{{ user._id }}</p>
          </div>
        </div>

        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="E-mail">{{ user.email }}</a-descriptions-item>
          <a-descriptions-item label="Licence number">{{ user.licenseNumber }}</a-descriptions-item>
          <a-descriptions-item label="Role">{{ isAdmin ? 'Admin' : 'User' }}</a-descriptions-item>
          <a-descriptions-item label="Signed up">{{
            formatDate(user.createdAt)
          }}</a-descriptions-item>
          <a-descriptions-item label="Updated">{{
            formatDate(user.updatedAt)
          }}</a-descriptions-item>
        </a-descriptions>

        <section aria-labelledby="user-trips-title">
          <h3 id="user-trips-title" class="m-0 mb-2 text-label-lg">
            Trips ({{ tripRows.length }})
          </h3>
          <p v-if="tripRows.length === 0" class="m-0 text-body-md text-muted-foreground">
            No trips yet.
          </p>
          <ul v-else class="m-0 flex list-none flex-col gap-2 p-0" aria-label="User trips">
            <li
              v-for="trip in tripRows"
              :key="trip.id"
              class="flex items-center justify-between gap-3 rounded-card bg-surface p-3"
            >
              <div class="min-w-0">
                <p class="m-0 truncate text-label-lg">{{ trip.car }}</p>
                <p class="m-0 text-body-sm text-muted-foreground">
                  {{ trip.shortId }} · {{ trip.plate }} · {{ trip.start }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <StatusTag :status="trip.status" kind="booking" />
                <a-button type="link" size="small" @click="$emit('view-trip', trip.id)">
                  Details
                  <span class="sr-only">of trip {{ trip.shortId }}</span>
                </a-button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </a-spin>

    <template #footer>
      <div class="flex justify-end gap-2">
        <a-button @click="close">Close</a-button>
        <a-button type="primary" :disabled="!user" @click="$emit('edit', user)">
          <template #icon><EditOutlined /></template>
          Edit
        </a-button>
      </div>
    </template>
  </a-drawer>
</template>
