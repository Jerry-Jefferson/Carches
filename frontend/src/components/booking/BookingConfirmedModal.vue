<script>
import StatusTag from '@/components/common/StatusTag.vue'
import { CAR_STATUS } from '@/utils/derive'
import { carName, formatDateTime } from '@/utils/format'

// Shown after a booking from the car page: what was booked and where to go next
export default {
  name: 'BookingConfirmedModal',
  components: { StatusTag },
  props: {
    open: { type: Boolean, default: false },
    car: { type: Object, default: null },
    booking: { type: Object, default: null },
    // Scheduled for later (car reserved) rather than started now (car in trip)
    scheduled: { type: Boolean, default: false },
  },
  // `closed` fires once the modal has gone, for the page to move focus somewhere useful
  emits: ['update:open', 'closed'],
  data() {
    return {
      // The dialog has no Ant Design title, so it is named by the heading inside
      wrapProps: { 'aria-labelledby': 'booking-confirmed-title' },
    }
  },
  computed: {
    name() {
      return this.car ? carName(this.car) : ''
    },
    startTime() {
      return formatDateTime(this.booking?.startDate)
    },
    status() {
      return this.scheduled ? CAR_STATUS.RESERVED : CAR_STATUS.IN_USE
    },
    message() {
      return this.scheduled
        ? 'The car is reserved for you until your start time.'
        : 'Your trip has started. Have a good drive!'
    },
  },
  methods: {
    close() {
      this.$emit('update:open', false)
    },
    go(name) {
      this.close()
      this.$router.push({ name })
    },
  },
}
</script>

<template>
  <a-modal
    :open="open"
    :width="440"
    :footer="null"
    :wrap-props="wrapProps"
    centered
    @cancel="close"
    @after-close="$emit('closed')"
  >
    <div class="flex flex-col items-center gap-4 pt-2 text-center">
      <span
        class="flex size-14 items-center justify-center rounded-full bg-success/15 text-3xl text-success"
        aria-hidden="true"
      >
        <CheckCircleOutlined />
      </span>
      <div>
        <h2 id="booking-confirmed-title" class="m-0 text-headline-md">Booking confirmed</h2>
        <p class="m-0 mt-1 text-body-md text-muted-foreground">{{ message }}</p>
      </div>

      <dl class="m-0 flex w-full flex-col gap-2 rounded-card bg-surface p-4 text-left text-body-md">
        <div class="flex justify-between gap-4">
          <dt class="text-muted-foreground">Car</dt>
          <dd class="m-0 text-label-lg">{{ name }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted-foreground">Plate</dt>
          <dd class="m-0 text-label-lg">{{ car?.registrationNumber }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted-foreground">Start time</dt>
          <dd class="m-0 text-label-lg">{{ startTime }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-muted-foreground">Status</dt>
          <dd class="m-0"><StatusTag :status="status" /></dd>
        </div>
      </dl>

      <div class="flex w-full flex-col gap-2 sm:flex-row-reverse">
        <a-button type="primary" size="large" class="flex-1" @click="go('my-trips')">
          Go to My Trips
        </a-button>
        <a-button size="large" class="flex-1" @click="go('fleet')">Back to fleet</a-button>
      </div>
    </div>
  </a-modal>
</template>
