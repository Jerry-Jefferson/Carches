// Zod 3 schemas for the admin booking forms. Fuel and mileage follow the booking model
// (fuel 0–100 %, mileage ≥ 0); the date rules are client-side checks of the same data.
// Dates are picker strings (utils/schedule SCHEDULE_VALUE_FORMAT, browser local time).

import { z } from 'zod'

import { fromPickerValue } from '@/utils/schedule'

const time = (value) => fromPickerValue(value)?.getTime() ?? NaN

const dateField = (label) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(time(value)), `Enter a valid ${label.toLowerCase()}`)

const optionalDate = z.string().nullable().optional()

const fuel = (label) =>
  z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .min(0, 'Fuel level cannot be negative')
    .max(100, 'Fuel level cannot exceed 100')

const mileage = (label) =>
  z
    .number({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .min(0, 'Mileage cannot be negative')

const id = (message) =>
  z.string({ required_error: message, invalid_type_error: message }).min(1, message)

export const createBookingSchema = z.object({
  userId: id('Choose a user'),
  carId: id('Choose a car'),
  startDate: dateField('Start time'),
  startFuelLevel: fuel('Start fuel'),
  startMileage: mileage('Start mileage'),
})

const optionalFuel = fuel('Finish fuel').nullable().optional()
const optionalMileage = mileage('Finish mileage').nullable().optional()

const isSet = (value) => value !== null && value !== undefined && value !== ''

export const editBookingSchema = z
  .object({
    startDate: dateField('Start time'),
    endDate: optionalDate,
    startFuelLevel: fuel('Start fuel'),
    startMileage: mileage('Start mileage'),
    finishFuelLevel: optionalFuel,
    finishMileage: optionalMileage,
  })
  .superRefine((values, ctx) => {
    if (isSet(values.endDate) && time(values.endDate) < time(values.startDate)) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End must be after the start' })
    }
    if (isSet(values.finishMileage) && values.finishMileage < values.startMileage) {
      ctx.addIssue({
        code: 'custom',
        path: ['finishMileage'],
        message: 'Finish mileage cannot be lower than the start mileage',
      })
    }
  })

// Built per trip: the end and the finish mileage are compared with the trip's start
export const completeTripSchema = (trip) =>
  z
    .object({
      endDate: dateField('End time'),
      finishFuelLevel: fuel('Finish fuel'),
      finishMileage: mileage('Finish mileage'),
    })
    .superRefine((values, ctx) => {
      // The picker has no seconds: an end in the start's own minute is fine (it is sent
      // as the start itself, see CompleteTripModal)
      const startMinute = Math.floor(new Date(trip?.startDate).getTime() / 60000) * 60000
      if (time(values.endDate) < startMinute) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End must be after the start' })
      }
      if (Number.isFinite(trip?.startMileage) && values.finishMileage < trip.startMileage) {
        ctx.addIssue({
          code: 'custom',
          path: ['finishMileage'],
          message: 'Finish mileage cannot be lower than the start mileage',
        })
      }
    })
