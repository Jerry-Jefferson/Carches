<script>
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, Form as VeeForm } from 'vee-validate'
import { mapActions, mapState } from 'vuex'

import MapView from '@/components/common/MapView.vue'
import { CAR_UPDATE_FAILED } from '@/store/modules/admin/trips'
import { refId } from '@/utils/admin'
import { formatCoords, formatDateTime } from '@/utils/format'
import { toGeoJsonPoint, toLatLng } from '@/utils/geo'
import notify from '@/utils/notify'
import {
  SCHEDULE_STEP_MINUTES,
  SCHEDULE_VALUE_FORMAT,
  fromPickerValue,
  toPickerValue,
} from '@/utils/schedule'
import { completeTripSchema } from './bookingSchema'
import { tripCar } from './tripText'

/**
 * Completes an active or upcoming trip in two steps (Q7): E22 ends the booking (the
 * backend frees the car), then E12 writes the finish fuel, mileage and location to the car.
 */
export default {
  name: 'CompleteTripModal',
  components: { MapView, VeeField, VeeForm },
  props: {
    open: { type: Boolean, default: false },
    trip: { type: Object, default: null },
  },
  emits: ['update:open', 'done'],
  data() {
    return {
      formError: '',
      // { message, vin, changes } after the booking was saved but the car update failed
      carError: null,
      isSubmitting: false,
      isRetrying: false,
      moveCar: false,
      location: null,
      valueFormat: SCHEDULE_VALUE_FORMAT,
      showTime: { format: 'HH:mm', minuteStep: SCHEDULE_STEP_MINUTES },
    }
  },
  computed: {
    ...mapState('cars', { cars: 'items' }),
    car() {
      return this.cars.find((car) => car._id === refId(this.trip?.carId)) ?? null
    },
    carInfo() {
      return this.trip ? tripCar(this.trip, this.car ? { [this.car._id]: this.car } : {}) : null
    },
    schema() {
      return toTypedSchema(completeTripSchema(this.trip))
    },
    initialValues() {
      return {
        endDate: toPickerValue(new Date()),
        finishFuelLevel: this.car?.fuelLevel ?? this.trip?.startFuelLevel ?? null,
        finishMileage: this.car?.mileage ?? this.trip?.startMileage ?? null,
      }
    },
    startText() {
      return formatDateTime(this.trip?.startDate)
    },
    markers() {
      const point = this.location ?? toLatLng(this.car?.location)
      return point ? [{ id: 'car', ...point, tone: 'info', label: 'New car location' }] : []
    },
    locationText() {
      return this.location ? formatCoords([this.location.lng, this.location.lat]) : ''
    },
    formKey() {
      return `${this.trip?._id}-${this.open}`
    },
  },
  methods: {
    ...mapActions('admin/trips', ['completeTrip', 'retryCarUpdate']),
    reset() {
      this.formError = ''
      this.carError = null
      this.moveCar = false
      this.location = null
    },
    close() {
      this.$emit('update:open', false)
    },
    onPick(point) {
      this.location = point
    },
    // A trip that started at 15:53:40 and ends "now" at 15:53 (minute precision) ends at its start
    endDateOf(value) {
      const end = fromPickerValue(value).getTime()
      const start = new Date(this.trip.startDate).getTime()
      return new Date(Math.max(end, start)).toISOString()
    },
    async onSubmit(values) {
      this.formError = ''
      this.isSubmitting = true
      try {
        await this.completeTrip({
          trip: this.trip,
          endDate: this.endDateOf(values.endDate),
          finishFuelLevel: values.finishFuelLevel,
          finishMileage: values.finishMileage,
          location: this.moveCar && this.location ? toGeoJsonPoint(this.location) : null,
        })
        notify.success('Trip completed')
        this.$emit('done')
        this.close()
      } catch (err) {
        if (err.code === CAR_UPDATE_FAILED) {
          this.carError = { message: err.message, vin: err.vin, changes: err.changes }
          this.$emit('done')
        } else {
          this.formError = err.message
        }
      } finally {
        this.isSubmitting = false
      }
    },
    async retry() {
      this.isRetrying = true
      try {
        await this.retryCarUpdate({ vin: this.carError.vin, changes: this.carError.changes })
        notify.success('Car updated')
        this.carError = null
        this.close()
      } catch (err) {
        this.carError = { ...this.carError, message: err.message }
      } finally {
        this.isRetrying = false
      }
    },
  },
}
</script>

