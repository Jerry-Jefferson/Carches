import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'

import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import { resetOnSignOut } from '@/store'
import auth from '../auth'
import bookings, { BOOKING_BLOCK } from '../bookings'
import cars from '../cars'
import geo from '../geo'

vi.mock('@/api/bookings', () => ({ listMine: vi.fn(), create: vi.fn() }))
vi.mock('@/api/cars', () => ({ list: vi.fn(), getById: vi.fn() }))

const HOUR = 3600000
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString()

const FREE_CAR = { _id: 'car1', status: 'free', fuelLevel: 82, mileage: 18420 }
const COMPLETED = { _id: 'b1', startDate: iso(-5 * HOUR), endDate: iso(-4 * HOUR) }
const ACTIVE = { _id: 'b2', startDate: iso(-HOUR), endDate: null }
const UPCOMING = { _id: 'b3', startDate: iso(HOUR), endDate: null }

const apiError = (message) => Object.assign(new Error(message), { response: { data: { message } } })

const makeStore = () =>
  createStore({ strict: true, modules: { auth, bookings, cars, geo }, plugins: [resetOnSignOut] })

describe('bookings module', () => {
  beforeEach(() => {
    vi.mocked(bookingsApi.listMine).mockReset()
    vi.mocked(bookingsApi.create).mockReset()
    vi.mocked(carsApi.getById).mockReset()
    vi.mocked(carsApi.list).mockReset()
    vi.mocked(carsApi.list).mockResolvedValue([])
  })

  it('fetchMine stores the bookings, caches them and derives statuses', async () => {
    vi.mocked(bookingsApi.listMine).mockResolvedValue([UPCOMING, ACTIVE, COMPLETED])
    const store = makeStore()

    await store.dispatch('bookings/fetchMine')
    await store.dispatch('bookings/fetchMine')

    expect(bookingsApi.listMine).toHaveBeenCalledTimes(1)
    expect(store.getters['bookings/activeTrips']).toEqual([ACTIVE])
    expect(store.getters['bookings/upcoming']).toEqual([UPCOMING])
    expect(store.getters['bookings/completed']).toEqual([COMPLETED])
    expect(store.getters['bookings/openBooking']).toEqual(ACTIVE)
  })

  it('fetchMine stores the backend error and re-throws', async () => {
    const error = apiError('Invalid token')
    vi.mocked(bookingsApi.listMine).mockRejectedValue(error)
    const store = makeStore()

    await expect(store.dispatch('bookings/fetchMine')).rejects.toBe(error)
    expect(store.state.bookings.error).toBe('Invalid token')
  })

  describe('checkBookable', () => {
    it('returns the fresh car and puts it into the cars list', async () => {
      vi.mocked(carsApi.getById).mockResolvedValue({ ...FREE_CAR, status: 'in_use' })
      vi.mocked(bookingsApi.listMine).mockResolvedValue([])
      const store = makeStore()

      const result = await store.dispatch('bookings/checkBookable', { carId: 'car1' })

      expect(carsApi.getById).toHaveBeenCalledWith('car1')
      expect(result.block).toBe(BOOKING_BLOCK.CAR_UNAVAILABLE)
      expect(store.getters['cars/byId']('car1').status).toBe('in_use')
    })

    it('blocks a user who already has an upcoming booking', async () => {
      vi.mocked(carsApi.getById).mockResolvedValue(FREE_CAR)
      vi.mocked(bookingsApi.listMine).mockResolvedValue([UPCOMING])
      const store = makeStore()

      const { block } = await store.dispatch('bookings/checkBookable', { carId: 'car1' })

      expect(block).toBe(BOOKING_BLOCK.OPEN_BOOKING)
    })
  })

  describe('createBooking', () => {
    it('sends only the whitelisted fields, with start values from the fresh car', async () => {
      vi.mocked(carsApi.getById).mockResolvedValue(FREE_CAR)
      vi.mocked(bookingsApi.listMine).mockResolvedValue([COMPLETED])
      vi.mocked(bookingsApi.create).mockResolvedValue({ _id: 'new' })
      const store = makeStore()

      const booking = await store.dispatch('bookings/createBooking', { carId: 'car1' })

      expect(booking).toEqual({ _id: 'new' })
      const payload = vi.mocked(bookingsApi.create).mock.calls[0][0]
      expect(Object.keys(payload).sort()).toEqual(
        ['carId', 'startDate', 'startFuelLevel', 'startMileage'].sort(),
      )
      expect(payload).toMatchObject({ carId: 'car1', startFuelLevel: 82, startMileage: 18420 })
      expect(Math.abs(new Date(payload.startDate) - Date.now())).toBeLessThan(5000)
      expect(store.state.bookings.isSubmitting).toBe(false)
    })

    it('re-checks the bookings even when they are cached', async () => {
      vi.mocked(carsApi.getById).mockResolvedValue(FREE_CAR)
      vi.mocked(bookingsApi.listMine).mockResolvedValueOnce([]).mockResolvedValueOnce([ACTIVE])
      const store = makeStore()
      await store.dispatch('bookings/fetchMine')

      const promise = store.dispatch('bookings/createBooking', { carId: 'car1' })

      await expect(promise).rejects.toMatchObject({
        code: BOOKING_BLOCK.OPEN_BOOKING,
        message: 'You already have an active trip.',
      })
      expect(bookingsApi.create).not.toHaveBeenCalled()
    })

    it('aborts when the car is no longer free', async () => {
      vi.mocked(carsApi.getById).mockResolvedValue({ ...FREE_CAR, status: 'reserved' })
      vi.mocked(bookingsApi.listMine).mockResolvedValue([])
      const store = makeStore()

      await expect(
        store.dispatch('bookings/createBooking', { carId: 'car1' }),
      ).rejects.toMatchObject({ code: BOOKING_BLOCK.CAR_UNAVAILABLE })
      expect(bookingsApi.create).not.toHaveBeenCalled()
      expect(store.state.bookings.error).toBe('This car is no longer available.')
    })

    it('stores the backend error from POST /bookings', async () => {
      const error = apiError('Invalid input data. Start fuel level is required')
      vi.mocked(carsApi.getById).mockResolvedValue(FREE_CAR)
      vi.mocked(bookingsApi.listMine).mockResolvedValue([])
      vi.mocked(bookingsApi.create).mockRejectedValue(error)
      const store = makeStore()

      await expect(store.dispatch('bookings/createBooking', { carId: 'car1' })).rejects.toBe(error)
      expect(store.state.bookings.error).toBe(error.message)
      expect(store.state.bookings.isSubmitting).toBe(false)
    })
  })

  it('forgets the bookings when the session ends', async () => {
    vi.mocked(bookingsApi.listMine).mockResolvedValue([ACTIVE])
    const store = makeStore()
    await store.dispatch('bookings/fetchMine')

    store.commit('auth/CLEAR_SESSION')

    expect(store.state.bookings.mine).toEqual([])
    expect(store.state.bookings.loadedAt).toBeNull()
  })
})
