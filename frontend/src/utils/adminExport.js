// CSV "Export report" of the console: the rows currently shown in each section.

import { fullName, refId } from './admin'
import { bookingStatus, bookingStatusMeta, carStatusMeta, fuelUsed, tripDistance } from './derive'
import { carName } from './format'
import { toLatLng } from './geo'

// "carshes-fleet-2026-10-29.csv"
export const csvFilename = (section, day) => `carshes-${section}-${day}.csv`

const iso = (value) => (value ? new Date(value).toISOString() : '')

export const FLEET_COLUMNS = [
  { title: 'Brand', value: (car) => car.productionInfo?.brand },
  { title: 'Model', value: (car) => car.productionInfo?.model },
  { title: 'Year', value: (car) => car.productionInfo?.year },
  { title: 'Registration number', value: 'registrationNumber' },
  { title: 'VIN', value: 'vin' },
  { title: 'Status', value: (car) => carStatusMeta(car.status).label },
  { title: 'Fuel level, %', value: 'fuelLevel' },
  { title: 'Mileage, km', value: 'mileage' },
  { title: 'Latitude', value: (car) => toLatLng(car.location)?.lat },
  { title: 'Longitude', value: (car) => toLatLng(car.location)?.lng },
  { title: 'Updated', value: (car) => iso(car.updatedAt) },
]

export const userColumns = (tripCounts = {}) => [
  { title: 'First name', value: 'firstName' },
  { title: 'Last name', value: 'lastName' },
  { title: 'E-mail', value: 'email' },
  { title: 'Licence number', value: 'licenseNumber' },
  { title: 'Role', value: 'role' },
  { title: 'Registered', value: (user) => iso(user.createdAt) },
  { title: 'Trips', value: (user) => tripCounts[user._id]?.total ?? 0 },
  { title: 'Completed trips', value: (user) => tripCounts[user._id]?.completed ?? 0 },
]

export const tripColumns = ({ carsById = {}, now = Date.now() } = {}) => [
  { title: 'Booking ID', value: '_id' },
  {
    title: 'Client',
    value: (trip) => (typeof trip.userId === 'object' ? fullName(trip.userId) : ''),
  },
  { title: 'Client e-mail', value: (trip) => trip.userId?.email },
  {
    title: 'Car',
    value: (trip) => {
      const car = carsById[refId(trip.carId)]
      return car ? carName(car) : ''
    },
  },
  { title: 'Registration number', value: (trip) => trip.carId?.registrationNumber },
  { title: 'Status', value: (trip) => bookingStatusMeta(bookingStatus(trip, now)).label },
  { title: 'Start', value: (trip) => iso(trip.startDate) },
  { title: 'End', value: (trip) => iso(trip.endDate) },
  { title: 'Distance, km', value: (trip) => tripDistance(trip) },
  { title: 'Fuel used, %', value: (trip) => fuelUsed(trip) },
]
