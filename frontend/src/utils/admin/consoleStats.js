// Admin console counts and KPIs over the full lists (E9 cars, E5 users, E19 bookings).

import { BOOKING_STATUS, bookingStatus } from '@/utils/bookings/bookingStatus'
import { tripDistance } from '@/utils/bookings/tripMetrics'
import { CAR_STATUS, countCarsByStatus } from '@/utils/cars/carStatus'
import { countBy, refId } from '@/utils/common/collections'
import { DAY_MS } from '@/utils/common/time'
import { minskDayKey } from '@/utils/format/dateTime'
import { ROLE } from '@/utils/users/userDisplay'

// ── Counts ──────────────────────────────────────────────────────────────────────

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
  const counts = countCarsByStatus(cars)
  const rentable = cars.length - counts[CAR_STATUS.IN_SERVICE] - counts[CAR_STATUS.UNAVAILABLE]
  return rentable > 0 ? Math.round((counts[CAR_STATUS.IN_USE] / rentable) * 100) : 0
}

// Trips started per Minsk day, oldest first: [{ day: '2026-10-23', count }, …]
export const tripsStartedPerDay = (trips, { days = 7, now = Date.now() } = {}) => {
  const started = countBy(trips, (trip) => minskDayKey(trip.startDate))
  return Array.from({ length: days }, (_, i) => {
    const day = minskDayKey(now - (days - 1 - i) * DAY_MS)
    return { day, count: started[day] ?? 0 }
  })
}

const previousDay = (day) => minskDayKey(new Date(`${day}T12:00:00+03:00`).getTime() - DAY_MS)

// Trips finished on `day` (a minskDayKey), the distance driven in them, and the day before
export const dayStats = (trips, day, now = Date.now()) => {
  const finishedOn = (key) =>
    trips.filter((trip) => trip.endDate && minskDayKey(trip.endDate) === key)
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
  newThisWeek: users.filter((user) => new Date(user.createdAt).getTime() > now - 7 * DAY_MS).length,
  admins: users.filter((user) => user.role === ROLE.ADMIN).length,
})
