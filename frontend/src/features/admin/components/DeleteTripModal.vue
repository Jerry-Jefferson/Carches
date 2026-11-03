<script>
import { mapActions, mapGetters } from 'vuex'

import { CAR_UPDATE_FAILED } from '@/features/admin/store/trips'
import { refId } from '@/features/admin/utils/admin'
import { BOOKING_STATUS, bookingStatus } from '@/shared/utils/derive'
import { formatDateTime, shortId } from '@/shared/utils/format'
import notify from '@/shared/utils/notify'

/**
 * Deletes a booking (E23). The backend leaves the car's status as it was (Q8), so for an
 * active or upcoming booking the car is also set to Available (E12) unless unticked. The
 * option is not offered for a completed booking, or when another open booking holds the
 * car: its status belongs to that booking then.
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
    ...mapGetters('admin/trips', ['tripsByCar']),
    isOpenTrip() {
      return this.trip ? bookingStatus(this.trip) !== BOOKING_STATUS.COMPLETED : false
    },
    canFreeCar() {
      if (!this.isOpenTrip) return false
      const others = this.tripsByCar[refId(this.trip.carId)] ?? []
      return !others.some(
        (other) => other._id !== this.trip._id && bookingStatus(other) !== BOOKING_STATUS.COMPLETED,
      )
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
        this.freeCar = this.canFreeCar
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
        await this.deleteTrip({ trip: this.trip, freeCar: this.canFreeCar && this.freeCar })
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
      <a-checkbox v-if="canFreeCar" v-model:checked="freeCar">
        Also mark the car as Available
      </a-checkbox>
      <a-alert v-if="error" type="error" show-icon :message="error" />
    </div>

    <template #footer>
      <a-button :disabled="isDeleting" @click="close">Cancel</a-button>
      <a-button danger :loading="isDeleting" @click="confirm">Delete</a-button>
    </template>
  </a-modal>
</template>
