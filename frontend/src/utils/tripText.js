// Display text for admin trips (E19 / E20 bookings with populated `userId` and `carId`;
// the populated car has no brand or model, so the name comes from the fleet list, Q5).

import { fullName, refId } from '@/utils/admin'
import { BOOKING_STATUS, bookingStatus, fuelUsed, tripDistance, tripDuration } from '@/utils/derive'
import {
  carName,
  dayKey,
  formatDateTime,
  formatDuration,
  formatKm,
  formatPercent,
  formatTime,
} from '@/utils/format'

const EMPTY = '—'

export const REMOVED_CAR = 'Car no longer in fleet'
export const DELETED_USER = 'Deleted user'

// { car, name, plate, vin } — `car` is the fleet copy, or null when the car was removed
export const tripCar = (trip, carsById = {}) => {
  const populated = trip?.carId && typeof trip.carId === 'object' ? trip.carId : null
  const car = carsById[refId(trip?.carId)] ?? null
  return {
    car,
    name: car ? carName(car) : REMOVED_CAR,
    plate: car?.registrationNumber ?? populated?.registrationNumber ?? '',
    vin: car?.vin ?? populated?.vin ?? '',
  }
}

// { name, email, licenseNumber, deleted }
export const tripClient = (trip) => {
  const user = trip?.userId && typeof trip.userId === 'object' ? trip.userId : null
  if (!user) return { name: DELETED_USER, email: '', licenseNumber: '', deleted: true }
  return {
    name: fullName(user),
    email: user.email ?? '',
    licenseNumber: user.licenseNumber ?? '',
    deleted: Boolean(user.isDeleted),
  }
}

// "In trip 42 min · since 13:42", "Starts 18:00", "54 min"
export const durationText = (trip, now = Date.now()) => {
  const status = bookingStatus(trip, now)
  if (status === BOOKING_STATUS.UPCOMING) {
    const sameDay = dayKey(trip.startDate) === dayKey(now)
    return `Starts ${sameDay ? formatTime(trip.startDate) : formatDateTime(trip.startDate)}`
  }
  const duration = formatDuration(tripDuration(trip, now))
  if (status === BOOKING_STATUS.ACTIVE)
    return `In trip ${duration} · since ${formatTime(trip.startDate)}`
  return duration
}

// "31 km · −12 % fuel" once the trip is finished
export const distanceFuelText = (trip) => {
  const distance = tripDistance(trip)
  const fuel = fuelUsed(trip)
  if (distance === null && fuel === null) return EMPTY
  const parts = []
  if (distance !== null) parts.push(formatKm(distance))
  if (fuel !== null) {
    const sign = fuel > 0 ? '−' : fuel < 0 ? '+' : ''
    parts.push(`${sign}${formatPercent(Math.abs(fuel))} fuel`)
  }
  return parts.join(' · ')
}
