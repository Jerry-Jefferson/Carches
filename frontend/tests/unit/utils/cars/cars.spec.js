import { describe, it, expect } from 'vitest'

import { carName } from '@/utils/cars/carDisplay'
import {
  CAR_STATUS,
  CAR_STATUS_META,
  carStatusMeta,
  countCarsByStatus,
} from '@/utils/cars/carStatus'
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  countByBrand,
  effectiveSort,
  filterCars,
  filtersFromQuery,
  filtersToQuery,
  sortCars,
} from '@/utils/cars/fleetCatalog'
import { fuelTone } from '@/utils/cars/fuelLevel'
import { ALL } from '@/utils/common/collections'

const car = (id, brand, model, overrides = {}) => ({
  _id: id,
  productionInfo: { brand, model, year: 2020 },
  registrationNumber: `${id.toUpperCase()}-7`,
  status: 'free',
  fuelLevel: 50,
  mileage: 10000,
  ...overrides,
})

const CARS = [
  car('a', 'Toyota', 'Camry', { fuelLevel: 80, mileage: 30000 }),
  car('b', 'BMW', 'X5', { status: 'in_use', fuelLevel: 20 }),
  car('c', 'Toyota', 'Corolla', {
    status: 'reserved',
    productionInfo: { brand: 'Toyota', model: 'Corolla', year: 2023 },
  }),
  car('d', 'Audi', 'A4', { fuelLevel: 35, mileage: 5000 }),
]

const filters = (overrides = {}) => ({ ...DEFAULT_FILTERS, ...overrides })

describe('filtersFromQuery / filtersToQuery', () => {
  it('uses the defaults for an empty query and writes nothing back', () => {
    expect(filtersFromQuery({})).toEqual(DEFAULT_FILTERS)
    expect(filtersToQuery(DEFAULT_FILTERS)).toEqual({})
    expect(filtersToQuery({})).toEqual({})
  })

  it('round-trips every filter', () => {
    const query = {
      q: 'cam',
      brand: 'Toyota',
      available: '0',
      status: 'reserved',
      fuel: '40',
      sort: 'year',
    }

    const parsed = filtersFromQuery(query)

    expect(parsed).toEqual({
      q: 'cam',
      brand: 'Toyota',
      availableOnly: false,
      status: 'reserved',
      minFuel: 40,
      sort: 'year',
    })
    expect(filtersToQuery(parsed)).toEqual(query)
  })

  it('ignores unknown values and clamps the fuel to 5 % steps', () => {
    expect(filtersFromQuery({ status: 'stolen', sort: 'price', fuel: '250' })).toMatchObject({
      status: ALL,
      sort: '',
      minFuel: 100,
    })
    expect(filtersFromQuery({ fuel: 'abc' }).minFuel).toBe(0)
    expect(filtersFromQuery({ fuel: '42' }).minFuel).toBe(40)
  })

  it('drops the status when "Available only" is on', () => {
    expect(filtersToQuery(filters({ status: 'reserved' }))).toEqual({})
  })

  it('counts the secondary filters for the mobile badge', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0)
    expect(
      countActiveFilters(
        filters({ availableOnly: false, status: 'in_use', minFuel: 20, sort: 'year' }),
      ),
    ).toBe(4)
  })
})

