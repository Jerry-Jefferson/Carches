import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import bookings from '@/store/modules/bookings'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import { toPickerValue } from '@/utils/schedule'
import BookingConfirmedModal from '../BookingConfirmedModal.vue'
import BookingPanel from '../BookingPanel.vue'

vi.mock('@/api/bookings', () => ({ listMine: vi.fn(), create: vi.fn() }))
vi.mock('@/api/cars', () => ({ list: vi.fn(), getById: vi.fn() }))

const HOUR = 3600000

const CAR = {
  _id: 'car1',
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 },
  registrationNumber: '1234 AB-7',
  status: 'free',
  fuelLevel: 82,
  mileage: 18420,
}

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: ['fleet', 'my-trips'].map((name) => ({
      path: `/${name}`,
      name,
      component: { template: '<div />' },
    })),
  })

const text = (wrapper) => wrapper.text().replace(/\s+/g, ' ')
const confirmButton = (wrapper) =>
  wrapper.findAll('button').find((button) => button.text().includes('Confirm booking'))

describe('BookingPanel', () => {
  let wrapper

  const mountPanel = async ({ car = CAR, mine = [] } = {}) => {
    vi.mocked(bookingsApi.listMine).mockResolvedValue(mine)
    const store = createStore({ strict: true, modules: { bookings, cars, geo } })
    await store.dispatch('bookings/fetchMine')
    wrapper = mount(BookingPanel, {
      props: { car },
      global: { plugins: [store, makeRouter()] },
      attachTo: document.body,
    })
    return wrapper
  }

  beforeEach(() => {
    vi.mocked(bookingsApi.create).mockReset()
    vi.mocked(carsApi.getById).mockReset()
    vi.mocked(carsApi.list).mockReset()
    vi.mocked(carsApi.list).mockResolvedValue([])
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('books a free car from now', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue(CAR)
    vi.mocked(bookingsApi.create).mockResolvedValue({ _id: 'b1' })
    await mountPanel()

    expect(text(wrapper)).toMatch(/Start time\s*Now/)
    expect(text(wrapper)).toMatch(/After booking\s*In trip/)
    expect(text(wrapper)).toContain('Your trip starts immediately.')
    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    const payload = vi.mocked(bookingsApi.create).mock.calls[0][0]
    expect(Math.abs(new Date(payload.startDate) - Date.now())).toBeLessThan(5000)
    expect(wrapper.emitted('booked')).toEqual([[{ booking: { _id: 'b1' }, scheduled: false }]])
  })

  it('schedules a start time, which reserves the car', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue(CAR)
    vi.mocked(bookingsApi.create).mockResolvedValue({ _id: 'b2' })
    await mountPanel()

    await wrapper.setData({ mode: 'schedule' })
    expect(wrapper.vm.startValue).not.toBeNull()
    expect(text(wrapper)).toMatch(/After booking\s*Reserved/)

    const start = new Date(Date.now() + 2 * HOUR)
    start.setSeconds(0, 0)
    await wrapper.setData({ startValue: toPickerValue(start) })
    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    expect(bookingsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: start.toISOString() }),
    )
    expect(wrapper.emitted('booked')[0][0].scheduled).toBe(true)
  })

  it('rejects a start time in the past', async () => {
    await mountPanel()

    await wrapper.setData({ mode: 'schedule' })
    await wrapper.setData({ startValue: toPickerValue(new Date(Date.now() - HOUR)) })

    expect(text(wrapper)).toContain('Pick a time in the future.')
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('explains why a car that is not free cannot be booked', async () => {
    await mountPanel({ car: { ...CAR, status: 'in_use' } })

    expect(text(wrapper)).toContain('This car is in trip right now.')
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('sends a user with an open booking to My Trips', async () => {
    await mountPanel({ mine: [{ _id: 'b0', startDate: new Date().toISOString(), endDate: null }] })

    expect(text(wrapper)).toContain('You already have an active trip.')
    expect(wrapper.find('a[href="/my-trips"]').exists()).toBe(true)
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('asks the page to reload a car that was taken in the meantime', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue({ ...CAR, status: 'reserved' })
    await mountPanel()

    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    expect(bookingsApi.create).not.toHaveBeenCalled()
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('shows the backend message when booking fails', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue(CAR)
    vi.mocked(bookingsApi.create).mockRejectedValue(new Error('Invalid input data.'))
    await mountPanel()

    await confirmButton(wrapper).trigger('click')
    await flushPromises()

    expect(text(wrapper)).toContain('Invalid input data.')
    expect(wrapper.emitted('booked')).toBeUndefined()
  })

  it('focuses the confirm button of a bookable car', async () => {
    await mountPanel()

    wrapper.vm.focusConfirm()

    expect(document.activeElement).toBe(confirmButton(wrapper).element)
  })

  it('focuses the panel itself while the button is disabled (M4)', async () => {
    await mountPanel({ car: { ...CAR, status: 'in_use' } })

    wrapper.vm.focusConfirm()

    expect(document.activeElement).toBe(wrapper.element)
    expect(wrapper.attributes('tabindex')).toBe('-1')
  })
})

describe('BookingConfirmedModal', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the booking and goes to My Trips', async () => {
    const router = makeRouter()
    await router.push('/fleet')
    const wrapper = mount(BookingConfirmedModal, {
      props: {
        open: true,
        car: CAR,
        booking: { _id: 'b1', startDate: '2026-10-29T12:00:00.000Z' },
        scheduled: true,
      },
      global: { plugins: [router] },
      attachTo: document.body,
    })
    await flushPromises()

    const body = document.body.textContent.replace(/\s+/g, ' ')
    expect(body).toContain('Booking confirmed')
    expect(body).toContain('Toyota Camry')
    expect(body).toContain('29 Oct 2026, 15:00')
    expect(body).toContain('Reserved')

    const button = [...document.body.querySelectorAll('button')].find((item) =>
      item.textContent.includes('Go to My Trips'),
    )
    button.click()
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('my-trips')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    wrapper.unmount()
  })

  it('is a dialog named by its heading (M4)', async () => {
    const wrapper = mount(BookingConfirmedModal, {
      props: { open: true, car: CAR, booking: { _id: 'b1', startDate: new Date().toISOString() } },
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })
    await flushPromises()

    const dialog = document.body.querySelector('[role="dialog"]')
    const labelId = dialog.getAttribute('aria-labelledby')
    expect(document.getElementById(labelId)?.textContent).toBe('Booking confirmed')
    wrapper.unmount()
  })
})
