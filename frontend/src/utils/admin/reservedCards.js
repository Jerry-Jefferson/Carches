// Reserved cars & card authorisation (E15).

import { refId } from '@/utils/common/collections'

export const reservedRowKey = (row) => `${row.vin}|${row.userLicenseNumber ?? ''}`

// E15 returns one row per booking × credit card of each reserved car, past bookers and
// extra cards included (backend gap). Keeps one row per car and driver and, when the
// loaded trips name the driver of the car's open booking, only that driver's row.
export const currentReservedRows = (rows, { cars = [], trips = [] } = {}) => {
  const carIdByVin = new Map(cars.map((car) => [car.vin, car._id]))
  const openDriverByCar = new Map()
  for (const trip of trips) {
    const licence = trip.endDate ? null : trip.userId?.licenseNumber
    if (licence) openDriverByCar.set(refId(trip.carId), licence)
  }

  const seen = new Set()
  return rows.filter((row) => {
    const openDriver = openDriverByCar.get(carIdByVin.get(row.vin))
    if (openDriver && row.userLicenseNumber !== openDriver) return false
    const key = reservedRowKey(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
