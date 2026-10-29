import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as carsApi from '@/api/cars'
import admin from '@/store/modules/admin'
import auth from '@/store/modules/auth'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import notify from '@/utils/notify'
import AdminFleetTable from '../AdminFleetTable.vue'
import MaintenanceActions from '../MaintenanceActions.vue'
import ReservedCardsWidget from '../ReservedCardsWidget.vue'
import VehicleFormModal from '../VehicleFormModal.vue'

vi.mock('@/api/cars', () => ({
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
vi.mock('@/api/bookings', () => ({ list: vi.fn(), listMine: vi.fn(), create: vi.fn() }))
vi.mock('@/api/users', () => ({ list: vi.fn(), getMe: vi.fn() }))
vi.mock('@/utils/notify', () => ({
  default: { success: vi.fn(), error: vi.fn(), apiError: vi.fn() },
}))

const car = (id, overrides = {}) => ({
  _id: id,
  vin: `VIN${id}`.toUpperCase(),
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2021 },
  registrationNumber: `${id}-7`.toUpperCase(),
  status: 'free',
  fuelLevel: 60,
  mileage: 1000,
  location: { type: 'Point', coordinates: [27.56, 53.9] },
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const MapViewStub = { name: 'MapView', props: ['markers'], template: '<div class="map-stub" />' }

const makeStore = (items = []) => {
  const store = createStore({ strict: true, modules: { admin, auth, cars, geo } })
  store.commit('cars/SET_ITEMS', items)
  return store
}

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin', name: 'admin', component: { template: '<div />' } }],
  })

const mountWith = (component, { store, props = {} } = {}) =>
  mount(component, {
    props,
    global: { plugins: [store, makeRouter()], stubs: { MapView: MapViewStub } },
    attachTo: document.body,
  })

const bodyText = () => document.body.textContent.replace(/\s+/g, ' ')
const bodyButton = (label) =>
  [...document.body.querySelectorAll('button')].find((button) =>
    button.textContent.trim().includes(label),
  )

describe('admin fleet section', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  describe('AdminFleetTable', () => {
    it('blocks deleting a car in a trip and removes a free one', async () => {
      const busy = car('a', { status: 'in_use' })
      const free = car('b')
      const store = makeStore([busy, free])
      vi.mocked(carsApi.remove).mockResolvedValue()
      wrapper = mountWith(AdminFleetTable, { store, props: { cars: [busy, free] } })

      const busyDelete = wrapper.find('button[aria-label^="Delete Toyota Camry (not possible"]')
      expect(busyDelete.attributes('disabled')).toBeDefined()

      const deleteButtons = wrapper.findAll('button[aria-label="Delete Toyota Camry"]')
      expect(deleteButtons).toHaveLength(1)
      await deleteButtons[0].trigger('click')
      await vi.waitFor(() =>
        expect(bodyText()).toContain('Remove Toyota Camry (B-7) from the fleet?'),
      )
      bodyButton('Remove').click()
      await flushPromises()

      expect(carsApi.remove).toHaveBeenCalledWith('VINB')
      expect(store.state.cars.items.map((item) => item._id)).toEqual(['a'])
      expect(notify.success).toHaveBeenCalled()
    })
  })

  describe('VehicleFormModal', () => {
    const setValue = async (id, value) => {
      const input = document.body.querySelector(`#${id}`)
      input.value = value
      input.dispatchEvent(new Event('input'))
      input.dispatchEvent(new Event('blur'))
      await flushPromises()
    }
    const submit = async () => {
      bodyButton(wrapper.props('car') ? 'Save changes' : 'Add vehicle').click()
      await flushPromises()
    }

    it('validates and creates a car with a GeoJSON location and an uppercase VIN', async () => {
      const store = makeStore()
      vi.mocked(carsApi.create).mockResolvedValue({ _id: 'new' })
      vi.mocked(carsApi.list).mockResolvedValue([])
      wrapper = mountWith(VehicleFormModal, { store, props: { open: false, car: null } })
      await wrapper.setProps({ open: true })
      await flushPromises()

      await submit()
      await vi.waitFor(() => expect(bodyText()).toContain('Brand is required'))
      expect(bodyText()).toContain('VIN is required')
      expect(carsApi.create).not.toHaveBeenCalled()

      await setValue('vehicle-brand', 'Kia')
      await setValue('vehicle-model', 'Rio')
      await setValue('vehicle-vin', 'xw8zzz61zjg123456')
      await setValue('vehicle-plate', '1234 ab-7')
      await submit()

      await vi.waitFor(() => expect(carsApi.create).toHaveBeenCalled())
      const payload = vi.mocked(carsApi.create).mock.calls[0][0]
      expect(payload).toMatchObject({
        productionInfo: { brand: 'Kia', model: 'Rio', year: new Date().getFullYear() },
        vin: 'XW8ZZZ61ZJG123456',
        registrationNumber: '1234 AB-7',
        status: 'free',
        fuelLevel: 100,
        mileage: 0,
        location: { type: 'Point', coordinates: [27.5615, 53.9023] },
      })
      await vi.waitFor(() => expect(notify.success).toHaveBeenCalledWith('Car added'))
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    it('puts a duplicate VIN error on the VIN field', async () => {
      const store = makeStore()
      vi.mocked(carsApi.create).mockRejectedValue(
        new Error('Duplicate field value entered: XW8ZZZ61ZJG123456. Please use another value'),
      )
      wrapper = mountWith(VehicleFormModal, { store, props: { open: false, car: null } })
      await wrapper.setProps({ open: true })
      await flushPromises()

      await setValue('vehicle-brand', 'Kia')
      await setValue('vehicle-model', 'Rio')
      await setValue('vehicle-vin', 'XW8ZZZ61ZJG123456')
      await setValue('vehicle-plate', '1234 AB-7')
      await submit()

      await vi.waitFor(() => expect(bodyText()).toContain('A car with this VIN already exists'))
      expect(document.body.querySelector('[role="alert"].ant-alert')).toBeNull()
      expect(wrapper.emitted('update:open')).toBeUndefined()
    })

    it('edits only the changed fields, keyed by VIN, with model and VIN read-only', async () => {
      const existing = car('a')
      const store = makeStore([existing])
      vi.mocked(carsApi.update).mockResolvedValue({ ...existing, registrationNumber: '9999 ZZ-7' })
      wrapper = mountWith(VehicleFormModal, { store, props: { open: false, car: existing } })
      await wrapper.setProps({ open: true })
      await flushPromises()

      expect(document.body.querySelector('#vehicle-brand').disabled).toBe(true)
      expect(document.body.querySelector('#vehicle-vin').disabled).toBe(true)
      await setValue('vehicle-plate', '9999 zz-7')
      await submit()

      await vi.waitFor(() => expect(carsApi.update).toHaveBeenCalled())
      expect(carsApi.update).toHaveBeenCalledWith('VINA', { registrationNumber: '9999 ZZ-7' })
      expect(store.state.cars.items[0].registrationNumber).toBe('9999 ZZ-7')
      expect(notify.success).toHaveBeenCalledWith('Car updated')
    })
  })

  describe('MaintenanceActions', () => {
    it('previews the matching cars and reports the updated count', async () => {
      const store = makeStore([
        car('old', { productionInfo: { brand: 'Lada', model: 'Niva', year: 2010 } }),
        car('worn', { mileage: 150000 }),
        car('fine'),
      ])
      vi.mocked(carsApi.sendOldOrWornToService).mockResolvedValue({ modifiedCount: 2 })
      vi.mocked(carsApi.list).mockResolvedValue([])
      wrapper = mountWith(MaintenanceActions, { store })

      expect(wrapper.text()).toContain('Matches now: 2 cars')
      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'Review & run')
        .trigger('click')
      await vi.waitFor(() => expect(bodyText()).toContain('2 cars will be updated'))
      expect(bodyText()).toContain('Lada Niva 2010')

      bodyButton('Run now').click()
      await flushPromises()

      expect(carsApi.sendOldOrWornToService).toHaveBeenCalled()
      expect(notify.success).toHaveBeenCalledWith('2 cars updated')
    })
  })

  describe('ReservedCardsWidget', () => {
    it('switches between authorised and not authorised cards', async () => {
      const store = makeStore([car('a', { status: 'reserved' })])
      vi.mocked(carsApi.listReserved).mockResolvedValue([
        {
          vin: 'VINA',
          userFirstName: 'Hanna',
          userLastName: 'Paulava',
          userLicenseNumber: 'AB1234',
        },
      ])
      wrapper = mountWith(ReservedCardsWidget, { store })

      const authorised = wrapper
        .findAll('.ant-segmented-item')
        .find((item) => item.text() === 'Card authorised')
      await authorised.find('input').trigger('change')
      await flushPromises()

      expect(carsApi.listReserved).toHaveBeenCalledWith(true)
      expect(store.state.admin.fleet.reservedAuthorized).toBe(true)
      expect(wrapper.text()).toContain('Hanna Paulava')
      expect(wrapper.text()).toContain('Show on map')
      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'Show on map')
        .trigger('click')
      expect(wrapper.emitted('show-on-map')[0][0]._id).toBe('a')
    })
  })
})
