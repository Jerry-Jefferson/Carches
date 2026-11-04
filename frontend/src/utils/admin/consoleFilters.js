// Client-side table filters of the admin console (the API has none, Q13) and the
// top-bar search.

import { bookingStatus } from '@/utils/bookings/bookingStatus'
import { carName } from '@/utils/cars/carDisplay'
import { ALL, matchesText, refId } from '@/utils/common/collections'
import { minskDayKey } from '@/utils/format/dateTime'
import { fullName } from '@/utils/users/userDisplay'

const needleOf = (filters) => filters.q?.trim().toLowerCase()

// ── Fleet ───────────────────────────────────────────────────────────────────────

export const DEFAULT_FLEET_FILTERS = Object.freeze({
  q: '',
  brand: ALL,
  status: ALL,
  yearFrom: null,
  yearTo: null,
})

export const filterAdminCars = (cars, filters, { ignore = null } = {}) => {
  const needle = needleOf(filters)
  return cars.filter((car) => {
    const year = car.productionInfo?.year
    if (needle) {
      const fields = [carName(car), car.registrationNumber, car.vin]
      if (!fields.some((value) => matchesText(value, needle))) return false
    }
    if (filters.brand !== ALL && car.productionInfo?.brand !== filters.brand) return false
    if (ignore !== 'status' && filters.status !== ALL && car.status !== filters.status) return false
    if (filters.yearFrom && !(year >= filters.yearFrom)) return false
    if (filters.yearTo && !(year <= filters.yearTo)) return false
    return true
  })
}

// ── Trips ───────────────────────────────────────────────────────────────────────

export const DEFAULT_TRIP_FILTERS = Object.freeze({ q: '', status: ALL, dateOnly: false })

// `carsById` adds brand and model (the populated car has none, Q5)
export const filterTrips = (
  trips,
  filters,
  { carsById = {}, day = null, now = Date.now() } = {},
) => {
  const needle = needleOf(filters)
  return trips.filter((trip) => {
    if (filters.status !== ALL && bookingStatus(trip, now) !== filters.status) return false
    if (filters.dateOnly && day) {
      const touches = [trip.startDate, trip.endDate].some(
        (value) => value && minskDayKey(value) === day,
      )
      if (!touches) return false
    }
    if (needle) {
      const user = typeof trip.userId === 'object' ? trip.userId : null
      const car = carsById[refId(trip.carId)] ?? trip.carId
      const fields = [fullName(user), user?.email, carName(car), car?.registrationNumber]
      if (!fields.some((value) => matchesText(value, needle))) return false
    }
    return true
  })
}

// ── Users ───────────────────────────────────────────────────────────────────────

export const DEFAULT_USER_FILTERS = Object.freeze({ q: '', role: ALL })

export const filterUsers = (users, filters) => {
  const needle = needleOf(filters)
  return users.filter((user) => {
    if (filters.role !== ALL && user.role !== filters.role) return false
    if (!needle) return true
    return [fullName(user), user.email, user.licenseNumber].some((value) =>
      matchesText(value, needle),
    )
  })
}

// ── Global search (top bar) ─────────────────────────────────────────────────────

export const searchConsole = (query, { cars = [], users = [], limit = 5 } = {}) => {
  const needle = query?.trim().toLowerCase()
  if (!needle) return { cars: [], users: [] }
  return {
    cars: filterAdminCars(cars, { ...DEFAULT_FLEET_FILTERS, q: needle }).slice(0, limit),
    users: filterUsers(users, { ...DEFAULT_USER_FILTERS, q: needle }).slice(0, limit),
  }
}
