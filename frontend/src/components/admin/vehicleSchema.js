// Zod 3 schema for the vehicle form. The rules mirror the backend models
// (car.model.js, productionInfo.model.js); mapVehicleError() places duplicate
// VIN / plate errors on the right field.

import { z } from 'zod'

import { getErrorMessage } from '@/api/http'
import { CAR_STATUS } from '@/utils/derive'

export const MIN_YEAR = 1886
export const maxYear = () => new Date().getFullYear() + 1

const text = (label, min, max) => {
  let schema = z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
  if (min > 1) schema = schema.min(min, `${label} must be at least ${min} characters long`)
  if (max) schema = schema.max(max, `${label} cannot exceed ${max} characters`)
  return schema
}

const number = (label) =>
  z.number({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })

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
  lat: number('Latitude')
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: number('Longitude')
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
})

const DUPLICATE = /^Duplicate field value entered: (.*)\. Please use another value/i

/**
 * Where to show a failed save. Returns { field, message }: `field` is 'vin',
 * 'registrationNumber' or null for a form-level alert.
 */
export const mapVehicleError = (error, values = {}) => {
  const message = getErrorMessage(error)
  const duplicate = message.match(DUPLICATE)?.[1]?.trim().toUpperCase()
  if (duplicate) {
    if (duplicate === String(values.vin ?? '').toUpperCase()) {
      return { field: 'vin', message: 'A car with this VIN already exists' }
    }
    if (duplicate === String(values.registrationNumber ?? '').toUpperCase()) {
      return {
        field: 'registrationNumber',
        message: 'A car with this registration number already exists',
      }
    }
  }
  return { field: null, message }
}
