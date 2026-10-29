import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import bookings from '@/store/modules/bookings'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import MyTripsView from '../MyTripsView.vue'

vi.mock('@/api/cars', () => ({ list: vi.fn(), getById: vi.fn() }))
vi.mock('@/api/bookings', () => ({ listMine: vi.fn(), create: vi.fn() }))

const MINUTE = 60000
const HOUR = 60 * MINUTE
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString()

const CAR = {
  _id: 'car1',
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 },
  registrationNumber: '1234 AB-7',
  status: 'in_use',
}

const ACTIVE = {
  _id: 'b1',
  carId: { _id: 'car1', registrationNumber: '1234 AB-7' },
  startDate: iso(-(HOUR + 5 * MINUTE)),
  endDate: null,
  startFuelLevel: 82,
  startMileage: 18420,
}
const COMPLETED = {
  _id: 'b2',
  carId: { _id: 'gone', registrationNumber: '9999 ZZ-7' },
  startDate: iso(-5 * HOUR),
  endDate: iso(-3 * HOUR),
  startFuelLevel: 90,
  finishFuelLevel: 70,
  startMileage: 1000,
  finishMileage: 1042,
}

const setup = async () => {
  const store = createStore({ strict: true, modules: { bookings, cars, geo } })
  const Stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/fleet', name: 'fleet', component: Stub },
      { path: '/trips', name: 'my-trips', component: MyTripsView },
      { path: '/cars/:id', name: 'car-details', component: Stub },
    ],
  })
  await router.push('/trips')
  const wrapper = mount(MyTripsView, { global: { plugins: [store, router] } })
  await flushPromises()
  return { wrapper, router }
}

const text = (wrapper) => wrapper.text().replace(/\s+/g, ' ')
const pill = (wrapper, label) =>
  wrapper
    .find('[aria-label="Trip status"]')
    .findAll('button')
    .find((button) => button.text().startsWith(label))

describe('MyTripsView', () => {
  let wrapper

  beforeEach(() => {
    vi.mocked(bookingsApi.listMine).mockReset()
    vi.mocked(carsApi.list).mockReset()
    vi.mocked(carsApi.list).mockResolvedValue([CAR])
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('highlights the active trip and lists every trip with its metrics', async () => {
    vi.mocked(bookingsApi.listMine).mockResolvedValue([ACTIVE, COMPLETED])
    ;({ wrapper } = await setup())

    expect(text(wrapper)).toContain('2 trips')
    const active = wrapper.find('[aria-labelledby="active-trip-title"]')
    expect(active.text()).toContain('Toyota Camry')
    expect(active.text()).toContain('1 h 05 min')
    expect(text(active)).toContain('To finish this trip, contact support')

    const items = wrapper.findAll('article')
    expect(items).toHaveLength(2)
    expect(text(items[1])).toContain('Car no longer in fleet')
    expect(text(items[1])).toContain('9999 ZZ-7')
    expect(text(items[1])).toContain('2 h 00 min')
    expect(text(items[1])).toContain('42 km')
    expect(text(items[1])).toContain('20 %')
    expect(items[1].find('a').exists()).toBe(false)
    expect(items[0].find('a[href="/cars/car1"]').exists()).toBe(true)
  })

  it('filters by status', async () => {
    vi.mocked(bookingsApi.listMine).mockResolvedValue([ACTIVE, COMPLETED])
    ;({ wrapper } = await setup())

    await pill(wrapper, 'Completed').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.find('[aria-labelledby="active-trip-title"]').exists()).toBe(false)

    await pill(wrapper, 'Upcoming').trigger('click')
    expect(text(wrapper)).toContain('No upcoming trips')
  })

  it('does not call a car removed when the fleet failed to load', async () => {
    vi.mocked(bookingsApi.listMine).mockResolvedValue([COMPLETED])
    vi.mocked(carsApi.list).mockRejectedValue(new Error('Network error.'))
    ;({ wrapper } = await setup())

    expect(text(wrapper)).not.toContain('no longer in fleet')
    expect(text(wrapper)).toContain('9999 ZZ-7')
  })

  it('invites a user without trips to find a car', async () => {
    vi.mocked(bookingsApi.listMine).mockResolvedValue([])
    let router
    ;({ wrapper, router } = await setup())

    expect(text(wrapper)).toContain('No trips yet')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Find a car')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('fleet')
  })

  it('shows the load error and retries', async () => {
    vi.mocked(bookingsApi.listMine)
      .mockRejectedValueOnce(new Error('Invalid token'))
      .mockResolvedValueOnce([COMPLETED])
    ;({ wrapper } = await setup())

    expect(text(wrapper)).toContain('Could not load your trips')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry')
      .trigger('click')
    await flushPromises()

    expect(wrapper.findAll('article')).toHaveLength(1)
  })

  it('updates the live duration every minute', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.mocked(bookingsApi.listMine).mockResolvedValue([ACTIVE])
    ;({ wrapper } = await setup())
    const active = () => wrapper.find('[aria-labelledby="active-trip-title"]').text()
    expect(active()).toContain('1 h 05 min')

    vi.advanceTimersByTime(MINUTE)
    await flushPromises()

    expect(active()).toContain('1 h 06 min')
  })
})
