import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createStore } from 'vuex'

import * as carsApi from '@/api/cars'
import cars, { CACHE_MS, PAGE_SIZE } from '../cars'
import geo from '../geo'

vi.mock('@/api/cars', () => ({ list: vi.fn() }))

const car = (id, overrides = {}) => ({
  _id: id,
  productionInfo: { brand: 'Toyota', model: `Model ${id}`, year: 2020 },
  registrationNumber: `${id}-7`,
  status: 'free',
  fuelLevel: 50,
  mileage: 1000,
  location: { type: 'Point', coordinates: [27.56, 53.9] },
  ...overrides,
})

const apiError = (message) => Object.assign(new Error(message), { response: { data: { message } } })

const makeStore = () => createStore({ strict: true, modules: { cars, geo } })

describe('cars module', () => {
  beforeEach(() => {
    vi.mocked(carsApi.list).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('fetchCars', () => {
    it('stores the list and reuses it while fresh', async () => {
      vi.mocked(carsApi.list).mockResolvedValue([car('a'), car('b', { status: 'in_use' })])
      const store = makeStore()

      await store.dispatch('cars/fetchCars')
      await store.dispatch('cars/fetchCars')

      expect(carsApi.list).toHaveBeenCalledTimes(1)
      expect(store.state.cars.items).toHaveLength(2)
      expect(store.getters['cars/freeCount']).toBe(1)
    })

    it('fetches again when forced or after the cache expires', async () => {
      vi.useFakeTimers()
      vi.mocked(carsApi.list).mockResolvedValue([])
      const store = makeStore()

      await store.dispatch('cars/fetchCars')
      await store.dispatch('cars/fetchCars', { force: true })
      vi.advanceTimersByTime(CACHE_MS + 1)
      await store.dispatch('cars/fetchCars')

      expect(carsApi.list).toHaveBeenCalledTimes(3)
    })

    it('shares one request between concurrent callers', async () => {
      vi.mocked(carsApi.list).mockResolvedValue([car('a')])
      const store = makeStore()

      await Promise.all([store.dispatch('cars/fetchCars'), store.dispatch('cars/fetchCars')])

      expect(carsApi.list).toHaveBeenCalledTimes(1)
    })

    it('stores the backend error and re-throws', async () => {
      const error = apiError('Token has expired')
      vi.mocked(carsApi.list).mockRejectedValue(error)
      const store = makeStore()

      await expect(store.dispatch('cars/fetchCars')).rejects.toBe(error)
      expect(store.state.cars.error).toBe('Token has expired')
      expect(store.state.cars.isLoading).toBe(false)
    })
  })

  describe('filters and getters', () => {
    const loaded = async (items) => {
      vi.mocked(carsApi.list).mockResolvedValue(items)
      const store = makeStore()
      await store.dispatch('cars/fetchCars')
      return store
    }

    it('filters, sorts and counts brands with the other filters applied', async () => {
      const store = await loaded([
        car('a', { fuelLevel: 30 }),
        car('b', { fuelLevel: 90 }),
        car('c', { productionInfo: { brand: 'BMW', model: 'X5', year: 2022 } }),
        car('d', { status: 'in_use' }),
      ])

      await store.dispatch('cars/setFilters', { minFuel: 40 })

      expect(store.getters['cars/sorted'].map((item) => item._id)).toEqual(['b', 'c'])
      expect(store.getters['cars/sort']).toBe('fuel')
      expect(store.getters['cars/brandCounts']).toEqual({ BMW: 1, Toyota: 1 })
      // Status counts ignore "Available only", so the car in a trip is counted
      expect(store.getters['cars/statusCounts'].in_use).toBe(1)
    })

    it('shows cars page by page and starts over when the filters change', async () => {
      const store = await loaded(Array.from({ length: 30 }, (_, i) => car(`c${i}`)))

      expect(store.getters['cars/visible']).toHaveLength(PAGE_SIZE)
      expect(store.getters['cars/hasMore']).toBe(true)

      await store.dispatch('cars/showMore')
      expect(store.getters['cars/visible']).toHaveLength(PAGE_SIZE * 2)

      await store.dispatch('cars/setFilters', { q: 'model' })
      expect(store.state.cars.visibleCount).toBe(PAGE_SIZE)
    })

    it('does not commit when the filters are unchanged', async () => {
      const store = await loaded([car('a')])
      await store.dispatch('cars/showMore')

      await store.dispatch('cars/setFilters', {})

      expect(store.state.cars.visibleCount).toBe(PAGE_SIZE * 2)
    })

    it('uses the location for distances, the default sort and the nearest free car', async () => {
      const store = await loaded([
        car('far', { location: { type: 'Point', coordinates: [27.7, 53.95] } }),
        car('near', { location: { type: 'Point', coordinates: [27.561, 53.9021] } }),
        car('busy', {
          status: 'in_use',
          location: { type: 'Point', coordinates: [27.5615, 53.9023] },
        }),
      ])
      expect(store.getters['cars/nearestFree']).toBeNull()

      store.commit('geo/SET_COORDS', { lat: 53.9023, lng: 27.5615 })

      expect(store.getters['cars/sort']).toBe('distance')
      expect(store.getters['cars/sorted'][0]._id).toBe('near')
      expect(store.getters['cars/nearestFree'].car._id).toBe('near')
      expect(store.getters['cars/nearestFree'].distance).toBeLessThan(100)
    })

    it('upsertCar replaces a car in place or adds it', async () => {
      const store = await loaded([car('a'), car('b')])

      await store.dispatch('cars/upsertCar', car('a', { status: 'reserved' }))
      await store.dispatch('cars/upsertCar', car('z'))

      expect(store.getters['cars/byId']('a').status).toBe('reserved')
      expect(store.state.cars.items.map((item) => item._id)).toEqual(['a', 'b', 'z'])
    })
  })
})
