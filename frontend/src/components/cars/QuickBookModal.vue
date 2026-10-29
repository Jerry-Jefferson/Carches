<script>
import { SafetyCertificateOutlined } from '@ant-design/icons-vue'
import { mapActions, mapState } from 'vuex'

import InfoCallout from '@/components/common/InfoCallout.vue'
import { SITE } from '@/constants/site'
import { BOOKING_BLOCK } from '@/store/modules/bookings'
import { CAR_STATUS, carStatusMeta } from '@/utils/derive'
import { carName, formatKm, formatPercent } from '@/utils/format'
import notify from '@/utils/notify'

/**
 * "Book now" from the fleet page (E10 + E18 + E21). On open it re-reads the car and the
 * user's bookings; confirming books the car from now, which puts it in a trip.
 */
export default {
  name: 'QuickBookModal',
  components: { InfoCallout },
  props: {
    open: { type: Boolean, default: false },
    // The car as shown in the list; replaced by a fresh copy while the modal is open
    car: { type: Object, default: null },
  },
  emits: ['update:open', 'booked'],
  data() {
    return {
      freshCar: null,
      block: null,
      isChecking: false,
      error: '',
      support: SITE.support,
      noteIcon: SafetyCertificateOutlined,
    }
  },
  computed: {
    ...mapState('bookings', ['isSubmitting']),
    shown() {
      return this.freshCar ?? this.car
    },
    name() {
      return this.shown ? carName(this.shown) : ''
    },
    rows() {
      if (!this.shown) return []
      return [
        { label: 'Start', value: 'Now' },
        { label: 'Fuel at start', value: formatPercent(this.shown.fuelLevel) },
        { label: 'Mileage at start', value: formatKm(this.shown.mileage) },
        { label: 'Status after booking', value: carStatusMeta(CAR_STATUS.IN_USE).label },
      ]
    },
    isUnavailable() {
      return this.block === BOOKING_BLOCK.CAR_UNAVAILABLE
    },
    hasOpenBooking() {
      return this.block === BOOKING_BLOCK.OPEN_BOOKING
    },
    canConfirm() {
      return Boolean(this.shown) && !this.isChecking && !this.block && !this.isSubmitting
    },
  },
  watch: {
    open: {
      handler(isOpen) {
        if (isOpen) this.check()
      },
      immediate: true,
    },
  },
  methods: {
    ...mapActions('bookings', ['checkBookable', 'createBooking']),
    reset() {
      this.freshCar = null
      this.block = null
      this.error = ''
    },
    async check() {
      if (!this.car) return
      this.reset()
      this.isChecking = true
      try {
        const { car, block } = await this.checkBookable({ carId: this.car._id })
        this.freshCar = car
        this.block = block
      } catch (err) {
        this.error = err.message
      } finally {
        this.isChecking = false
      }
    },
    async confirm() {
      this.error = ''
      try {
        const booking = await this.createBooking({ carId: this.shown._id })
        notify.success('Car booked. Your trip has started.')
        this.$emit('booked', booking)
        this.close()
      } catch (err) {
        if (err.code) this.block = err.code
        else this.error = err.message
      }
    },
    close() {
      this.$emit('update:open', false)
    },
  },
}
</script>

<template>
  <a-modal
    :open="open"
    :width="480"
    :mask-closable="!isSubmitting"
    :closable="!isSubmitting"
    destroy-on-close
    @cancel="close"
    @after-close="reset"
  >
    <template #title>
      <span class="flex items-center gap-2">
        <KeyOutlined class="text-secondary-hover" aria-hidden="true" />
        Book this car
      </span>
    </template>

    <a-spin :spinning="isChecking" tip="Checking availability…">
      <div v-if="shown" class="flex flex-col gap-4">
        <div>
          <p class="m-0 text-headline-sm">{{ name }}</p>
          <p class="m-0 text-label-sm text-muted-foreground uppercase">
            {{ shown.registrationNumber }}
          </p>
        </div>

        <dl class="m-0 flex flex-col gap-2 rounded-card bg-surface p-4 text-body-md">
          <div v-for="row in rows" :key="row.label" class="flex justify-between gap-4">
            <dt class="text-muted-foreground">{{ row.label }}</dt>
            <dd class="m-0 text-label-lg">{{ row.value }}</dd>
          </div>
        </dl>

        <a-alert
          v-if="isUnavailable"
          type="warning"
          show-icon
          message="This car is no longer available"
          description="Someone has just booked it, or it was taken out of service. Please pick another car."
        />
        <a-alert v-else-if="hasOpenBooking" type="warning" show-icon>
          <template #message>You already have an active trip</template>
          <template #description>
            Finish it before booking another car.
            <router-link :to="{ name: 'my-trips' }" @click="close">Go to My Trips</router-link>
          </template>
        </a-alert>
        <a-alert v-if="error" type="error" show-icon :message="error" />

        <InfoCallout :icon="noteIcon">
          Your trip starts immediately. To finish it, contact support:
          <a :href="support.phoneHref">{{ support.phone }}</a>
        </InfoCallout>
      </div>
    </a-spin>

    <template #footer>
      <a-button :disabled="isSubmitting" @click="close">Cancel</a-button>
      <a-button type="primary" :disabled="!canConfirm" :loading="isSubmitting" @click="confirm">
        Confirm booking
      </a-button>
    </template>
  </a-modal>
</template>
