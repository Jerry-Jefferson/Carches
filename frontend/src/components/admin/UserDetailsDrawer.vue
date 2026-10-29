<script>
import { mapActions, mapGetters, mapState } from 'vuex'

import InitialsAvatar from '@/components/common/InitialsAvatar.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { ROLE, fullName, refId } from '@/utils/admin'
import { bookingStatus } from '@/utils/derive'
import { carName, formatDate, formatDateTime, shortId } from '@/utils/format'

// One user (E6) with their trips (from E19)
export default {
  name: 'UserDetailsDrawer',
  components: { InitialsAvatar, StatusTag },
  props: {
    open: { type: Boolean, default: false },
    userId: { type: String, default: null },
  },
  emits: ['update:open', 'edit'],
  data() {
    return {
      isLoading: false,
      error: '',
    }
  },
  computed: {
    ...mapState('admin/insights', ['now']),
    ...mapGetters('admin/users', ['byId']),
    ...mapGetters('admin/trips', ['tripsByUser']),
    ...mapGetters('cars', { carById: 'byId' }),
    user() {
      return this.userId ? this.byId(this.userId) : null
    },
    name() {
      return fullName(this.user)
    },
    isAdmin() {
      return this.user?.role === ROLE.ADMIN
    },
    trips() {
      return (this.tripsByUser[this.userId] ?? []).map((trip) => {
        const car = this.carById(refId(trip.carId))
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
  watch: {
    open: {
      handler(isOpen) {
        if (isOpen && this.userId) this.load()
      },
      immediate: true,
    },
    userId(id) {
      if (this.open && id) this.load()
    },
  },
  methods: {
    ...mapActions('admin/users', ['fetchUser']),
    formatDate,
    async load() {
      this.isLoading = true
      this.error = ''
      try {
        await this.fetchUser(this.userId)
      } catch (err) {
        this.error = err.message
      } finally {
        this.isLoading = false
      }
    },
    close() {
      this.$emit('update:open', false)
    },
    openTrip(id) {
      this.$router.push({
        name: 'admin',
        query: { ...this.$route.query, tab: 'trips', trip: id, user: undefined },
      })
    },
  },
}
</script>

<template>
  <a-drawer :open="open" title="User details" :width="520" @close="close">
    <a-spin :spinning="isLoading">
      <a-alert v-if="error" type="error" show-icon :message="error" class="mb-4">
        <template #action>
          <a-button size="small" @click="load">Retry</a-button>
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
          <a-descriptions-item label="Registered">{{
            formatDate(user.createdAt)
          }}</a-descriptions-item>
          <a-descriptions-item label="Updated">{{
            formatDate(user.updatedAt)
          }}</a-descriptions-item>
        </a-descriptions>

        <section aria-labelledby="user-trips-title">
          <h3 id="user-trips-title" class="m-0 mb-2 text-label-lg">Trips ({{ trips.length }})</h3>
          <p v-if="trips.length === 0" class="m-0 text-body-md text-muted-foreground">
            No trips yet.
          </p>
          <ul v-else class="m-0 flex list-none flex-col gap-2 p-0" aria-label="User trips">
            <li
              v-for="trip in trips"
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
                <a-button type="link" size="small" @click="openTrip(trip.id)">
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
