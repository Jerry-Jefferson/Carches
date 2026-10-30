import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as bookingsApi from '@/api/bookings'
import * as carsApi from '@/api/cars'
import admin from '@/store/modules/admin'
import auth from '@/store/modules/auth'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import notify from '@/utils/notify'
import AdminTripsSection from '../AdminTripsSection.vue'
import BookingFormModal from '../BookingFormModal.vue'
import CompleteTripModal from '../CompleteTripModal.vue'
import DeleteTripModal from '../DeleteTripModal.vue'

vi.mock('@/api/bookings', () => ({
  list: vi.fn(),
  listMine: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@/api/cars', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  listInUseLowFuel: vi.fn(),
  listReserved: vi.fn(),
}))
vi.mock('@/api/users', () => ({ list: vi.fn(), getById: vi.fn(), update: vi.fn() }))
vi.mock('@/utils/notify', () => ({
  default: { success: vi.fn(), notice: vi.fn(), error: vi.fn() },
}))

const MINUTE = 60000
const HOUR = 60 * MINUTE
const NOW = Date.now()
const iso = (offset) => new Date(NOW + offset).toISOString()

const CAR = {
  _id: 'car1',
  vin: 'JTDBR32E720012345',
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 },
  registrationNumber: '1234 AB-7',
  status: 'in_use',
  fuelLevel: 60,
  mileage: 18500,
}
const FREE_CAR = {
  ...CAR,
  _id: 'car2',
  vin: 'WVWZZZ1KZ6W000001',
  productionInfo: { brand: 'Kia', model: 'Rio', year: 2021 },
  registrationNumber: '5678 KI-7',
  status: 'free',
  fuelLevel: 75,
  mileage: 4200,
}
const USER = { _id: 'u1', firstName: 'Hanna', lastName: 'Paulava', email: 'hanna@carshes.test' }

const ACTIVE = {
  _id: 'aaaaaa111111',
  userId: USER,
  carId: { _id: 'car1', vin: CAR.vin, registrationNumber: '1234 AB-7' },
  startDate: iso(-(HOUR + 5 * MINUTE)),
  endDate: null,
  startFuelLevel: 80,
  startMileage: 18420,
}
const COMPLETED = {
  _id: 'bbbbbb222222',
  userId: null,
  carId: { _id: 'gone', vin: 'GONE0000000000000', registrationNumber: '9999 ZZ-7' },
  startDate: iso(-5 * HOUR),
  endDate: iso(-4 * HOUR),
  startFuelLevel: 90,
  finishFuelLevel: 70,
  startMileage: 1000,
  finishMileage: 1042,
}
const UPCOMING = {
  _id: 'cccccc333333',
  userId: USER,
  carId: { _id: 'car2', vin: FREE_CAR.vin, registrationNumber: '5678 KI-7' },
  startDate: iso(2 * HOUR),
  endDate: null,
  startFuelLevel: 75,
  startMileage: 4200,
}

const makeStore = () => {
  const store = createStore({ strict: true, modules: { admin, auth, cars, geo } })
  store.commit('cars/SET_ITEMS', [CAR, FREE_CAR])
  store.commit('admin/trips/SET_ITEMS', [UPCOMING, ACTIVE, COMPLETED])
  store.commit('admin/users/SET_ITEMS', [USER])
  store.commit('admin/insights/TICK', NOW)
  return store
}

const makeRouter = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin', name: 'admin', component: { template: '<div />' } }],
  })
  await router.push('/admin')
  return router
}

