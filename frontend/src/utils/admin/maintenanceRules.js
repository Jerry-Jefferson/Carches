// Previews of the fleet maintenance actions (Q11, Q12). They count only the cars the update
// would change, so they match its modifiedCount.

import { CAR_STATUS } from '@/utils/cars/carStatus'
import { toLatLng } from '@/utils/geo/coordinates'
import { bookingCountsByCar } from './consoleStats'

// Same rules as PUT /cars/service-old-or-high-mileage and PUT /cars/relocate-frequently-booked
export const SERVICE_YEAR_BEFORE = 2017
export const SERVICE_MILEAGE_OVER = 100000
export const RELOCATE_BOOKINGS_OVER = 2

// Target of PUT /cars/relocate-frequently-booked (hardcoded in the backend)
export const DEPOT_POINT = Object.freeze({ lat: 53.8882836, lng: 27.5442615 })

export const serviceCandidates = (cars) =>
  cars.filter(
    (car) =>
      car.status !== CAR_STATUS.IN_SERVICE &&
      ((car.productionInfo?.year ?? Infinity) < SERVICE_YEAR_BEFORE ||
        (car.mileage ?? 0) > SERVICE_MILEAGE_OVER),
  )

const isAtDepot = (car) => {
  const point = toLatLng(car.location)
  return point?.lat === DEPOT_POINT.lat && point?.lng === DEPOT_POINT.lng
}

export const relocationCandidates = (cars, trips) => {
  const counts = bookingCountsByCar(trips)
  const busy = [CAR_STATUS.IN_USE, CAR_STATUS.RESERVED]
  return cars.filter(
    (car) =>
      (counts[car._id] ?? 0) > RELOCATE_BOOKINGS_OVER &&
      !busy.includes(car.status) &&
      !isAtDepot(car),
  )
}