<template>
  <a-modal
    :open="open"
    title="Complete trip"
    :width="560"
    :footer="null"
    :mask-closable="!isSubmitting"
    destroy-on-close
    @cancel="close"
    @after-close="reset"
  >
    <div v-if="trip" class="flex flex-col gap-4">
      <div class="rounded-card bg-surface p-4 text-body-md">
        <p class="m-0 text-label-lg">{{ carInfo.name }}</p>
        <p class="m-0 text-label-sm text-muted-foreground uppercase">{{ carInfo.plate }}</p>
        <p class="m-0 mt-1 text-body-sm text-muted-foreground">Started {{ startText }}</p>
      </div>

      <template v-if="carError">
        <a-alert
          type="warning"
          show-icon
          :message="`The trip was completed, but the car could not be updated: ${carError.message}`"
        />
        <div class="flex justify-end gap-2">
          <a-button @click="close">Close</a-button>
          <a-button type="primary" :loading="isRetrying" @click="retry">Retry car update</a-button>
        </div>
      </template>

      <VeeForm
        v-else
        :key="formKey"
        v-slot="{ handleSubmit }"
        :validation-schema="schema"
        :initial-values="initialValues"
        as="div"
      >
        <a-form layout="vertical" @submit="handleSubmit($event, onSubmit)">
          <a-alert v-if="formError" class="mb-4" type="error" show-icon :message="formError" />

          <VeeField v-slot="{ value, handleChange, errorMessage }" name="endDate">
            <a-form-item
              label="End time"
              :validate-status="errorMessage ? 'error' : ''"
              :help="errorMessage"
            >
              <a-date-picker
                :value="value"
                :value-format="valueFormat"
                format="D MMM YYYY, HH:mm"
                :show-time="showTime"
                :allow-clear="false"
                class="w-full"
                aria-label="End time"
                @update:value="handleChange"
              />
            </a-form-item>
          </VeeField>

          <div class="grid gap-x-4 sm:grid-cols-2">
            <VeeField v-slot="{ value, handleChange, errorMessage }" name="finishFuelLevel">
              <a-form-item
                label="Finish fuel, %"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input-number
                  :value="value"
                  :min="0"
                  :max="100"
                  class="w-full"
                  aria-label="Finish fuel"
                  @update:value="handleChange"
                />
              </a-form-item>
            </VeeField>
            <VeeField v-slot="{ value, handleChange, errorMessage }" name="finishMileage">
              <a-form-item
                label="Finish mileage, km"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input-number
                  :value="value"
                  :min="0"
                  class="w-full"
                  aria-label="Finish mileage"
                  @update:value="handleChange"
                />
              </a-form-item>
            </VeeField>
          </div>

          <a-checkbox v-model:checked="moveCar" class="mb-3">Update car location</a-checkbox>
          <div v-if="moveCar" class="mb-4 flex flex-col gap-2">
            <MapView
              class="h-56"
              :markers="markers"
              :fit-bounds="!location"
              pickable
              aria-label="Click the map to set the car's new location"
              @pick="onPick"
            />
            <p class="m-0 text-body-sm text-muted-foreground">
              {{
                locationText
                  ? `New location: ${locationText}`
                  : 'Click the map to set the new location.'
              }}
            </p>
          </div>

          <div class="flex justify-end gap-2">
            <a-button :disabled="isSubmitting" @click="close">Cancel</a-button>
            <a-button type="primary" html-type="submit" :loading="isSubmitting">
              Complete trip
            </a-button>
          </div>
        </a-form>
      </VeeForm>
    </div>
  </a-modal>
</template>
