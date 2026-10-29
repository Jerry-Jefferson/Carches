// Fleet catalogue filters: defaults, URL query ⇄ filters, and the client-side
// filtering / sorting over GET /cars (the API has no search or filters, Q13).

import { CAR_STATUS } from './derive'
import { carName } from './format'

export const ALL = 'all'

export const SORTS = Object.freeze({
  DISTANCE: 'distance',
  FUEL: 'fuel',
  YEAR: 'year',
  MILEAGE: 'mileage',
})

export const SORT_OPTIONS = Object.freeze([
  { value: SORTS.DISTANCE, label: 'Distance to you' },
  { value: SORTS.FUEL, label: 'Fuel level' },
  { value: SORTS.YEAR, label: 'Newest first' },
  { value: SORTS.MILEAGE, label: 'Lowest mileage' },
])

// `sort: ''` means "default": distance when the user's location is known, otherwise fuel
export const DEFAULT_FILTERS = Object.freeze({
  q: '',
  brand: ALL,
  availableOnly: true,
  status: ALL,
  minFuel: 0,
  sort: '',
})

const STATUSES = Object.values(CAR_STATUS)
const SORT_VALUES = Object.values(SORTS)

const first = (value) => (Array.isArray(value) ? value[0] : value)
const text = (value) => (typeof first(value) === 'string' ? first(value).trim() : '')

const clampFuel = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(100, Math.max(0, Math.round(number / 5) * 5))
}

// Route query → filters. Unknown or malformed values fall back to the defaults.
export const filtersFromQuery = (query = {}) => {
  const status = text(query.status)
  const sort = text(query.sort)
  return {
    q: text(query.q),
    brand: text(query.brand) || ALL,
    availableOnly: text(query.available) !== '0',
    status: STATUSES.includes(status) ? status : ALL,
    minFuel: clampFuel(text(query.fuel) || 0),
    sort: SORT_VALUES.includes(sort) ? sort : '',
  }
}

// Filters (complete or partial) → route query; default values are left out to keep URLs short
export const filtersToQuery = (partial = {}) => {
  const filters = { ...DEFAULT_FILTERS, ...partial }
  const query = {}
  if (filters.q?.trim()) query.q = filters.q.trim()
  if (filters.brand && filters.brand !== ALL) query.brand = filters.brand
  if (!filters.availableOnly) {
    query.available = '0'
    if (filters.status && filters.status !== ALL) query.status = filters.status
  }
  if (filters.minFuel > 0) query.fuel = String(filters.minFuel)
  if (filters.sort) query.sort = filters.sort
  return query
}

// Filters shown in the secondary panel (mobile drawer badge)
export const countActiveFilters = (filters) =>
  [
    !filters.availableOnly,
    !filters.availableOnly && filters.status !== ALL,
    filters.minFuel > 0,
    Boolean(filters.sort),
  ].filter(Boolean).length

export const carBrand = (car) => car?.productionInfo?.brand ?? ''

const matchesSearch = (car, q) => {
  if (!q) return true
  const needle = q.toLowerCase()
  return [carName(car), car.registrationNumber, car.productionInfo?.model]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(needle))
}

const matchesStatus = (car, { availableOnly, status }) => {
  if (availableOnly) return car.status === CAR_STATUS.FREE
  return status === ALL || car.status === status
}

// `ignore` skips one filter, so brand pill counts can respect all the others
export const filterCars = (cars, filters, { ignore = null } = {}) =>
  cars.filter(
    (car) =>
      matchesSearch(car, filters.q) &&
      (ignore === 'brand' || filters.brand === ALL || carBrand(car) === filters.brand) &&
      (ignore === 'status' || matchesStatus(car, filters)) &&
      (car.fuelLevel ?? 0) >= filters.minFuel,
  )

export const effectiveSort = (sort, hasLocation) => {
  if (sort === SORTS.DISTANCE && !hasLocation) return SORTS.FUEL
  return sort || (hasLocation ? SORTS.DISTANCE : SORTS.FUEL)
}

const ascending = (a, b) => (a ?? Infinity) - (b ?? Infinity)
const descending = (a, b) => (b ?? -Infinity) - (a ?? -Infinity)

const COMPARATORS = {
  [SORTS.DISTANCE]: (a, b, distances) => ascending(distances[a._id], distances[b._id]),
  [SORTS.FUEL]: (a, b) => descending(a.fuelLevel, b.fuelLevel),
  [SORTS.YEAR]: (a, b) => descending(a.productionInfo?.year, b.productionInfo?.year),
  [SORTS.MILEAGE]: (a, b) => ascending(a.mileage, b.mileage),
}

// Returns a new array; ties are broken by name, then plate, so the order is stable
export const sortCars = (cars, sort, distances = {}) => {
  const compare = COMPARATORS[sort] ?? COMPARATORS[SORTS.FUEL]
  return [...cars].sort(
    (a, b) =>
      compare(a, b, distances) ||
      carName(a).localeCompare(carName(b)) ||
      (a.registrationNumber ?? '').localeCompare(b.registrationNumber ?? ''),
  )
}

// { Toyota: 3, BMW: 1 }, brands sorted alphabetically
export const countByBrand = (cars) => {
  const counts = {}
  for (const car of cars) {
    const brand = carBrand(car)
    if (brand) counts[brand] = (counts[brand] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

export const countByStatus = (cars) => {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]))
  for (const car of cars) if (car.status in counts) counts[car.status] += 1
  return counts
}
