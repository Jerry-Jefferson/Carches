import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'

import * as bookingsApi from '@/services/bookings'
import * as carsApi from '@/services/cars'
import * as usersApi from '@/services/users'
import { resetOnSignOut } from '@/store'
import admin from '@/store/modules/admin/index'
import { CAR_UPDATE_FAILED } from '@/store/modules/admin/trips'
import { SELF_DELETE_MESSAGE } from '@/store/modules/admin/users'
import auth from '@/store/modules/auth'
import bookings from '@/store/modules/bookings'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'

vi.mock('@/services/cars', () => ({
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
vi.mock('@/services/bookings', () => ({
  listMine: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@/services/users', () => ({
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
    store.commit('auth/SET_SESSION', { user: USER, token: 't' })
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

  it('createTrip succeeds when only the reload after it fails (M10)', async () => {
    const store = await loaded()
    vi.mocked(bookingsApi.create).mockResolvedValue({ _id: 'new' })
    vi.mocked(bookingsApi.list).mockRejectedValueOnce(new Error('Network error.'))

    await expect(store.dispatch('admin/trips/createTrip', { carId: 'car1' })).resolves.toEqual({
      _id: 'new',
    })
    expect(bookingsApi.create).toHaveBeenCalledTimes(1)
    expect(store.state.admin.trips.error).toBe('Network error.')
  })

  it('createCar succeeds when only the reload after it fails (M10)', async () => {
    const store = await loaded()
    vi.mocked(carsApi.create).mockResolvedValue({ _id: 'car2' })
    vi.mocked(carsApi.list).mockRejectedValueOnce(new Error('Network error.'))

    await expect(store.dispatch('admin/fleet/createCar', { vin: 'VIN2' })).resolves.toEqual({
      _id: 'car2',
    })
    expect(store.state.cars.error).toBe('Network error.')
  })

  it('drops user and trip lists that arrive after sign-out (M2)', async () => {
    const pending = {}
    vi.mocked(usersApi.list).mockReturnValueOnce(new Promise((r) => (pending.users = r)))
    vi.mocked(bookingsApi.list).mockReturnValueOnce(new Promise((r) => (pending.trips = r)))
    const store = makeStore()
    store.commit('auth/SET_SESSION', { user: USER, token: 'token-a' })
    const users = store.dispatch('admin/users/fetchUsers')
    const trips = store.dispatch('admin/trips/fetchTrips')

    store.commit('auth/CLEAR_SESSION')
    pending.users([USER])
    pending.trips([TRIP])

    await expect(users).resolves.toEqual([])
    await expect(trips).resolves.toEqual([])
    expect(store.state.admin.users.items).toEqual([])
    expect(store.state.admin.trips.items).toEqual([])
  })

  it('keeps the newer list when an older refresh answers last (L4)', async () => {
    const pending = []
    vi.mocked(bookingsApi.list).mockImplementation(
      () => new Promise((resolve) => pending.push(resolve)),
    )
    const store = makeStore()
    const older = store.dispatch('admin/trips/fetchTrips')
    const newer = store.dispatch('admin/trips/fetchTrips')

    pending[1]([{ ...TRIP, endDate: '2026-10-29T09:00:00Z' }])
    await newer
    pending[0]([TRIP])
    await older

    expect(store.state.admin.trips.items[0].endDate).toBe('2026-10-29T09:00:00Z')
    expect(store.state.admin.trips.isLoading).toBe(false)
  })

  it('refuses to delete the signed-in admin (L5)', async () => {
    const store = await loaded()
    store.commit('auth/SET_SESSION', { user: USER, token: 't' })

    await expect(store.dispatch('admin/users/deleteUser', 'u1')).rejects.toThrow(
      SELF_DELETE_MESSAGE,
    )
    expect(usersApi.remove).not.toHaveBeenCalled()
  })

  it('reloads trips after deleting a user (L29)', async () => {
    const store = await loaded()
    store.commit('auth/SET_SESSION', { user: { _id: 'admin1' }, token: 't' })
    vi.mocked(usersApi.remove).mockResolvedValue(undefined)

    await store.dispatch('admin/users/deleteUser', 'u1')

    expect(store.state.admin.users.items).toEqual([])
    expect(bookingsApi.list).toHaveBeenCalledTimes(2)
  })

  it('treats a car deleted meanwhile as nothing to update (L6)', async () => {
    const store = await loaded()
    const ended = { ...TRIP, endDate: '2026-10-29T09:00:00Z' }
    vi.mocked(bookingsApi.update).mockResolvedValue(ended)
    vi.mocked(carsApi.update).mockRejectedValue(
      Object.assign(new Error('Car not found'), { statusCode: 404 }),
    )

    await expect(
      store.dispatch('admin/trips/completeTrip', {
        trip: TRIP,
        endDate: ended.endDate,
        finishFuelLevel: 40,
        finishMileage: 1031,
      }),
    ).resolves.toEqual(ended)
    await expect(
      store.dispatch('admin/trips/retryCarUpdate', { vin: 'VIN1', changes: { fuelLevel: 40 } }),
    ).resolves.toBeUndefined()
    await expect(
      store.dispatch('admin/trips/deleteTrip', { trip: TRIP, freeCar: true }),
    ).resolves.toBeUndefined()
  })

  it('resets admin filters and the selected day on sign-out (L10)', async () => {
    const store = await loaded()
    store.dispatch('admin/fleet/setFilters', { q: 'kia' })
    store.dispatch('admin/users/setFilters', { q: 'anna' })
    store.dispatch('admin/trips/setFilters', { q: 'b1' })
    store.dispatch('admin/insights/setDate', '2026-01-01')

    store.commit('auth/CLEAR_SESSION')

    expect(store.state.admin.fleet.filters.q).toBe('')
    expect(store.state.admin.users.filters.q).toBe('')
    expect(store.state.admin.trips.filters.q).toBe('')
    expect(store.getters['admin/insights/isToday']).toBe(true)
  })

  it('moves "today" to the next day at midnight, but keeps a picked day (L10)', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-29T20:59:00Z')) // 23:59 in Minsk
      const store = makeStore()
      vi.setSystemTime(new Date('2026-10-29T21:01:00Z'))
      await store.dispatch('admin/insights/tick')
      expect(store.state.admin.insights.date).toBe('2026-10-30')

      store.dispatch('admin/insights/setDate', '2026-10-01')
      vi.setSystemTime(new Date('2026-10-30T21:01:00Z'))
      await store.dispatch('admin/insights/tick')
      expect(store.state.admin.insights.date).toBe('2026-10-01')
    } finally {
      vi.useRealTimers()
    }
  })
})
