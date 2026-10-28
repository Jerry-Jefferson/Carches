import { describe, it, expect, vi, beforeEach } from 'vitest'

import http from '@/api/http'
import * as authApi from '@/api/auth'
import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import * as usersApi from '@/api/users'

vi.mock('@/api/http', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const ID = '665f1c2e9b1e8a0012a1b2c3'
const VIN = 'JTDBR32E720123456'

// [endpoint, call, method, expected http arguments]
const ENDPOINTS = [
  [
    'E1',
    () =>
      authApi.signUp({
        email: 'a@b.by',
        password: 'p',
        firstName: 'A',
        lastName: 'B',
        licenseNumber: 'MP123456',
        role: 'admin',
      }),
    'post',
    [
      '/auth/signup',
      { email: 'a@b.by', password: 'p', firstName: 'A', lastName: 'B', licenseNumber: 'MP123456' },
    ],
  ],
  [
    'E2',
    () => authApi.signIn({ email: 'a@b.by', password: 'p', remember: true }),
    'post',
    ['/auth/signin', { email: 'a@b.by', password: 'p' }],
  ],
  ['E3', () => authApi.logout(), 'post', ['/auth/logout', null, { skipAuthRedirect: true }]],
  ['E4', () => usersApi.getMe(), 'get', ['/users/me', undefined]],
  ['E5', () => usersApi.list(), 'get', ['/users']],
  ['E6', () => usersApi.getById(ID), 'get', [`/users/${ID}`]],
  [
    'E7',
    () => usersApi.update(ID, { firstName: 'Vera', role: 'admin', password: 'x' }),
    'put',
    [`/users/${ID}`, { firstName: 'Vera' }],
  ],
  ['E8', () => usersApi.remove(ID), 'delete', [`/users/${ID}`]],
  ['E9', () => carsApi.list(), 'get', ['/cars']],
  ['E10', () => carsApi.getById(ID), 'get', [`/cars/${ID}`]],
  ['E11', () => carsApi.create({ vin: VIN }), 'post', ['/cars', { vin: VIN }]],
  ['E12', () => carsApi.update(VIN, { mileage: 1 }), 'put', [`/cars/${VIN}`, { mileage: 1 }]],
  ['E13', () => carsApi.remove(VIN), 'delete', [`/cars/${VIN}`]],
  ['E14', () => carsApi.listInUseLowFuel(), 'get', ['/cars/in-use/low-fuel']],
  [
    'E15',
    () => carsApi.listReserved(false),
    'get',
    ['/cars/reserved', { params: { authorized: 'false' } }],
  ],
  ['E16', () => carsApi.sendOldOrWornToService(), 'put', ['/cars/service-old-or-high-mileage']],
  ['E17', () => carsApi.relocateFrequentlyBooked(), 'put', ['/cars/relocate-frequently-booked']],
  ['E18', () => bookingsApi.listMine(), 'get', ['/bookings/my']],
  ['E19', () => bookingsApi.list(), 'get', ['/bookings']],
  ['E20', () => bookingsApi.getById(ID), 'get', [`/bookings/${ID}`]],
  ['E21', () => bookingsApi.create({ carId: ID }), 'post', ['/bookings', { carId: ID }]],
  [
    'E22',
    () => bookingsApi.update(ID, { endDate: 'x' }),
    'put',
    [`/bookings/${ID}`, { endDate: 'x' }],
  ],
  ['E23', () => bookingsApi.remove(ID), 'delete', [`/bookings/${ID}`]],
]

describe('API modules', () => {
  beforeEach(() => {
    for (const method of ['get', 'post', 'put', 'delete']) {
      vi.mocked(http[method]).mockReset()
      vi.mocked(http[method]).mockResolvedValue({ data: { message: 'ok', data: { ok: true } } })
    }
  })

  it('covers all 23 backend endpoints', () => {
    expect(ENDPOINTS.map(([id]) => id)).toEqual(Array.from({ length: 23 }, (_, i) => `E${i + 1}`))
  })

  it.each(ENDPOINTS)('%s calls the right method and path', async (_, call, method, args) => {
    await call()
    // JSON drops undefined fields, so compare the request body as JSON would send it
    const [url, body, ...rest] = vi.mocked(http[method]).mock.calls[0]
    const sent = [url, body === undefined ? body : JSON.parse(JSON.stringify(body)), ...rest]
    expect(sent.slice(0, args.length)).toEqual(args)
  })

  it('unwraps the data envelope', async () => {
    await expect(carsApi.list()).resolves.toEqual({ ok: true })
  })

  it('encodes the VIN in the path', async () => {
    await carsApi.update('A B/C', {})
    expect(http.put).toHaveBeenCalledWith('/cars/A%20B%2FC', {})
  })
})
