import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStore } from 'vuex'

import * as carsApi from '@/api/cars'
import carDetails from '../carDetails'
import cars from '../cars'
import geo from '../geo'

vi.mock('@/api/cars', () => ({ list: vi.fn(), getById: vi.fn() }))

const CAR = {
  _id: 'car1',
  status: 'free',
  location: { type: 'Point', coordinates: [27.5615, 53.9023] },
}

const apiError = (message, statusCode) => Object.assign(new Error(message), { statusCode })

const makeStore = () => createStore({ strict: true, modules: { carDetails, cars, geo } })

describe('carDetails module', () => {
  beforeEach(() => {
    vi.mocked(carsApi.getById).mockReset()
  })

  it('fetchCar stores the car and puts it into the fleet list', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue(CAR)
    const store = makeStore()

    await store.dispatch('carDetails/fetchCar', { id: 'car1' })

    expect(carsApi.getById).toHaveBeenCalledWith('car1')
    expect(store.state.carDetails.car).toEqual(CAR)
    expect(store.state.carDetails.isLoading).toBe(false)
    expect(store.getters['cars/byId']('car1')).toEqual(CAR)
  })

  it.each([400, 404])('marks a %s answer as not found', async (statusCode) => {
    const error = apiError('Car not found', statusCode)
    vi.mocked(carsApi.getById).mockRejectedValue(error)
    const store = makeStore()

    await expect(store.dispatch('carDetails/fetchCar', { id: 'x' })).rejects.toBe(error)
    expect(store.state.carDetails.notFound).toBe(true)
    expect(store.state.carDetails.error).toBe('Car not found')
  })

  it('keeps other errors apart from "not found"', async () => {
    vi.mocked(carsApi.getById).mockRejectedValue(apiError('Network error.', null))
    const store = makeStore()

    await expect(store.dispatch('carDetails/fetchCar', { id: 'car1' })).rejects.toThrow()
    expect(store.state.carDetails.notFound).toBe(false)
    expect(store.state.carDetails.error).toBe('Network error.')
  })

  it('silent refreshes keep the current car when they fail', async () => {
    vi.mocked(carsApi.getById).mockResolvedValueOnce(CAR).mockRejectedValueOnce(apiError('x', 500))
    const store = makeStore()
    await store.dispatch('carDetails/fetchCar', { id: 'car1' })

    await expect(store.dispatch('carDetails/fetchCar', { id: 'car1', silent: true })).resolves.toBe(
      null,
    )
    expect(store.state.carDetails.car).toEqual(CAR)
    expect(store.state.carDetails.error).toBeNull()
  })

  it('drops the previous car when another one is requested', async () => {
    vi.mocked(carsApi.getById).mockResolvedValueOnce(CAR)
    const store = makeStore()
    await store.dispatch('carDetails/fetchCar', { id: 'car1' })

    let resolve
    vi.mocked(carsApi.getById).mockReturnValueOnce(new Promise((r) => (resolve = r)))
    const pending = store.dispatch('carDetails/fetchCar', { id: 'car2' })
    expect(store.state.carDetails.car).toBeNull()

    resolve({ ...CAR, _id: 'car2' })
    await pending
    expect(store.state.carDetails.car._id).toBe('car2')
  })

  it('measures the distance from the user', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue(CAR)
    const store = makeStore()
    await store.dispatch('carDetails/fetchCar', { id: 'car1' })
    expect(store.getters['carDetails/distance']).toBeNull()

    store.commit('geo/SET_COORDS', { lat: 53.9023, lng: 27.5715 })
    expect(store.getters['carDetails/distance']).toBeCloseTo(656, -1)
  })
})
