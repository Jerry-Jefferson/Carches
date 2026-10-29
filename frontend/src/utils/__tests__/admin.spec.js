import { describe, it, expect } from 'vitest'

import {
  ALL,
  DEFAULT_FLEET_FILTERS,
  DEFAULT_TRIP_FILTERS,
  DEFAULT_USER_FILTERS,
  dayStats,
  filterAdminCars,
  filterTrips,
  filterUsers,
  refId,
  relocationCandidates,
  searchConsole,
  serviceCandidates,
  tripCountsByUser,
  tripsStartedPerDay,
  userStats,
  utilisation,
} from '../admin'
import { FLEET_COLUMNS, csvFilename, tripColumns } from '../adminExport'
import { toCsv } from '../csv'
import { dayKey, formatRelative } from '../format'

const HOUR = 3600000
const DAY = 24 * HOUR
// 29 Oct 2026, 12:00 in Minsk (UTC+3)
const NOW = Date.parse('2026-10-29T09:00:00Z')

const car = (id, overrides = {}) => ({
  _id: id,
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2020 },
  registrationNumber: `${id.toUpperCase()} AB-7`,
  vin: `VIN${id.toUpperCase()}`,
  status: 'free',
  mileage: 10000,
  ...overrides,
})

const CARS = [
  car('a'),
  car('b', { status: 'in_use', productionInfo: { brand: 'BMW', model: 'X5', year: 2015 } }),
  car('c', { status: 'in_service', mileage: 120000 }),
  car('d', { status: 'unavailable' }),
]

const trip = (id, overrides = {}) => ({
  _id: id,
  userId: { _id: 'u1', firstName: 'Hanna', lastName: 'Paulava', email: 'hanna@carshes.test' },
  carId: { _id: 'a', registrationNumber: 'A AB-7', vin: 'VINA' },
  startDate: new Date(NOW - 3 * HOUR).toISOString(),
  endDate: null,
  ...overrides,
})