const mountWith = async (component, props) => {
  const store = makeStore()
  const wrapper = mount(component, {
    props,
    global: { plugins: [store, await makeRouter()], stubs: { MapView: true } },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, store }
}

const clean = (value) => value.replace(/\s+/g, ' ')
const bodyText = () => clean(document.body.textContent)
const bodyButton = (label) =>
  [...document.body.querySelectorAll('button')].find(
    (button) => clean(button.textContent).trim() === label,
  )
const submitForm = () =>
  document.body.querySelector('.ant-modal form').dispatchEvent(new Event('submit'))

describe('admin trips', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(carsApi.list).mockResolvedValue([CAR, FREE_CAR])
    vi.mocked(bookingsApi.list).mockResolvedValue([UPCOMING, ACTIVE, COMPLETED])
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  describe('AdminTripsSection', () => {
    const rows = () => wrapper.findAll('tr.ant-table-row')

    it('joins car names, marks deleted users and shows live durations', async () => {
      ;({ wrapper } = await mountWith(AdminTripsSection))
      const text = clean(wrapper.text())

      expect(text).toContain('1 active trip right now')
      expect(rows()).toHaveLength(3)
      const [upcoming, active, completed] = rows().map((row) => clean(row.text()))
      expect(upcoming).toContain('Kia Rio')
      expect(upcoming).toMatch(/Starts (\d+ \w+ \d{4}, )?\d{2}:\d{2}/)
      expect(active).toContain('Toyota Camry')
      expect(active).toContain('Hanna Paulava')
      expect(active).toMatch(/In trip 1 h 05 min · since \d{2}:\d{2}/)
      expect(completed).toContain('Deleted user')
      expect(completed).toContain('Car no longer in fleet')
      expect(completed).toContain('9999 ZZ-7')
      expect(completed).toContain('42 km · −20 % fuel')
      expect(completed).toContain('1 h 00 min')
    })

    it('filters by status with counts', async () => {
      ;({ wrapper } = await mountWith(AdminTripsSection))
      const pills = wrapper.find('[aria-label="Booking status"]').findAll('button')
      expect(pills.map((pill) => clean(pill.text()))).toEqual([
        'All 3',
        'Active 1',
        'Upcoming 1',
        'Completed 1',
      ])

      await pills[3].trigger('click')

      expect(rows()).toHaveLength(1)
      expect(clean(rows()[0].text())).toContain('Deleted user')
    })

    it('opens the details drawer for ?trip= and highlights the row', async () => {
      vi.mocked(bookingsApi.getById).mockResolvedValue(ACTIVE)
      ;({ wrapper } = await mountWith(AdminTripsSection, { focusId: ACTIVE._id }))

      await vi.waitFor(() => expect(bodyText()).toContain(CAR.vin))
      expect(bookingsApi.getById).toHaveBeenCalledWith(ACTIVE._id)
      expect(rows()[1].classes()).toContain('*:bg-primary/15')
    })
  })

  describe('CompleteTripModal', () => {
    it('ends the booking, then updates the car, and retries a failed car update', async () => {
      vi.mocked(bookingsApi.update).mockResolvedValue({ ...ACTIVE, endDate: iso(0) })
      vi.mocked(carsApi.update)
        .mockRejectedValueOnce(new Error('Car not found'))
        .mockResolvedValueOnce({ ...CAR, status: 'free' })
      ;({ wrapper } = await mountWith(CompleteTripModal, { open: true, trip: ACTIVE }))

      submitForm()

      await vi.waitFor(() => expect(bodyText()).toContain('Retry car update'))
      expect(bodyText()).toContain('The trip was completed, but the car could not be updated')
      const [id, changes] = vi.mocked(bookingsApi.update).mock.calls[0]
      expect(id).toBe(ACTIVE._id)
      expect(changes).toMatchObject({ finishFuelLevel: 60, finishMileage: 18500 })
      expect(Math.abs(new Date(changes.endDate) - Date.now())).toBeLessThan(2 * MINUTE)
      expect(carsApi.update).toHaveBeenCalledWith(CAR.vin, { fuelLevel: 60, mileage: 18500 })
      expect(vi.mocked(bookingsApi.update).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(carsApi.update).mock.invocationCallOrder[0],
      )

      bodyButton('Retry car update').click()

      await vi.waitFor(() => expect(notify.success).toHaveBeenCalledWith('Car updated'))
      expect(carsApi.update).toHaveBeenCalledTimes(2)
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    it('rejects a finish mileage below the start mileage', async () => {
      ;({ wrapper } = await mountWith(CompleteTripModal, {
        open: true,
        trip: { ...ACTIVE, startMileage: 20000 },
      }))

      submitForm()

      await vi.waitFor(() =>
        expect(bodyText()).toContain('Finish mileage cannot be lower than the start mileage'),
      )
      expect(bookingsApi.update).not.toHaveBeenCalled()
    })
  })

  describe('BookingFormModal', () => {
    it('creates a booking for the chosen user and free car with prefilled start values', async () => {
      vi.mocked(bookingsApi.create).mockResolvedValue({ _id: 'new' })
      ;({ wrapper } = await mountWith(BookingFormModal, { open: true, trip: null }))

      const [userSelect, carSelect] = wrapper.findAllComponents({ name: 'ASelect' })
      expect(carSelect.props('options')).toEqual([{ value: 'car2', label: 'Kia Rio · 5678 KI-7' }])
      userSelect.vm.$emit('update:value', 'u1')
      carSelect.vm.$emit('update:value', 'car2')
      await flushPromises()
      submitForm()

      await vi.waitFor(() => expect(bookingsApi.create).toHaveBeenCalled())
      const payload = vi.mocked(bookingsApi.create).mock.calls[0][0]
      expect(payload).toMatchObject({
        userId: 'u1',
        carId: 'car2',
        startFuelLevel: 75,
        startMileage: 4200,
      })
      expect(Object.keys(payload).sort()).toEqual(
        ['carId', 'startDate', 'startFuelLevel', 'startMileage', 'userId'].sort(),
      )
      await vi.waitFor(() => expect(notify.success).toHaveBeenCalledWith('Booking created'))
      expect(wrapper.emitted('saved')).toEqual([[{ _id: 'new' }]])
    })

    it('labels the user and car selects (M5)', async () => {
      ;({ wrapper } = await mountWith(BookingFormModal, { open: true, trip: null }))

      for (const [id, label] of [
        ['booking-user', 'User'],
        ['booking-car', 'Car (available only)'],
      ]) {
        const input = document.getElementById(id)
        expect(input?.getAttribute('role')).toBe('combobox')
        expect(document.querySelector(`label[for="${id}"]`)?.textContent).toContain(label)
      }
    })

    it('requires a user and a car', async () => {
      ;({ wrapper } = await mountWith(BookingFormModal, { open: true, trip: null }))

      submitForm()

      await vi.waitFor(() => expect(bodyText()).toContain('Choose a user'))
      expect(bodyText()).toContain('Choose a car')
      expect(bookingsApi.create).not.toHaveBeenCalled()
    })

    it('sends only the changed fields when editing', async () => {
      vi.mocked(bookingsApi.update).mockResolvedValue(ACTIVE)
      ;({ wrapper } = await mountWith(BookingFormModal, { open: true, trip: ACTIVE }))

      const fuel = document.body.querySelector('input[aria-label="Finish fuel"]')
      fuel.value = '55'
      fuel.dispatchEvent(new Event('input'))
      await flushPromises()
      submitForm()

      await vi.waitFor(() => expect(bookingsApi.update).toHaveBeenCalled())
      expect(bookingsApi.update).toHaveBeenCalledWith(ACTIVE._id, { finishFuelLevel: 55 })
    })
  })

  describe('DeleteTripModal', () => {
    it('deletes an open booking and frees its car', async () => {
      vi.mocked(bookingsApi.remove).mockResolvedValue()
      vi.mocked(carsApi.update).mockResolvedValue({ ...CAR, status: 'free' })
      let store
      ;({ wrapper, store } = await mountWith(DeleteTripModal, { open: true, trip: ACTIVE }))

      expect(document.body.querySelector('input[type="checkbox"]').checked).toBe(true)
      bodyButton('Delete').click()

      await vi.waitFor(() =>
        expect(carsApi.update).toHaveBeenCalledWith(CAR.vin, { status: 'free' }),
      )
      expect(bookingsApi.remove).toHaveBeenCalledWith(ACTIVE._id)
      expect(vi.mocked(bookingsApi.remove).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(carsApi.update).mock.invocationCallOrder[0],
      )
      expect(store.getters['admin/trips/byId'](ACTIVE._id)).toBeNull()
      expect(store.getters['cars/byId']('car1').status).toBe('free')
    })

    it('leaves the car alone for a completed booking', async () => {
      vi.mocked(bookingsApi.remove).mockResolvedValue()
      ;({ wrapper } = await mountWith(DeleteTripModal, { open: true, trip: COMPLETED }))

      expect(document.body.querySelector('input[type="checkbox"]').checked).toBe(false)
      bodyButton('Delete').click()

      await vi.waitFor(() => expect(wrapper.emitted('done')).toHaveLength(1))
      expect(carsApi.update).not.toHaveBeenCalled()
    })
  })
})
