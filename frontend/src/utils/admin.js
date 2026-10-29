// Admin console helpers over the full lists (E9 cars, E5 users, E19 bookings):
// KPIs, client-side filters (the API has none, Q13) and maintenance previews.

import { BOOKING_STATUS, CAR_STATUS, bookingStatus, tripDistance } from './derive'
import { carName, dayKey } from './format'

export const ALL = 'all'
export const ROLE = Object.freeze({ USER: 'user', ADMIN: 'admin' })

// Console sections, deep-linked with ?tab=
export const ADMIN_TABS = Object.freeze({ FLEET: 'fleet', TRIPS: 'trips', USERS: 'users' })

const DAY = 24 * 3600 * 1000

// Same rules as PUT /cars/service-old-or-high-mileage and PUT /cars/relocate-frequently-booked
export const SERVICE_YEAR_BEFORE = 2017
export const SERVICE_MILEAGE_OVER = 100000
export const RELOCATE_BOOKINGS_OVER = 2

// A populated reference ({ _id, … }) or a bare id → the id
export const refId = (ref) => (ref && typeof ref === 'object' ? (ref._id ?? null) : (ref ?? null))

export const fullName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || ''

const includes = (value, needle) =>
  String(value ?? '')
    .toLowerCase()
    .includes(needle)

// ── Counts ──────────────────────────────────────────────────────────────────────

export const countBy = (items, keyOf) => {
  const counts = {}
  for (const item of items) {
    const key = keyOf(item)
    if (key !== null && key !== undefined) counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export const carStatusCounts = (cars) => {
  const counts = Object.fromEntries(Object.values(CAR_STATUS).map((status) => [status, 0]))
  for (const car of cars) if (car.status in counts) counts[car.status] += 1
  return counts
}

// { [userId]: { total, completed } }
export const tripCountsByUser = (trips) => {
  const counts = {}
  for (const trip of trips) {
    const id = refId(trip.userId)
    if (!id) continue
    counts[id] ??= { total: 0, completed: 0 }
    counts[id].total += 1
    if (trip.endDate) counts[id].completed += 1
  }
  return counts
}

export const bookingCountsByCar = (trips) => countBy(trips, (trip) => refId(trip.carId))

// ── KPIs ────────────────────────────────────────────────────────────────────────

// In-trip cars ÷ cars that could be rented (not in service, not unavailable), 0–100
export const utilisation = (cars) => {
  const counts = carStatusCounts(cars)
  const rentable = cars.length - counts[CAR_STATUS.IN_SERVICE] - counts[CAR_STATUS.UNAVAILABLE]
  return rentable > 0 ? Math.round((counts[CAR_STATUS.IN_USE] / rentable) * 100) : 0
}

// Trips started per Minsk day, oldest first: [{ day: '2026-10-23', count }, …]
export const tripsStartedPerDay = (trips, { days = 7, now = Date.now() } = {}) => {
  const started = countBy(trips, (trip) => dayKey(trip.startDate))
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(now - (days - 1 - i) * DAY)
    return { day, count: started[day] ?? 0 }
  })
}

const previousDay = (day) => dayKey(new Date(`${day}T12:00:00+03:00`).getTime() - DAY)

// Trips finished on `day` (a dayKey), the distance driven in them, and the day before
export const dayStats = (trips, day, now = Date.now()) => {
  const finishedOn = (key) => trips.filter((trip) => trip.endDate && dayKey(trip.endDate) === key)
  const finished = finishedOn(day)
  return {
    completed: finished.length,
    previous: finishedOn(previousDay(day)).length,
    distance: finished.reduce((sum, trip) => sum + (tripDistance(trip) ?? 0), 0),
    upcoming: trips.filter((trip) => bookingStatus(trip, now) === BOOKING_STATUS.UPCOMING).length,
  }
}

export const userStats = (users, now = Date.now()) => ({
  total: users.length,
  newThisWeek: users.filter((user) => new Date(user.createdAt).getTime() > now - 7 * DAY).length,
  admins: users.filter((user) => user.role === ROLE.ADMIN).length,
})

// ── Maintenance previews (Q11, Q12) ─────────────────────────────────────────────

export const serviceCandidates = (cars) =>
  cars.filter(
    (car) =>
      (car.productionInfo?.year ?? Infinity) < SERVICE_YEAR_BEFORE ||
      (car.mileage ?? 0) > SERVICE_MILEAGE_OVER,
  )

export const relocationCandidates = (cars, trips) => {
  const counts = bookingCountsByCar(trips)
  const busy = [CAR_STATUS.IN_USE, CAR_STATUS.RESERVED]
  return cars.filter(
    (car) => (counts[car._id] ?? 0) > RELOCATE_BOOKINGS_OVER && !busy.includes(car.status),
  )
}

// ── Table filters ───────────────────────────────────────────────────────────────

export const DEFAULT_FLEET_FILTERS = Object.freeze({
  q: '',
  brand: ALL,
  status: ALL,
  yearFrom: null,
  yearTo: null,
})

export const filterAdminCars = (cars, filters, { ignore = null } = {}) => {
  const needle = filters.q?.trim().toLowerCase()
  return cars.filter((car) => {
    const year = car.productionInfo?.year
    if (needle) {
      const fields = [carName(car), car.registrationNumber, car.vin]
      if (!fields.some((value) => includes(value, needle))) return false
    }
    if (filters.brand !== ALL && car.productionInfo?.brand !== filters.brand) return false
    if (ignore !== 'status' && filters.status !== ALL && car.status !== filters.status) return false
    if (filters.yearFrom && !(year >= filters.yearFrom)) return false
    if (filters.yearTo && !(year <= filters.yearTo)) return false
    return true
  })
}

export const DEFAULT_TRIP_FILTERS = Object.freeze({ q: '', status: ALL, dateOnly: false })

// `carsById` adds brand and model (the populated car has none, Q5)
export const filterTrips = (
  trips,
  filters,
  { carsById = {}, day = null, now = Date.now() } = {},
) => {
  const needle = filters.q?.trim().toLowerCase()
  return trips.filter((trip) => {
    if (filters.status !== ALL && bookingStatus(trip, now) !== filters.status) return false
    if (filters.dateOnly && day) {
      const touches = [trip.startDate, trip.endDate].some((value) => value && dayKey(value) === day)
      if (!touches) return false
    }
    if (needle) {
      const user = typeof trip.userId === 'object' ? trip.userId : null
      const car = carsById[refId(trip.carId)] ?? trip.carId
      const fields = [fullName(user), user?.email, carName(car), car?.registrationNumber]
      if (!fields.some((value) => includes(value, needle))) return false
    }
    return true
  })
}

export const DEFAULT_USER_FILTERS = Object.freeze({ q: '', role: ALL })

export const filterUsers = (users, filters) => {
  const needle = filters.q?.trim().toLowerCase()
  return users.filter((user) => {
    if (filters.role !== ALL && user.role !== filters.role) return false
    if (!needle) return true
    return [fullName(user), user.email, user.licenseNumber].some((value) => includes(value, needle))
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
