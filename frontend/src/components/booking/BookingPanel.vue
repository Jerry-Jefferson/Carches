<script>
import { SafetyCertificateOutlined } from '@ant-design/icons-vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import InfoCallout from '@/components/common/InfoCallout.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { SITE } from '@/constants/site'
import { BOOKING_BLOCK } from '@/store/modules/bookings'
import { CAR_STATUS, carStatusMeta } from '@/utils/derive'
import {
  START_MODE,
  defaultStart,
  fromPickerValue,
  scheduleError,
  toPickerValue,
} from '@/utils/schedule'
import BookingSummary from './BookingSummary.vue'
import StartTimePicker from './StartTimePicker.vue'

/**
 * Booking panel of the car page (E10 + E18 + E21). Starts now (car → In trip) or at a
 * scheduled time (car → Reserved). The user's bookings must be loaded by the page.
 */
export default {
  name: 'BookingPanel',
  components: { BookingSummary, InfoCallout, StartTimePicker, StatusTag },
  props: {
    car: { type: Object, required: true },
  },
  emits: ['booked', 'refresh'],
  data() {
    return {
      mode: START_MODE.NOW,
      startValue: null,
      scheduleMessage: '',
      error: '',
      support: SITE.support,
      noteIcon: SafetyCertificateOutlined,
    }
  },
  computed: {
    ...mapState('bookings', ['isSubmitting']),
    ...mapState('bookings', { isLoadingBookings: 'isLoading' }),
    ...mapGetters('bookings', ['openBooking']),
    isScheduled() {
      return this.mode === START_MODE.SCHEDULE
    },
    startAt() {
      return this.isScheduled ? fromPickerValue(this.startValue) : null
    },
    isFree() {
      return this.car.status === CAR_STATUS.FREE
    },
    // Why the car can't be booked right now, or ''
    block() {
      if (!this.isFree) return BOOKING_BLOCK.CAR_UNAVAILABLE
      if (this.openBooking) return BOOKING_BLOCK.OPEN_BOOKING
      return ''
    },
    isUnavailable() {
      return this.block === BOOKING_BLOCK.CAR_UNAVAILABLE
    },
    hasOpenBooking() {
      return this.block === BOOKING_BLOCK.OPEN_BOOKING
    },
    unavailableText() {
      return `This car is ${carStatusMeta(this.car.status).label.toLowerCase()} right now. The page checks again every 30 seconds.`
    },
    canConfirm() {
      return !this.block && !this.isSubmitting && !this.isLoadingBookings && !this.scheduleMessage
    },
  },
  watch: {
    mode(mode) {
      this.scheduleMessage = ''
      if (mode === START_MODE.SCHEDULE && !this.startValue) {
        this.startValue = toPickerValue(defaultStart())
      }
    },
    startValue() {
      this.scheduleMessage = this.isScheduled ? scheduleError(this.startAt) : ''
    },
  },
  methods: {
    ...mapActions('bookings', ['createBooking']),
    // Used by the mobile booking bar
    focusConfirm() {
      this.$el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      this.$refs.confirm?.$el?.focus?.({ preventScroll: true })
    },
    async confirm() {
      this.error = ''
      // Checked again here: a time picked a while ago may be in the past by now
      this.scheduleMessage = this.isScheduled ? scheduleError(this.startAt) : ''
      if (this.scheduleMessage) return

      const startDate = this.startAt?.toISOString() ?? null
      try {
        const booking = await this.createBooking({ carId: this.car._id, startDate })
        this.$emit('booked', { booking, scheduled: Boolean(startDate) })
      } catch (err) {
        // An open booking shows up through the refreshed bookings; a taken car needs a reload
        if (err.code === BOOKING_BLOCK.CAR_UNAVAILABLE) this.$emit('refresh')
        else if (!err.code) this.error = err.message
      }
    },
  },
}
</script>

<template>
  <section
    id="booking-panel"
    class="flex flex-col gap-5 rounded-dialog bg-card p-5 text-card-foreground shadow-card"
    aria-labelledby="booking-panel-title"
  >
    <div class="flex items-center justify-between gap-2">
      <h2 id="booking-panel-title" class="m-0 text-label-sm text-muted-foreground uppercase">
        Book this car
      </h2>
      <StatusTag :status="car.status" :pulse="isFree" />
    </div>

    <StartTimePicker
      v-model:mode="mode"
      v-model:value="startValue"
      :error="scheduleMessage"
      :disabled="isSubmitting"
    />

    <BookingSummary :car="car" :start-at="startAt" />

    <InfoCallout :icon="noteIcon">
      To finish or cancel a trip, contact support:
      <a :href="support.phoneHref">{{ support.phone }}</a>
    </InfoCallout>

    <a-alert v-if="error" type="error" show-icon :message="error" />

    <div class="flex flex-col gap-2">
      <a-button
        ref="confirm"
        type="primary"
        size="large"
        block
        :disabled="!canConfirm"
        :loading="isSubmitting"
        aria-describedby="booking-block-reason"
        @click="confirm"
      >
        Confirm booking
        <ArrowRightOutlined aria-hidden="true" />
      </a-button>
      <p
        id="booking-block-reason"
        class="m-0 text-body-sm text-muted-foreground"
        aria-live="polite"
      >
        <template v-if="isUnavailable">{{ unavailableText }}</template>
        <template v-else-if="hasOpenBooking">
          You already have an active trip. Finish it before booking another car.
          <router-link :to="{ name: 'my-trips' }">Go to My Trips</router-link>
        </template>
      </p>
    </div>
  </section>
</template>
