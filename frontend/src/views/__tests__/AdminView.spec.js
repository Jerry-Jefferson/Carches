import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import * as usersApi from '@/api/users'
import admin from '@/store/modules/admin'
import auth from '@/store/modules/auth'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import { downloadCsv } from '@/utils/csv'
import AdminView, { REFRESH_MS } from '../AdminView.vue'

vi.mock('@/api/cars', () => ({
  list: vi.fn(),
  listInUseLowFuel: vi.fn(),
  listReserved: vi.fn(),
}))
vi.mock('@/api/bookings', () => ({ list: vi.fn() }))
vi.mock('@/api/users', () => ({ list: vi.fn() }))
vi.mock('@/utils/csv', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadCsv: vi.fn(),
}))

// vi.mock factories are hoisted above the imports, so their helpers must be too
const { openCreate, section } = vi.hoisted(() => {
  const openCreate = vi.fn()
  const section = (name) => ({
    default: {
      name,
      props: ['focusId'],
      methods: { openCreate },
      template: `<div class="section" data-name="${name}" :data-focus="focusId" />`,
    },
  })
  return { openCreate, section }
})
vi.mock('@/components/admin/AdminFleetSection.vue', () => section('AdminFleetSection'))
vi.mock('@/components/admin/AdminTripsSection.vue', () => section('AdminTripsSection'))
vi.mock('@/components/admin/AdminUsersSection.vue', () => section('AdminUsersSection'))

const CARS = [
  {
    _id: 'c1',
    vin: 'VIN1',
    registrationNumber: '1111 AA-7',
    status: 'free',
    productionInfo: { brand: 'Kia', model: 'Rio', year: 2020 },
  },
  {
    _id: 'c2',
    vin: 'VIN2',
    registrationNumber: '2222 BB-7',
    status: 'in_use',
    productionInfo: { brand: 'BMW', model: 'X5', year: 2019 },
  },
]
const USERS = [{ _id: 'u1', firstName: 'Hanna', role: 'user', createdAt: new Date().toISOString() }]
const TRIPS = [
  { _id: 'b1', userId: USERS[0], carId: { _id: 'c2' }, startDate: new Date().toISOString() },
]

const setup = async (path = '/admin') => {
  const store = createStore({ strict: true, modules: { admin, auth, cars, geo } })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin', name: 'admin', component: AdminView }],
  })
  await router.push(path)
  const wrapper = mount(AdminView, {
    global: { plugins: [store, router] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, store, router }
}

const text = (wrapper) => wrapper.text().replace(/\s+/g, ' ')
const shownSection = (wrapper) => wrapper.find('.section').attributes('data-name')

describe('AdminView', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsApi.list).mockResolvedValue(CARS)
    vi.mocked(carsApi.listInUseLowFuel).mockResolvedValue([])
    vi.mocked(carsApi.listReserved).mockResolvedValue([])
    vi.mocked(usersApi.list).mockResolvedValue(USERS)
    vi.mocked(bookingsApi.list).mockResolvedValue(TRIPS)
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('loads everything and shows the KPIs', async () => {
    ;({ wrapper } = await setup())

    expect(carsApi.list).toHaveBeenCalled()
    expect(usersApi.list).toHaveBeenCalled()
    expect(bookingsApi.list).toHaveBeenCalled()
    expect(carsApi.listReserved).toHaveBeenCalledWith(false)

    const kpi = (label) => text(wrapper.find(`[aria-label="${label}"]`))
    expect(kpi('Total vehicles')).toContain('2')
    expect(kpi('Total vehicles')).toContain('Available 1')
    expect(kpi('Active rentals')).toContain('Utilisation 50 %')
    expect(kpi('Users')).toContain('1 new in the last 7 days')
  })

  it('switches sections through ?tab= and passes the focused row', async () => {
    let router
    ;({ wrapper, router } = await setup('/admin?tab=users&user=u1'))
    expect(shownSection(wrapper)).toBe('AdminUsersSection')
    expect(wrapper.find('.section').attributes('data-focus')).toBe('u1')

    const tabs = wrapper.find('[aria-label="Console sections"]').findAll('button')
    await tabs.find((button) => button.text().startsWith('Trips')).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ tab: 'trips' })
    expect(shownSection(wrapper)).toBe('AdminTripsSection')
  })

  it('"Add vehicle" opens the fleet section form', async () => {
    let router
    ;({ wrapper, router } = await setup('/admin?tab=users'))

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Add vehicle'))
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})
    expect(shownSection(wrapper)).toBe('AdminFleetSection')
    expect(openCreate).toHaveBeenCalled()
  })

  it('exports the current fleet rows as CSV', async () => {
    let store
    ;({ wrapper, store } = await setup())
    store.commit('admin/fleet/SET_FILTERS', { status: 'free' })

    wrapper.vm.exportReport({ key: 'fleet' })

    const [filename, csv] = vi.mocked(downloadCsv).mock.calls[0]
    expect(filename).toMatch(/^carshes-fleet-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(csv).toContain('1111 AA-7')
    expect(csv).not.toContain('2222 BB-7')
  })

  it('reloads every minute only while the tab is visible', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    ;({ wrapper } = await setup())
    expect(carsApi.list).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(REFRESH_MS)
    await flushPromises()
    expect(carsApi.list).toHaveBeenCalledTimes(2)

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    vi.advanceTimersByTime(REFRESH_MS)
    await flushPromises()
    expect(carsApi.list).toHaveBeenCalledTimes(2)
    visibility.mockRestore()
  })

  it('shows a load error with a retry', async () => {
    vi.mocked(usersApi.list).mockRejectedValueOnce(new Error('Network error.'))
    ;({ wrapper } = await setup())

    expect(text(wrapper)).toContain('Some console data could not be loaded')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Retry')
      .trigger('click')
    await flushPromises()

    expect(text(wrapper)).not.toContain('could not be loaded')
  })
})