describe('admin helpers', () => {
  it('refId reads populated and bare references', () => {
    expect(refId({ _id: 'x' })).toBe('x')
    expect(refId('y')).toBe('y')
    expect(refId(null)).toBeNull()
  })

  it('utilisation counts in-trip cars among rentable ones', () => {
    // 1 in trip of 2 rentable (in service and unavailable excluded)
    expect(utilisation(CARS)).toBe(50)
    expect(utilisation([])).toBe(0)
  })

  it('counts trips started per Minsk day for the last 7 days', () => {
    const trips = [
      trip('1', { startDate: '2026-10-28T22:30:00Z' }), // 29 Oct 01:30 in Minsk
      trip('2', { startDate: '2026-10-28T20:00:00Z' }), // 28 Oct 23:00 in Minsk
      trip('3', { startDate: '2026-10-20T10:00:00Z' }), // outside the window
    ]
    const days = tripsStartedPerDay(trips, { now: NOW })

    expect(days).toHaveLength(7)
    expect(days.at(0).day).toBe('2026-10-23')
    expect(days.at(-1)).toEqual({ day: '2026-10-29', count: 1 })
    expect(days.at(-2)).toEqual({ day: '2026-10-28', count: 1 })
  })

  it('dayStats sums trips finished on a day and compares with the day before', () => {
    const trips = [
      trip('1', { endDate: '2026-10-29T07:00:00Z', startMileage: 100, finishMileage: 130 }),
      trip('2', { endDate: '2026-10-29T08:00:00Z', startMileage: 10, finishMileage: 22 }),
      trip('3', { endDate: '2026-10-28T08:00:00Z' }),
      trip('4', { startDate: new Date(NOW + HOUR).toISOString() }),
    ]

    expect(dayStats(trips, '2026-10-29', NOW)).toEqual({
      completed: 2,
      previous: 1,
      distance: 42,
      upcoming: 1,
    })
  })

  it('userStats counts new users and admins', () => {
    const users = [
      { role: 'admin', createdAt: new Date(NOW - 30 * DAY).toISOString() },
      { role: 'user', createdAt: new Date(NOW - 2 * DAY).toISOString() },
    ]
    expect(userStats(users, NOW)).toEqual({ total: 2, newThisWeek: 1, admins: 1 })
  })

  it('tripCountsByUser counts total and completed trips', () => {
    const counts = tripCountsByUser([trip('1'), trip('2', { endDate: '2026-10-29T08:00:00Z' })])
    expect(counts).toEqual({ u1: { total: 2, completed: 1 } })
  })

  it('previews the maintenance actions with the backend rules', () => {
    expect(serviceCandidates(CARS).map((item) => item._id)).toEqual(['b', 'c'])

    const trips = ['1', '2', '3'].map((id) => trip(id))
    const busy = ['1', '2', '3'].map((id) => trip(`b${id}`, { carId: 'b' }))
    expect(relocationCandidates(CARS, [...trips, ...busy]).map((item) => item._id)).toEqual(['a'])
    expect(relocationCandidates(CARS, trips.slice(0, 2))).toEqual([])
  })

  it('filters the fleet by search, brand, status and year range', () => {
    const filter = (partial) =>
      filterAdminCars(CARS, { ...DEFAULT_FLEET_FILTERS, ...partial }).map((item) => item._id)

    expect(filter({ q: 'vinb' })).toEqual(['b'])
    expect(filter({ q: 'x5' })).toEqual(['b'])
    expect(filter({ brand: 'Toyota', status: 'free' })).toEqual(['a'])
    expect(filter({ yearFrom: 2016 })).toEqual(['a', 'c', 'd'])
    expect(filter({ yearTo: 2016 })).toEqual(['b'])
    expect(
      filterAdminCars(CARS, { ...DEFAULT_FLEET_FILTERS, status: 'free' }, { ignore: 'status' }),
    ).toHaveLength(4)
  })

  it('filters trips by status, text and the selected day', () => {
    const trips = [
      trip('1'),
      trip('2', { endDate: '2026-10-25T08:00:00Z', startDate: '2026-10-25T07:00:00Z' }),
    ]
    const carsById = { a: CARS[0] }
    const filter = (partial) =>
      filterTrips(
        trips,
        { ...DEFAULT_TRIP_FILTERS, ...partial },
        { carsById, day: '2026-10-29', now: NOW },
      ).map((item) => item._id)

    expect(filter({ status: 'completed' })).toEqual(['2'])
    expect(filter({ q: 'camry' })).toEqual(['1', '2'])
    expect(filter({ q: 'hanna@' })).toEqual(['1', '2'])
    expect(filter({ dateOnly: true })).toEqual(['1'])
    expect(filter({ status: ALL, q: 'nobody' })).toEqual([])
  })

  it('filters users by role and text, and searches the console', () => {
    const users = [
      {
        _id: 'u1',
        firstName: 'Hanna',
        lastName: 'Paulava',
        email: 'h@x.by',
        licenseNumber: 'AB123456',
        role: 'user',
      },
      {
        _id: 'u2',
        firstName: 'Admin',
        lastName: 'Root',
        email: 'admin@x.by',
        licenseNumber: 'ADMIN0001',
        role: 'admin',
      },
    ]
    expect(filterUsers(users, { ...DEFAULT_USER_FILTERS, role: 'admin' })).toEqual([users[1]])
    expect(filterUsers(users, { ...DEFAULT_USER_FILTERS, q: 'ab1234' })).toEqual([users[0]])

    const results = searchConsole('a ab', { cars: CARS, users })
    expect(results.cars.map((item) => item._id)).toEqual(['a'])
    expect(searchConsole('  ', { cars: CARS, users })).toEqual({ cars: [], users: [] })
  })

  it('exports the fleet and trips as CSV', () => {
    const csv = toCsv([CARS[0]], FLEET_COLUMNS)
    expect(csv).toContain('Brand,Model,Year,Registration number,VIN,Status')
    expect(csv).toContain('Toyota,Camry,2020,A AB-7,VINA,Available')

    const tripCsv = toCsv([trip('1')], tripColumns({ carsById: { a: CARS[0] }, now: NOW }))
    expect(tripCsv).toContain('1,Hanna Paulava,hanna@carshes.test,Toyota Camry,A AB-7,Active')
    expect(csvFilename('fleet', '2026-10-29')).toBe('carshes-fleet-2026-10-29.csv')
  })
})

describe('dayKey and formatRelative', () => {
  it('dayKey uses the Minsk calendar day', () => {
    expect(dayKey('2026-10-28T21:30:00Z')).toBe('2026-10-29')
    expect(dayKey(null)).toBeNull()
  })

  it('formatRelative prints the largest whole unit', () => {
    expect(formatRelative(NOW - 30 * 1000, NOW)).toBe('just now')
    expect(formatRelative(NOW - 5 * 60000, NOW)).toBe('5 minutes ago')
    expect(formatRelative(NOW - DAY, NOW)).toBe('yesterday')
    expect(formatRelative(NOW - 3 * DAY, NOW)).toBe('3 days ago')
    expect(formatRelative(null, NOW)).toBe('—')
  })
})
