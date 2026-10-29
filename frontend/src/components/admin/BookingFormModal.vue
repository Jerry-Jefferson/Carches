<script>
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, Form as VeeForm } from 'vee-validate'
import { mapActions, mapState } from 'vuex'

import { fullName } from '@/utils/admin'
import { CAR_STATUS } from '@/utils/derive'
import { carName } from '@/utils/format'
import notify from '@/utils/notify'
import {
  SCHEDULE_STEP_MINUTES,
  SCHEDULE_VALUE_FORMAT,
  fromPickerValue,
  toPickerValue,
} from '@/utils/schedule'
import { createBookingSchema, editBookingSchema } from './bookingSchema'
import { tripCar, tripClient } from './tripText'

const createSchema = toTypedSchema(createBookingSchema)
const editSchema = toTypedSchema(editBookingSchema)

const DATE_FIELDS = ['startDate', 'endDate']
const toIso = (value) => (value ? fromPickerValue(value).toISOString() : null)

/**
 * Admin booking form. Create (E21 with `userId`): any user, a free car, start values
 * prefilled from the car. Edit (E22): dates and start / finish values; only changed fields
 * are sent, and the backend recomputes the car status from the dates.
 */
export default {
  name: 'BookingFormModal',
  components: { VeeField, VeeForm },
  props: {
    open: { type: Boolean, default: false },
    // null creates a new booking
    trip: { type: Object, default: null },
  },
  emits: ['update:open', 'saved'],
  data() {
    return {
      formError: '',
      isSubmitting: false,
      valueFormat: SCHEDULE_VALUE_FORMAT,
      showTime: { format: 'HH:mm', minuteStep: SCHEDULE_STEP_MINUTES },
      hint: 'Setting an end date completes the trip and frees the car; a future start reserves it.',
    }
  },
  computed: {
    ...mapState('cars', { cars: 'items' }),
    ...mapState('admin/users', { users: 'items' }),
    isEdit() {
      return Boolean(this.trip)
    },
    title() {
      return this.isEdit ? 'Edit booking' : 'New booking'
    },
    schema() {
      return this.isEdit ? editSchema : createSchema
    },
    initialValues() {
      const trip = this.trip
      if (!trip) {
        return {
          userId: null,
          carId: null,
          startDate: toPickerValue(new Date()),
          startFuelLevel: null,
          startMileage: null,
        }
      }
      return {
        startDate: toPickerValue(trip.startDate),
        endDate: trip.endDate ? toPickerValue(trip.endDate) : null,
        startFuelLevel: trip.startFuelLevel ?? null,
        startMileage: trip.startMileage ?? null,
        finishFuelLevel: trip.finishFuelLevel ?? null,
        finishMileage: trip.finishMileage ?? null,
      }
    },
    userOptions() {
      return this.users.map((user) => ({
        value: user._id,
        label: `${fullName(user)} — ${user.email}`,
      }))
    },
    carOptions() {
      return this.cars
        .filter((car) => car.status === CAR_STATUS.FREE)
        .map((car) => ({ value: car._id, label: `${carName(car)} · ${car.registrationNumber}` }))
    },
    // Read-only context for an edited booking
    summary() {
      if (!this.trip) return null
      const carsById = Object.fromEntries(this.cars.map((car) => [car._id, car]))
      const car = tripCar(this.trip, carsById)
      return { client: tripClient(this.trip).name, car: `${car.name} · ${car.plate}` }
    },
    formKey() {
      return `${this.trip?._id ?? 'new'}-${this.open}`
    },
  },
  methods: {
    ...mapActions('admin/trips', ['createTrip', 'updateTrip']),
    close() {
      this.$emit('update:open', false)
    },
    filterOption(input, option) {
      return option.label.toLowerCase().includes(input.trim().toLowerCase())
    },
    // The start values default to the car's current fuel and mileage
    onCarChange(carId, handleChange, setFieldValue) {
      handleChange(carId)
      const car = this.cars.find((item) => item._id === carId)
      if (!car) return
      setFieldValue('startFuelLevel', car.fuelLevel ?? null)
      setFieldValue('startMileage', car.mileage ?? null)
    },
    changedFields(values) {
      const changes = {}
      for (const [key, value] of Object.entries(values)) {
        if (value === this.initialValues[key]) continue
        changes[key] = DATE_FIELDS.includes(key) ? toIso(value) : (value ?? null)
      }
      return changes
    },
    async onSubmit(values) {
      this.formError = ''
      this.isSubmitting = true
      try {
        let saved
        if (this.isEdit) {
          const changes = this.changedFields(values)
          saved = Object.keys(changes).length
            ? await this.updateTrip({ id: this.trip._id, changes })
            : this.trip
          notify.success('Booking updated')
        } else {
          saved = await this.createTrip({
            userId: values.userId,
            carId: values.carId,
            startDate: toIso(values.startDate),
            startFuelLevel: values.startFuelLevel,
            startMileage: values.startMileage,
          })
          notify.success('Booking created')
        }
        this.$emit('saved', saved)
        this.close()
      } catch (err) {
        this.formError = err.message
      } finally {
        this.isSubmitting = false
      }
    },
  },
}
</script>

