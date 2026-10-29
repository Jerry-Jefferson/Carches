import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import bookings from '@/store/modules/bookings'
import carDetails from '@/store/modules/carDetails'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import CarDetailsView, { POLL_MS } from '../CarDetailsView.vue'

vi.mock('@/api/cars', () => ({ list: vi.fn(), getById: vi.fn() }))
vi.mock('@/api/bookings', () => ({ listMine: vi.fn(), create: vi.fn() }))

const CAR = {
  _id: 'car1',
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 },
  registrationNumber: '1234 AB-7',
  status: 'free',
  fuelLevel: 82,
  mileage: 18420,
  location: { type: 'Point', coordinates: [27.5615, 53.9023] },
}

const MapViewStub = { name: 'MapView', props: ['markers'], template: '<div class="map-stub" />' }

const setup = async (id = 'car1') => {
  const store = createStore({ strict: true, modules: { bookings, carDetails, cars, geo } })
  store.commit('cars/SET_FILTERS', { brand: 'Toyota' })
  const Stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/fleet', name: 'fleet', component: Stub },
      { path: '/trips', name: 'my-trips', component: Stub },
      { path: '/cars/:id', name: 'car-details', component: CarDetailsView, props: true },
    ],
  })
  await router.push(`/cars/${id}`)
  const wrapper = mount(CarDetailsView, {
    props: { id },
    global: { plugins: [store, router], stubs: { MapView: MapViewStub } },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, store, router }
}

const text = (wrapper) => wrapper.text().replace(/\s+/g, ' ')

describe('CarDetailsView', () => {
  let wrapper

  beforeEach(() => {
    vi.mocked(carsApi.getById).mockReset()
    vi.mocked(bookingsApi.listMine).mockReset()
    vi.mocked(bookingsApi.listMine).mockResolvedValue([])
    sessionStorage.clear()
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('shows the car, its details and a breadcrumb back to the filtered fleet', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue(CAR)
    ;({ wrapper } = await setup())

    expect(wrapper.find('h1').text()).toBe('Toyota Camry')
    expect(text(wrapper)).toContain('2023 · 1234 AB-7')
    expect(text(wrapper)).toContain('53.90230, 27.56150')
    expect(text(wrapper)).toContain('18 420 km')
    expect(text(wrapper)).toContain('Location unavailable')
    expect(wrapper.find('a[href="/fleet?brand=Toyota"]').exists()).toBe(true)
    expect(wrapper.findComponent(MapViewStub).props('markers')).toHaveLength(1)
    expect(document.title).toBe('Toyota Camry — Carshes')
  })

  it('shows "not in the fleet" for an unknown or malformed id', async () => {
    vi.mocked(carsApi.getById).mockRejectedValue(
      Object.assign(new Error('Invalid car ID format'), { statusCode: 400 }),
    )
    ;({ wrapper } = await setup('nope'))

    expect(text(wrapper)).toContain('This car is not in the fleet')
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('offers a retry for other errors', async () => {
    vi.mocked(carsApi.getById)
      .mockRejectedValueOnce(Object.assign(new Error('Network error.'), { statusCode: null }))
      .mockResolvedValueOnce(CAR)
    ;({ wrapper } = await setup())

    expect(text(wrapper)).toContain('Could not load this car')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry')
      .trigger('click')
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Toyota Camry')
  })

  it('re-reads a car that is not free every 30 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    vi.mocked(carsApi.getById)
      .mockResolvedValueOnce({ ...CAR, status: 'in_use' })
      .mockResolvedValueOnce(CAR)
    ;({ wrapper } = await setup())
    expect(text(wrapper)).toContain('This car is in trip right now.')

    vi.advanceTimersByTime(POLL_MS)
    await flushPromises()

    expect(carsApi.getById).toHaveBeenCalledTimes(2)
    expect(text(wrapper)).not.toContain('right now')

    vi.advanceTimersByTime(POLL_MS)
    await flushPromises()
    expect(carsApi.getById).toHaveBeenCalledTimes(2)
  })
})
