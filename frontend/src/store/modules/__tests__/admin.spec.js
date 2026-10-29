import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'

import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import * as usersApi from '@/api/users'
import { resetOnSignOut } from '@/store'
import admin from '../admin'
import { CAR_UPDATE_FAILED } from '../admin/trips'
import auth from '../auth'
import bookings from '../bookings'
import cars from '../cars'
import geo from '../geo'

vi.mock('@/api/cars', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  listInUseLowFuel: vi.fn(),
  listReserved: vi.fn(),
  sendOldOrWornToService: vi.fn(),
  relocateFrequentlyBooked: vi.fn(),
}))
vi.mock('@/api/bookings', () => ({
  listMine: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@/api/users', () => ({
  getMe: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

const CAR = {
  _id: 'car1',
  vin: 'VIN1',
  status: 'in_use',
  fuelLevel: 50,
  mileage: 1000,
  productionInfo: { brand: 'Kia', model: 'Rio', year: 2020 },
}
const TRIP = {
  _id: 'b1',
  userId: { _id: 'u1', firstName: 'Hanna' },
  carId: { _id: 'car1', vin: 'VIN1' },
  startDate: '2026-10-29T08:00:00Z',
  endDate: null,
}
const USER = { _id: 'u1', firstName: 'Hanna', role: 'user', createdAt: '2026-10-01T00:00:00Z' }

const makeStore = () =>
  createStore({
    strict: true,
    modules: { admin, auth, bookings, cars, geo },
    plugins: [resetOnSignOut],
  })

const loaded = async () => {
  const store = makeStore()
  await store.dispatch('admin/loadAll')
  return store
}

describe('admin store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(carsApi.list).mockResolvedValue([CAR])
    vi.mocked(usersApi.list).mockResolvedValue([USER])
    vi.mocked(bookingsApi.list).mockResolvedValue([TRIP])
    vi.mocked(carsApi.listInUseLowFuel).mockResolvedValue([])
    vi.mocked(carsApi.listReserved).mockResolvedValue([])
  })

  it('loadAll loads cars, users, bookings and the widgets', async () => {
    const store = await loaded()

    expect(store.state.cars.items).toEqual([CAR])
    expect(store.state.admin.users.items).toEqual([USER])
    expect(store.state.admin.trips.items).toEqual([TRIP])
    expect(carsApi.listReserved).toHaveBeenCalledWith(false)
    expect(store.getters['admin/insights/kpis'].rentals.active).toBe(1)
    expect(store.getters['admin/users/tripCounts']).toEqual({ u1: { total: 1, completed: 0 } })
  })

  it('loadAll reports the first failure without stopping the rest', async () => {
    vi.mocked(usersApi.list).mockRejectedValue(new Error('You do not have permission'))
    const store = makeStore()

    await expect(store.dispatch('admin/loadAll')).resolves.toBe('You do not have permission')
    expect(store.state.admin.trips.items).toEqual([TRIP])
    expect(store.state.admin.users.error).toBe('You do not have permission')
  })

  it('createCar reloads the fleet because the response is not populated', async () => {
    const store = await loaded()
    vi.mocked(carsApi.create).mockResolvedValue({ _id: 'car2' })

    await store.dispatch('admin/fleet/createCar', { vin: 'NEW' })

    expect(carsApi.create).toHaveBeenCalledWith({ vin: 'NEW' })
    expect(carsApi.list).toHaveBeenCalledTimes(2)
    expect(store.state.admin.fleet.isMutating).toBe(false)
  })

  it('updateCar and deleteCar keep the fleet list in sync', async () => {
    const store = await loaded()
    vi.mocked(carsApi.update).mockResolvedValue({ ...CAR, mileage: 2000 })

    await store.dispatch('admin/fleet/updateCar', { vin: 'VIN1', changes: { mileage: 2000 } })
    expect(store.getters['cars/byId']('car1').mileage).toBe(2000)

    await store.dispatch('admin/fleet/deleteCar', CAR)
    expect(carsApi.remove).toHaveBeenCalledWith('VIN1')
    expect(store.state.cars.items).toEqual([])
  })

  it('completeTrip ends the booking, then updates the car by VIN', async () => {
    const store = await loaded()
    const ended = { ...TRIP, endDate: '2026-10-29T09:00:00Z' }
    vi.mocked(bookingsApi.update).mockResolvedValue(ended)
    vi.mocked(carsApi.update).mockResolvedValue({ ...CAR, status: 'free' })
    const location = { type: 'Point', coordinates: [27.5, 53.9] }

    await store.dispatch('admin/trips/completeTrip', {
      trip: TRIP,
      endDate: ended.endDate,
      finishFuelLevel: 40,
      finishMileage: 1031,
      location,
    })

    expect(bookingsApi.update).toHaveBeenCalledWith('b1', {
      endDate: ended.endDate,
      finishFuelLevel: 40,
      finishMileage: 1031,
    })
    expect(carsApi.update).toHaveBeenCalledWith('VIN1', {
      fuelLevel: 40,
      mileage: 1031,
      location,
    })
    expect(store.getters['admin/trips/byId']('b1').endDate).toBe(ended.endDate)
  })

  it('completeTrip reports a failed car update so it can be retried', async () => {
    const store = await loaded()
    vi.mocked(bookingsApi.update).mockResolvedValue({ ...TRIP, endDate: '2026-10-29T09:00:00Z' })
    vi.mocked(carsApi.update).mockRejectedValueOnce(new Error('Invalid input data.'))

    const error = await store
      .dispatch('admin/trips/completeTrip', {
        trip: TRIP,
        endDate: '2026-10-29T09:00:00Z',
        finishFuelLevel: 40,
        finishMileage: 1031,
      })
      .catch((err) => err)

    expect(error).toMatchObject({
      code: CAR_UPDATE_FAILED,
      vin: 'VIN1',
      changes: { fuelLevel: 40, mileage: 1031 },
    })

    vi.mocked(carsApi.update).mockResolvedValue({ ...CAR, status: 'free' })
    await store.dispatch('admin/trips/retryCarUpdate', error)
    expect(carsApi.update).toHaveBeenCalledTimes(2)
  })

  it('deleteTrip can free the car (Q8)', async () => {
    const store = await loaded()
    vi.mocked(carsApi.update).mockResolvedValue({ ...CAR, status: 'free' })

    await store.dispatch('admin/trips/deleteTrip', { trip: TRIP, freeCar: true })

    expect(bookingsApi.remove).toHaveBeenCalledWith('b1')
    expect(carsApi.update).toHaveBeenCalledWith('VIN1', { status: 'free' })
    expect(store.state.admin.trips.items).toEqual([])
  })

  it('updateUser refreshes the session copy when admins edit themselves', async () => {
    const store = await loaded()
    store.commit('auth/SET_SESSION', { user: USER, token: 't', remember: false })
    vi.mocked(usersApi.update).mockResolvedValue({ ...USER, firstName: 'Anna' })

    await store.dispatch('admin/users/updateUser', { id: 'u1', changes: { firstName: 'Anna' } })

    expect(store.state.admin.users.items[0].firstName).toBe('Anna')
    expect(store.state.auth.user.firstName).toBe('Anna')
  })

  it('sendToService returns the update result and reloads the fleet', async () => {
    const store = await loaded()
    vi.mocked(carsApi.sendOldOrWornToService).mockResolvedValue({ modifiedCount: 3 })

    await expect(store.dispatch('admin/fleet/sendToService')).resolves.toEqual({ modifiedCount: 3 })
    expect(carsApi.list).toHaveBeenCalledTimes(2)
  })

  it('forgets admin data when the session ends', async () => {
    const store = await loaded()

    store.commit('auth/CLEAR_SESSION')

    expect(store.state.admin.users.items).toEqual([])
    expect(store.state.admin.trips.items).toEqual([])
  })
})