<template>
  <a-modal
    :open="open"
    :title="title"
    :width="560"
    :footer="null"
    :mask-closable="!isSubmitting"
    destroy-on-close
    @cancel="close"
  >
    <VeeForm
      :key="formKey"
      v-slot="{ handleSubmit, setFieldValue }"
      :validation-schema="schema"
      :initial-values="initialValues"
      as="div"
    >
      <a-form layout="vertical" @submit="handleSubmit($event, onSubmit)">
        <a-alert v-if="formError" class="mb-4" type="error" show-icon :message="formError" />

        <dl
          v-if="summary"
          class="m-0 mb-4 flex flex-col gap-1 rounded-card bg-surface p-4 text-body-md"
        >
          <div class="flex justify-between gap-4">
            <dt class="text-muted-foreground">Client</dt>
            <dd class="m-0 text-label-md">{{ summary.client }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted-foreground">Car</dt>
            <dd class="m-0 text-label-md">{{ summary.car }}</dd>
          </div>
        </dl>

        <template v-if="!isEdit">
          <VeeField v-slot="{ value, handleChange, errorMessage }" name="userId">
            <a-form-item
              label="User"
              :validate-status="errorMessage ? 'error' : ''"
              :help="errorMessage"
            >
              <a-select
                :value="value"
                :options="userOptions"
                show-search
                :filter-option="filterOption"
                placeholder="Search by name or e-mail"
                aria-label="User"
                @update:value="handleChange"
              />
            </a-form-item>
          </VeeField>

          <VeeField v-slot="{ value, handleChange, errorMessage }" name="carId">
            <a-form-item
              label="Car (available only)"
              :validate-status="errorMessage ? 'error' : ''"
              :help="errorMessage"
            >
              <a-select
                :value="value"
                :options="carOptions"
                show-search
                :filter-option="filterOption"
                placeholder="Search by name or plate"
                not-found-content="No available cars"
                aria-label="Car"
                @update:value="onCarChange($event, handleChange, setFieldValue)"
              />
            </a-form-item>
          </VeeField>
        </template>

        <div class="grid gap-x-4 sm:grid-cols-2">
          <VeeField v-slot="{ value, handleChange, errorMessage }" name="startDate">
            <a-form-item
              label="Start time"
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
                aria-label="Start time"
                @update:value="handleChange"
              />
            </a-form-item>
          </VeeField>

          <VeeField v-if="isEdit" v-slot="{ value, handleChange, errorMessage }" name="endDate">
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
                placeholder="Still open"
                class="w-full"
                aria-label="End time"
                @update:value="handleChange"
              />
            </a-form-item>
          </VeeField>
        </div>

        <div class="grid gap-x-4 sm:grid-cols-2">
          <VeeField v-slot="{ value, handleChange, errorMessage }" name="startFuelLevel">
            <a-form-item
              label="Start fuel, %"
              :validate-status="errorMessage ? 'error' : ''"
              :help="errorMessage"
            >
              <a-input-number
                :value="value"
                :min="0"
                :max="100"
                class="w-full"
                aria-label="Start fuel"
                @update:value="handleChange"
              />
            </a-form-item>
          </VeeField>
          <VeeField v-slot="{ value, handleChange, errorMessage }" name="startMileage">
            <a-form-item
              label="Start mileage, km"
              :validate-status="errorMessage ? 'error' : ''"
              :help="errorMessage"
            >
              <a-input-number
                :value="value"
                :min="0"
                class="w-full"
                aria-label="Start mileage"
                @update:value="handleChange"
              />
            </a-form-item>
          </VeeField>
        </div>

        <div v-if="isEdit" class="grid gap-x-4 sm:grid-cols-2">
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

        <p class="m-0 mb-4 text-body-sm text-muted-foreground">{{ hint }}</p>

        <div class="flex justify-end gap-2">
          <a-button :disabled="isSubmitting" @click="close">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="isSubmitting">
            {{ isEdit ? 'Save changes' : 'Create booking' }}
          </a-button>
        </div>
      </a-form>
    </VeeForm>
  </a-modal>
</template>
