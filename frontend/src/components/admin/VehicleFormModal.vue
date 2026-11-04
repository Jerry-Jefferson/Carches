<script>
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, Form as VeeForm } from 'vee-validate'
import { mapActions, mapGetters } from 'vuex'
import { z } from 'zod'

import MapView from '@/components/common/MapView.vue'
import { refId } from '@/utils/admin'
import { CAR_STATUS, carStatusMeta } from '@/utils/derive'
import { carName } from '@/utils/format'
import { DEFAULT_CENTER, toGeoJsonPoint, toLatLng } from '@/utils/geo'
import { mapVehicleError } from '@/utils/formErrors'
import notify from '@/utils/notify'

// Rules mirror the backend models (car.model.js, productionInfo.model.js)
const MIN_YEAR = 1886
const maxYear = () => new Date().getFullYear() + 1
const text = (label, min = 1, max) => {
  let schema = z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
  if (min > 1) schema = schema.min(min, `${label} must be at least ${min} characters long`)
  return max ? schema.max(max, `${label} cannot exceed ${max} characters`) : schema
}
const number = (label) =>
  z.number({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
const between = (label, min, max, message) => number(label).min(min, message).max(max, message)

export const vehicleSchema = z.object({
  brand: text('Brand', 2, 50),
  model: text('Model', 1, 50),
  year: number('Year')
    .int('Year must be a whole number')
    .min(MIN_YEAR, `Year cannot be before ${MIN_YEAR}`)
    .refine((year) => year <= maxYear(), { message: `Year cannot be after ${maxYear()}` }),
  vin: text('VIN', 2, 17).toUpperCase(),
  registrationNumber: text('Registration number', 2).toUpperCase(),
  status: z.enum(Object.values(CAR_STATUS), { required_error: 'Status is required' }),
  fuelLevel: number('Fuel level')
    .min(0, 'Fuel level cannot be negative')
    .max(100, 'Fuel level cannot exceed 100'),
  mileage: number('Mileage').min(0, 'Mileage cannot be negative'),
  lat: between('Latitude', -90, 90, 'Latitude must be between -90 and 90'),
  lng: between('Longitude', -180, 180, 'Longitude must be between -180 and 180'),
})
const schema = toTypedSchema(vehicleSchema)

// Fields PUT /cars/:vin may change; brand, model, year and VIN are fixed (Q9)
const EDITABLE = ['registrationNumber', 'status', 'fuelLevel', 'mileage']

const round = (value) => Math.round(value * 1e6) / 1e6

/**
 * Add a vehicle (E11) or edit one (E12). Brand, model, year and VIN can't be changed
 * after creation: PUT /cars/:vin is keyed by the VIN and can't replace productionInfo.
 */
export default {
  name: 'VehicleFormModal',
  components: { MapView, VeeField, VeeForm },
  props: {
    open: { type: Boolean, default: false },
    // null = create
    car: { type: Object, default: null },
  },
  emits: ['update:open', 'saved'],
  data() {
    return {
      schema,
      formKey: 0,
      formError: null,
      minYear: MIN_YEAR,
      maxYear: maxYear(),
      statusOptions: Object.values(CAR_STATUS).map((value) => ({
        value,
        label: carStatusMeta(value).label,
      })),
    }
  },
  computed: {
    ...mapGetters('admin/fleet', ['isMutating']),
    ...mapGetters('admin/trips', { trips: 'items' }),
    isEdit() {
      return Boolean(this.car)
    },
    title() {
      return this.isEdit ? `Edit ${carName(this.car)}` : 'Add vehicle'
    },
    initialValues() {
      const car = this.car
      const point = toLatLng(car?.location) ?? DEFAULT_CENTER
      return {
        brand: car?.productionInfo?.brand ?? '',
        model: car?.productionInfo?.model ?? '',
        year: car?.productionInfo?.year ?? new Date().getFullYear(),
        vin: car?.vin ?? '',
        registrationNumber: car?.registrationNumber ?? '',
        status: car?.status ?? CAR_STATUS.FREE,
        fuelLevel: car?.fuelLevel ?? 100,
        mileage: car?.mileage ?? 0,
        lat: point.lat,
        lng: point.lng,
      }
    },
    hasOpenBooking() {
      if (!this.car) return false
      return this.trips.some((trip) => refId(trip.carId) === this.car._id && !trip.endDate)
    },
  },
  watch: {
    open(isOpen) {
      if (!isOpen) return
      // A fresh form (initial values, errors) every time the modal opens
      this.formKey += 1
      this.formError = null
    },
  },
  methods: {
    ...mapActions('admin/fleet', ['createCar', 'updateCar']),
    close() {
      this.$emit('update:open', false)
    },
    markers(values) {
      if (!Number.isFinite(values.lat) || !Number.isFinite(values.lng)) return []
      return [
        { id: 'vehicle', lat: values.lat, lng: values.lng, tone: 'info', label: 'Car location' },
      ]
    },
    mapCenter(values) {
      return this.markers(values)[0] ?? DEFAULT_CENTER
    },
    pick({ lat, lng }, setFieldValue) {
      setFieldValue('lat', round(lat))
      setFieldValue('lng', round(lng))
    },
    statusChanged(values) {
      return this.isEdit && values.status !== this.car.status
    },
    // VINs and plates are stored in upper case; show that before submitting
    uppercase(event, handleChange, handleBlur) {
      const value = event?.target?.value
      if (typeof value === 'string') handleChange(value.trim().toUpperCase())
      handleBlur(event)
    },
    payload(values) {
      return {
        productionInfo: { brand: values.brand, model: values.model, year: values.year },
        vin: values.vin,
        registrationNumber: values.registrationNumber,
        status: values.status,
        fuelLevel: values.fuelLevel,
        mileage: values.mileage,
        location: toGeoJsonPoint({ lat: values.lat, lng: values.lng }),
      }
    },
    // Only the fields that differ from the car, so an edit never overwrites other changes
    changes(values) {
      const changes = {}
      for (const key of EDITABLE) {
        if (values[key] !== this.car[key]) changes[key] = values[key]
      }
      const point = toLatLng(this.car.location)
      if (!point || point.lat !== values.lat || point.lng !== values.lng) {
        changes.location = toGeoJsonPoint({ lat: values.lat, lng: values.lng })
      }
      return changes
    },
    async onSubmit(values, { setFieldError }) {
      this.formError = null
      try {
        let car
        if (this.isEdit) {
          const changes = this.changes(values)
          if (Object.keys(changes).length === 0) {
            this.close()
            return
          }
          car = await this.updateCar({ vin: this.car.vin, changes })
          notify.success('Car updated')
        } else {
          car = await this.createCar(this.payload(values))
          notify.success('Car added')
        }
        this.$emit('saved', car)
        this.close()
      } catch (err) {
        const { field, message } = mapVehicleError(err, values)
        if (field) setFieldError(field, message)
        else this.formError = message
      }
    },
  },
}
</script>

<template>
  <a-modal
    :open="open"
    :title="title"
    :width="720"
    :footer="null"
    :mask-closable="!isMutating"
    destroy-on-close
    @cancel="close"
  >
    <VeeForm
      :key="formKey"
      v-slot="{ handleSubmit, values, setFieldValue }"
      :validation-schema="schema"
      :initial-values="initialValues"
      as="div"
    >
      <a-form layout="vertical" @submit="handleSubmit($event, onSubmit)">
        <a-alert
          v-if="formError"
          class="mb-4"
          type="error"
          show-icon
          :message="formError"
          role="alert"
        />

        <fieldset class="m-0 mb-2 border-0 p-0">
          <legend class="mb-2 text-label-lg">Model</legend>
          <p v-if="isEdit" class="m-0 mb-3 text-body-sm text-muted-foreground">
            Brand, model, year and VIN can't be changed after the car is added.
          </p>
          <div class="grid gap-x-4 sm:grid-cols-3">
            <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="brand">
              <a-form-item
                label="Brand"
                html-for="vehicle-brand"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input
                  id="vehicle-brand"
                  :value="value"
                  :disabled="isEdit || isMutating"
                  placeholder="Toyota"
                  @update:value="handleChange"
                  @blur="handleBlur"
                />
              </a-form-item>
            </VeeField>
            <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="model">
              <a-form-item
                label="Model"
                html-for="vehicle-model"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input
                  id="vehicle-model"
                  :value="value"
                  :disabled="isEdit || isMutating"
                  placeholder="Camry"
                  @update:value="handleChange"
                  @blur="handleBlur"
                />
              </a-form-item>
            </VeeField>
            <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="year">
              <a-form-item
                label="Year"
                html-for="vehicle-year"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input-number
                  id="vehicle-year"
                  :value="value"
                  :min="minYear"
                  :max="maxYear"
                  :precision="0"
                  :disabled="isEdit || isMutating"
                  class="w-full"
                  @update:value="handleChange"
                  @blur="handleBlur"
                />
              </a-form-item>
            </VeeField>
          </div>
        </fieldset>

        <fieldset class="m-0 mb-2 border-0 p-0">
          <legend class="mb-2 text-label-lg">Identification</legend>
          <div class="grid gap-x-4 sm:grid-cols-2">
            <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="vin">
              <a-form-item
                label="VIN"
                html-for="vehicle-vin"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input
                  id="vehicle-vin"
                  :value="value"
                  :maxlength="17"
                  :disabled="isEdit || isMutating"
                  class="font-mono"
                  placeholder="JTDBR32E720123456"
                  @update:value="handleChange"
                  @blur="uppercase($event, handleChange, handleBlur)"
                />
              </a-form-item>
            </VeeField>
            <VeeField
              v-slot="{ value, handleChange, handleBlur, errorMessage }"
              name="registrationNumber"
            >
              <a-form-item
                label="Registration number"
                html-for="vehicle-plate"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input
                  id="vehicle-plate"
                  :value="value"
                  :disabled="isMutating"
                  placeholder="1234 AB-7"
                  @update:value="handleChange"
                  @blur="uppercase($event, handleChange, handleBlur)"
                />
              </a-form-item>
            </VeeField>
          </div>
        </fieldset>

        <fieldset class="m-0 mb-2 border-0 p-0">
          <legend class="mb-2 text-label-lg">State</legend>
          <div class="grid gap-x-4 sm:grid-cols-3">
            <VeeField v-slot="{ value, handleChange, errorMessage }" name="status">
              <a-form-item
                label="Status"
                html-for="vehicle-status"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-select
                  id="vehicle-status"
                  :value="value"
                  :options="statusOptions"
                  :disabled="isMutating"
                  @update:value="handleChange"
                />
              </a-form-item>
            </VeeField>
            <VeeField v-slot="{ value, handleChange, errorMessage }" name="fuelLevel">
              <a-form-item
                label="Fuel level, %"
                html-for="vehicle-fuel"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <div class="flex items-center gap-3">
                  <a-slider
                    :value="value"
                    :min="0"
                    :max="100"
                    :disabled="isMutating"
                    class="flex-1"
                    aria-label-for-handle="Fuel level"
                    @update:value="handleChange"
                  />
                  <a-input-number
                    id="vehicle-fuel"
                    :value="value"
                    :min="0"
                    :max="100"
                    :precision="0"
                    :disabled="isMutating"
                    class="w-20"
                    @update:value="handleChange"
                  />
                </div>
              </a-form-item>
            </VeeField>
            <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="mileage">
              <a-form-item
                label="Mileage, km"
                html-for="vehicle-mileage"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input-number
                  id="vehicle-mileage"
                  :value="value"
                  :min="0"
                  :precision="0"
                  :disabled="isMutating"
                  class="w-full"
                  @update:value="handleChange"
                  @blur="handleBlur"
                />
              </a-form-item>
            </VeeField>
          </div>
          <a-alert
            v-if="hasOpenBooking && statusChanged(values)"
            class="mb-4"
            type="warning"
            show-icon
            message="This car has an open booking"
            description="Changing its status by hand does not end the booking. Complete or delete the trip instead, if that is what you mean."
          />
        </fieldset>

        <fieldset class="m-0 mb-2 border-0 p-0">
          <legend class="mb-2 text-label-lg">Location</legend>
          <p class="m-0 mb-3 text-body-sm text-muted-foreground">
            Click the map to place the car, or type the coordinates.
          </p>
          <MapView
            class="mb-3 h-56"
            :markers="markers(values)"
            :center="mapCenter(values)"
            :fit-bounds="false"
            :zoom="14"
            pickable
            aria-label="Pick the car location"
            @pick="pick($event, setFieldValue)"
          />
          <div class="grid gap-x-4 sm:grid-cols-2">
            <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="lat">
              <a-form-item
                label="Latitude"
                html-for="vehicle-lat"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input-number
                  id="vehicle-lat"
                  :value="value"
                  :min="-90"
                  :max="90"
                  :step="0.0001"
                  :disabled="isMutating"
                  class="w-full"
                  @update:value="handleChange"
                  @blur="handleBlur"
                />
              </a-form-item>
            </VeeField>
            <VeeField v-slot="{ value, handleChange, handleBlur, errorMessage }" name="lng">
              <a-form-item
                label="Longitude"
                html-for="vehicle-lng"
                :validate-status="errorMessage ? 'error' : ''"
                :help="errorMessage"
              >
                <a-input-number
                  id="vehicle-lng"
                  :value="value"
                  :min="-180"
                  :max="180"
                  :step="0.0001"
                  :disabled="isMutating"
                  class="w-full"
                  @update:value="handleChange"
                  @blur="handleBlur"
                />
              </a-form-item>
            </VeeField>
          </div>
        </fieldset>

        <div class="flex justify-end gap-2">
          <a-button :disabled="isMutating" @click="close">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="isMutating">
            {{ isEdit ? 'Save changes' : 'Add vehicle' }}
          </a-button>
        </div>
      </a-form>
    </VeeForm>
  </a-modal>
</template>