describe('filterCars', () => {
  const ids = (cars) => cars.map((item) => item._id)

  it('shows only free cars by default', () => {
    expect(ids(filterCars(CARS, DEFAULT_FILTERS))).toEqual(['a', 'd'])
  })

  it('filters by status when "Available only" is off', () => {
    expect(ids(filterCars(CARS, filters({ availableOnly: false })))).toEqual(['a', 'b', 'c', 'd'])
    expect(ids(filterCars(CARS, filters({ availableOnly: false, status: 'in_use' })))).toEqual([
      'b',
    ])
  })

  it('searches brand, model and plate case-insensitively', () => {
    const all = { availableOnly: false }
    expect(ids(filterCars(CARS, filters({ ...all, q: 'toyota' })))).toEqual(['a', 'c'])
    expect(ids(filterCars(CARS, filters({ ...all, q: 'corol' })))).toEqual(['c'])
    expect(ids(filterCars(CARS, filters({ ...all, q: 'b-7' })))).toEqual(['b'])
  })

  it('filters by brand and minimum fuel', () => {
    expect(ids(filterCars(CARS, filters({ brand: 'Toyota' })))).toEqual(['a'])
    expect(ids(filterCars(CARS, filters({ minFuel: 40 })))).toEqual(['a'])
  })

  it('can ignore one filter, for pill counts', () => {
    const result = filterCars(CARS, filters({ brand: 'BMW' }), { ignore: 'brand' })
    expect(countByBrand(result)).toEqual({ Audi: 1, Toyota: 1 })
  })
})

describe('sortCars', () => {
  const ids = (cars) => cars.map((item) => item._id)

  it('sorts by fuel, year and mileage without mutating the input', () => {
    const input = [...CARS]
    expect(ids(sortCars(input, 'fuel'))).toEqual(['a', 'c', 'd', 'b'])
    expect(ids(sortCars(input, 'year'))[0]).toBe('c')
    expect(ids(sortCars(input, 'mileage'))).toEqual(['d', 'b', 'c', 'a'])
    expect(input).toEqual(CARS)
  })

  it('sorts by distance and puts cars without one last', () => {
    expect(ids(sortCars(CARS, 'distance', { a: 900, b: 100, d: 400 }))).toEqual([
      'b',
      'd',
      'a',
      'c',
    ])
  })

  it('picks distance by default only when the location is known', () => {
    expect(effectiveSort('', true)).toBe('distance')
    expect(effectiveSort('', false)).toBe('fuel')
    expect(effectiveSort('distance', false)).toBe('fuel')
    expect(effectiveSort('year', true)).toBe('year')
  })
})

describe('counts', () => {
  it('counts brands alphabetically and every status', () => {
    expect(Object.keys(countByBrand(CARS))).toEqual(['Audi', 'BMW', 'Toyota'])
    expect(countCarsByStatus(CARS)).toEqual({
      free: 2,
      reserved: 1,
      in_use: 1,
      unavailable: 0,
      in_service: 0,
    })
  })
})

describe('car status metadata', () => {
  it('covers every backend car status', () => {
    expect(Object.keys(CAR_STATUS_META).sort()).toEqual(Object.values(CAR_STATUS).sort())
  })

  it.each([
    ['free', 'Available', 'success'],
    ['reserved', 'Reserved', 'warning'],
    ['in_use', 'In trip', 'info'],
    ['unavailable', 'Unavailable', 'muted'],
    ['in_service', 'In service', 'destructive'],
  ])('car status %s → %s (%s)', (status, label, tone) => {
    expect(carStatusMeta(status)).toMatchObject({ label, tone })
    expect(carStatusMeta(status).icon).toBeTruthy()
  })

  it('falls back for unknown statuses', () => {
    expect(carStatusMeta('teleported')).toMatchObject({ label: 'Unknown', tone: 'muted' })
  })
})

describe('fuelTone', () => {
  it.each([
    [0, 'destructive'],
    [24, 'destructive'],
    [25, 'warning'],
    [39, 'warning'],
    [40, 'success'],
    [100, 'success'],
  ])('%d %% → %s', (level, tone) => {
    expect(fuelTone(level)).toBe(tone)
  })
})

describe('carName', () => {
  const car = { productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 } }

  it('joins brand and model, optionally the year', () => {
    expect(carName(car)).toBe('Toyota Camry')
    expect(carName(car, { withYear: true })).toBe('Toyota Camry 2023')
  })

  it('handles unpopulated or missing production info', () => {
    expect(carName({ productionInfo: '665f1c2e9b1e8a0012345678' })).toBe('Unknown car')
    expect(carName({})).toBe('Unknown car')
    expect(carName(null)).toBe('Unknown car')
  })
})
