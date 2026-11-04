// CSV export of already loaded rows (admin "Export report"): the generic CSV builder
// and download helper, and the columns of each console section.

import { bookingStatus, bookingStatusMeta } from '@/utils/bookings/bookingStatus'
import { fuelUsed, tripDistance } from '@/utils/bookings/tripMetrics'
import { carName } from '@/utils/cars/carDisplay'
import { carStatusMeta } from '@/utils/cars/carStatus'
import { refId } from '@/utils/common/collections'
import { toLatLng } from '@/utils/geo/coordinates'
import { fullName } from '@/utils/users/userDisplay'

// Excel needs the BOM to read UTF-8 correctly
const BOM = '﻿'

// Cells starting with these are run as formulas by spreadsheet apps (CSV injection)
const FORMULA_PREFIX = /^[=+\-@\t\r]/

const escapeCell = (value, delimiter) => {
  if (value === null || value === undefined) return ''
  let text = value instanceof Date ? value.toISOString() : String(value)
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) text = `'${text}`
  const needsQuotes = text.includes(delimiter) || /["\r\n]/.test(text)
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text
}

// columns: [{ title: 'VIN', value: 'vin' }, { title: 'Car', value: (row) => carName(row) }]
export const toCsv = (rows, columns, { delimiter = ',' } = {}) => {
  const read = (row, { value }) => (typeof value === 'function' ? value(row) : row?.[value])
  const lines = [
    columns.map((column) => escapeCell(column.title, delimiter)),
    ...rows.map((row) => columns.map((column) => escapeCell(read(row, column), delimiter))),
  ]
  return BOM + lines.map((cells) => cells.join(delimiter)).join('\r\n')
}

export const downloadCsv = (filename, csv) => {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking in the same tick can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ── Console report columns: the rows currently shown in each section ─────────

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
  { title: 'Signed up', value: (user) => iso(user.createdAt) },
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
