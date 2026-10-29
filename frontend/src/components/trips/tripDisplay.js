// Shared text for trip cards. `trip` is an item of the bookings/trips getter:
// { booking, carId, car, plate }.

import { carName } from '@/utils/format'

export const REMOVED_CAR_NAME = 'Car no longer in fleet'

// `fleetLoaded` tells a removed car apart from a fleet list that failed to load
export const tripCarName = (trip, fleetLoaded = true) => {
  if (trip.car) return carName(trip.car)
  return fleetLoaded ? REMOVED_CAR_NAME : 'Car'
}

export const tripCarRoute = (trip) =>
  trip.car ? { name: 'car-details', params: { id: trip.carId } } : null
