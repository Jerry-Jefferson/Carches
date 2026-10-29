import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as carsApi from '@/api/cars'
import bookings from '@/store/modules/bookings'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import FleetView from '../FleetView.vue'

vi.mock('@/api/cars', () => ({ list: vi.fn(), getById: vi.fn() }))
vi.mock('@/api/bookings', () => ({ listMine: vi.fn(), create: vi.fn() }))
// Leaflet is not needed to check that the drawer opens
vi.mock('@/components/cars/FleetMap.vue', () => ({
  // Lets defineAsyncComponent pick `default` from the mocked module
  __esModule: true,
  default: { name: 'FleetMap', props: ['cars'], template: '<div class="fleet-map-stub" />' },
}))

const car = (id, brand, overrides = {}) => ({
  _id: id,
  productionInfo: { brand, model: 'Model', year: 2021 },
  registrationNumber: `${id}-7`,
  status: 'free',
  fuelLevel: 60,
  mileage: 1000,
  location: { type: 'Point', coordinates: [27.56, 53.9] },
  ...overrides,
})

const CARS = [car('a', 'Toyota'), car('b', 'BMW'), car('c', 'BMW', { status: 'in_use' })]

const setup = async (path = '/fleet') => {
  const store = createStore({ strict: true, modules: { bookings, cars, geo } })
  const Stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/fleet', name: 'fleet', component: FleetView },
      { path: '/cars/:id', name: 'car-details', component: Stub },
      { path: '/trips', name: 'my-trips', component: Stub },
    ],
  })
  await router.push(path)
  const wrapper = mount(FleetView, {
    global: { plugins: [store, router] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, store, router }
}

const cardNames = (wrapper) =>
  wrapper.findAll('article').map((card) => card.attributes('aria-label'))

describe('FleetView', () => {
  let wrapper

  beforeEach(() => {
    vi.mocked(carsApi.list).mockReset()
    sessionStorage.clear()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('loads the fleet and shows only available cars by default', async () => {
    vi.mocked(carsApi.list).mockResolvedValue(CARS)
    ;({ wrapper } = await setup())

    expect(carsApi.list).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 available cars')
  })

  it('reads the filters from the URL', async () => {
    vi.mocked(carsApi.list).mockResolvedValue(CARS)
    let store
    ;({ wrapper, store } = await setup('/fleet?brand=BMW&available=0'))

    expect(store.state.cars.filters).toMatchObject({ brand: 'BMW', availableOnly: false })
    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(cardNames(wrapper)).toEqual(['BMW Model', 'BMW Model'])
  })

  it('writes filter changes to the URL, keeping the search', async () => {
    vi.mocked(carsApi.list).mockResolvedValue(CARS)
    let router
    ;({ wrapper, router } = await setup('/fleet?q=model'))

    const toyota = wrapper
      .find('[aria-label="Brand"]')
      .findAll('button')
      .find((button) => button.text().startsWith('Toyota'))
    await toyota.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ q: 'model', brand: 'Toyota' })
    expect(wrapper.findAll('article')).toHaveLength(1)
  })

  it('shows the empty state and resets the filters', async () => {
    vi.mocked(carsApi.list).mockResolvedValue(CARS)
    let router
    ;({ wrapper, router } = await setup('/fleet?q=zzz&map=1'))

    expect(wrapper.text()).toContain('No cars match your filters')
    const reset = wrapper.findAll('button').find((button) => button.text() === 'Reset filters')
    await reset.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ map: '1' })
    expect(wrapper.findAll('article')).toHaveLength(2)
  })

  it('shows the load error and retries', async () => {
    vi.mocked(carsApi.list)
      .mockRejectedValueOnce(new Error('Network error. Check your connection.'))
      .mockResolvedValueOnce(CARS)
    ;({ wrapper } = await setup())

    expect(wrapper.text()).toContain('Could not load the fleet')
    expect(wrapper.text()).toContain('Network error')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry')
      .trigger('click')
    await flushPromises()

    expect(wrapper.findAll('article')).toHaveLength(2)
  })

  it('opens and closes the map drawer through ?map=1', async () => {
    vi.mocked(carsApi.list).mockResolvedValue(CARS)
    let router
    ;({ wrapper, router } = await setup())
    expect(wrapper.find('.fleet-map-stub').exists()).toBe(false)

    const mapButton = wrapper.findAll('button').find((button) => button.text().includes('Map View'))
    await mapButton.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.fleet-map-stub').exists()).toBe(true))

    expect(router.currentRoute.value.query).toEqual({ map: '1' })
  })

  it('keeps the filters when leaving the page', async () => {
    vi.mocked(carsApi.list).mockResolvedValue(CARS)
    let store, router
    ;({ wrapper, store, router } = await setup('/fleet?brand=BMW'))

    await router.push('/cars/b')
    await flushPromises()

    expect(store.state.cars.filters.brand).toBe('BMW')
  })
})
