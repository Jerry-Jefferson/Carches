<script>
import { mapActions } from 'vuex'

import { CAR_UPDATE_FAILED } from '@/store/modules/admin/trips'
import { BOOKING_STATUS, bookingStatus } from '@/utils/derive'
import { formatDateTime, shortId } from '@/utils/format'
import notify from '@/utils/notify'

/**
 * Deletes a booking (E23). The backend leaves the car's status as it was (Q8), so for an
 * active or upcoming booking the car is also set to Available (E12) unless unticked.
 */
export default {
  name: 'DeleteTripModal',
  props: {
    open: { type: Boolean, default: false },
    trip: { type: Object, default: null },
  },
  emits: ['update:open', 'done'],
  data() {
    return {
      freeCar: false,
      isDeleting: false,
      error: '',
    }
  },
  computed: {
    isOpenTrip() {
      return this.trip ? bookingStatus(this.trip) !== BOOKING_STATUS.COMPLETED : false
    },
    description() {
      if (!this.trip) return ''
      return `Booking ${shortId(this.trip._id)}, started ${formatDateTime(this.trip.startDate)}. This cannot be undone.`
    },
  },
  watch: {
    open: {
      handler(isOpen) {
        if (!isOpen) return
        this.freeCar = this.isOpenTrip
        this.error = ''
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions('admin/trips', ['deleteTrip']),
    close() {
      this.$emit('update:open', false)
    },
    async confirm() {
      this.error = ''
      this.isDeleting = true
      try {
        await this.deleteTrip({ trip: this.trip, freeCar: this.freeCar })
        notify.success('Booking deleted')
        this.$emit('done')
        this.close()
      } catch (err) {
        if (err.code === CAR_UPDATE_FAILED) {
          notify.notice({
            type: 'warning',
            title: 'Booking deleted, but the car is still marked as busy',
            description: `${err.message} Set the car to Available from the fleet table.`,
          })
          this.$emit('done')
          this.close()
        } else {
          this.error = err.message
        }
      } finally {
        this.isDeleting = false
      }
    },
  },
}
</script>

<template>
  <a-modal
    :open="open"
    title="Delete this booking?"
    :width="440"
    :mask-closable="!isDeleting"
    @cancel="close"
  >
    <div class="flex flex-col gap-4">
      <p class="m-0 text-body-md text-muted-foreground">{{ description }}</p>
      <a-checkbox v-model:checked="freeCar">Also mark the car as Available</a-checkbox>
      <a-alert v-if="error" type="error" show-icon :message="error" />
    </div>

    <template #footer>
      <a-button :disabled="isDeleting" @click="close">Cancel</a-button>
      <a-button type="primary" danger :loading="isDeleting" @click="confirm">Delete</a-button>
    </template>
  </a-modal>
</template>
