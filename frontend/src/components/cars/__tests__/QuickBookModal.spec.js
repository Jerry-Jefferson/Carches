import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import bookings from '@/store/modules/bookings'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import notify from '@/utils/notify'
import QuickBookModal from '../QuickBookModal.vue'

vi.mock('@/api/bookings', () => ({ listMine: vi.fn(), create: vi.fn() }))
vi.mock('@/api/cars', () => ({ list: vi.fn(), getById: vi.fn() }))
vi.mock('@/utils/notify', () => ({ default: { success: vi.fn() } }))

const CAR = {
  _id: 'car1',
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 },
  registrationNumber: '1234 AB-7',
  status: 'free',
  fuelLevel: 82,
  mileage: 18420,
}

const setup = () => {
  const store = createStore({ strict: true, modules: { bookings, cars, geo } })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/trips', name: 'my-trips', component: { template: '<div />' } }],
  })
  return mount(QuickBookModal, {
    props: { open: true, car: CAR },
    global: { plugins: [store, router] },
    attachTo: document.body,
  })
}

const bodyText = () => document.body.textContent.replace(/\s+/g, ' ')
const confirmButton = () =>
  [...document.body.querySelectorAll('button')].find((button) =>
    button.textContent.includes('Confirm booking'),
  )

describe('QuickBookModal', () => {
  let wrapper

  beforeEach(() => {
    vi.mocked(carsApi.getById).mockReset()
    vi.mocked(carsApi.list).mockReset()
    vi.mocked(carsApi.list).mockResolvedValue([])
    vi.mocked(bookingsApi.listMine).mockReset()
    vi.mocked(bookingsApi.create).mockReset()
    vi.mocked(notify.success).mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('shows the start values of the fresh car and books it', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue({ ...CAR, fuelLevel: 75 })
    vi.mocked(bookingsApi.listMine).mockResolvedValue([])
    vi.mocked(bookingsApi.create).mockResolvedValue({ _id: 'b1' })
    wrapper = setup()

    await vi.waitFor(() => expect(bodyText()).toContain('75 %'))
    expect(bodyText()).toContain('Toyota Camry')
    expect(bodyText()).toContain('18 420 km')
    expect(bodyText()).toMatch(/Status after booking\s*In trip/)

    confirmButton().click()

    await vi.waitFor(() => expect(wrapper.emitted('booked')).toEqual([[{ _id: 'b1' }]]))
    expect(bookingsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ carId: 'car1', startFuelLevel: 75, startMileage: 18420 }),
    )
    expect(notify.success).toHaveBeenCalledWith('Car booked. Your trip has started.')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('disables confirm when the car was taken in the meantime', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue({ ...CAR, status: 'reserved' })
    vi.mocked(bookingsApi.listMine).mockResolvedValue([])
    wrapper = setup()

    await vi.waitFor(() => expect(bodyText()).toContain('This car is no longer available'))
    expect(confirmButton().disabled).toBe(true)
  })

  it('sends a user with an open trip to My Trips', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue(CAR)
    vi.mocked(bookingsApi.listMine).mockResolvedValue([
      { _id: 'b0', startDate: new Date(Date.now() - 60000).toISOString(), endDate: null },
    ])
    wrapper = setup()

    await vi.waitFor(() => expect(bodyText()).toContain('You already have an active trip'))
    expect(document.body.querySelector('a[href="/trips"]')).not.toBeNull()
    expect(confirmButton().disabled).toBe(true)
  })

  it('ignores a late check from an earlier opening and books the car shown (H2)', async () => {
    const CAR_B = {
      ...CAR,
      _id: 'car2',
      productionInfo: { brand: 'Kia', model: 'Rio', year: 2021 },
      registrationNumber: '5678 CD-7',
    }
    const checks = {}
    vi.mocked(carsApi.getById)
      .mockReturnValueOnce(new Promise((r) => (checks.a = r)))
      .mockReturnValueOnce(new Promise((r) => (checks.b = r)))
      .mockResolvedValueOnce(CAR_B)
    vi.mocked(bookingsApi.listMine).mockResolvedValue([])
    vi.mocked(bookingsApi.create).mockResolvedValue({ _id: 'b1' })
    wrapper = setup()

    // Cancel car A while its check is pending, open the modal for car B
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ car: CAR_B, open: true })
    checks.a(CAR)
    await flushPromises()
    expect(carsApi.getById).toHaveBeenCalledTimes(2)

    expect(bodyText()).toContain('Kia Rio')
    expect(bodyText()).not.toContain('Toyota Camry')
    expect(confirmButton().disabled).toBe(true)

    checks.b(CAR_B)
    await vi.waitFor(() => expect(confirmButton().disabled).toBe(false))
    confirmButton().click()

    await vi.waitFor(() => expect(bookingsApi.create).toHaveBeenCalledTimes(1))
    expect(bookingsApi.create).toHaveBeenCalledWith(expect.objectContaining({ carId: 'car2' }))
  })

  it('keeps the modal open with the backend message when booking fails', async () => {
    vi.mocked(carsApi.getById).mockResolvedValue(CAR)
    vi.mocked(bookingsApi.listMine).mockResolvedValue([])
    vi.mocked(bookingsApi.create).mockRejectedValue(new Error('Invalid input data.'))
    wrapper = setup()
    await vi.waitFor(() => expect(confirmButton().disabled).toBe(false))

    confirmButton().click()

    await vi.waitFor(() => expect(bodyText()).toContain('Invalid input data.'))
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
