import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as carsApi from '@/services/cars'
import admin from '@/store/modules/admin'
import auth from '@/store/modules/auth'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import notify from '@/utils/notify'
import AdminFleetSection from '@/components/admin/AdminFleetSection.vue'
import AdminFleetTable from '@/components/admin/AdminFleetTable.vue'
import LowFuelAlerts from '@/components/admin/LowFuelAlerts.vue'
import MaintenanceActions from '@/components/admin/MaintenanceActions.vue'
import ReservedCardsWidget from '@/components/admin/ReservedCardsWidget.vue'
import VehicleFormModal from '@/components/admin/VehicleFormModal.vue'
import VehicleHistoryDrawer from '@/components/admin/VehicleHistoryDrawer.vue'

vi.mock('@/services/cars', () => ({
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
vi.mock('@/services/bookings', () => ({ list: vi.fn(), listMine: vi.fn(), create: vi.fn() }))
vi.mock('@/services/users', () => ({ list: vi.fn(), getMe: vi.fn() }))
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

  describe('AdminFleetSection', () => {
    it('focuses a ?car= once and keeps the admin filters on later reloads (M9)', async () => {
      const store = makeStore([car('a'), car('b')])
      wrapper = mount(AdminFleetSection, {
        props: { focusId: 'b' },
        global: {
          plugins: [store, makeRouter()],
          stubs: {
            AdminFleetTable: true,
            AdminFleetMap: true,
            LowFuelAlerts: true,
            ReservedCardsWidget: true,
            MaintenanceActions: true,
            VehicleFormModal: true,
            VehicleHistoryDrawer: true,
          },
        },
      })
      await flushPromises()
      expect(store.state.admin.fleet.filters.q).toBe('VINB')

      // The 3 s highlight ends, the admin clears the search and picks a brand, then the
      // 60 s refresh lands
      wrapper.vm.highlightId = null
      await store.dispatch('admin/fleet/setFilters', { q: '', brand: 'Toyota' })
      store.commit('cars/SET_ITEMS', [car('a'), car('b')])
      await flushPromises()

      expect(store.state.admin.fleet.filters).toMatchObject({ q: '', brand: 'Toyota' })
    })

    const mountSection = (store) =>
      mount(AdminFleetSection, {
        global: {
          plugins: [store, makeRouter()],
          stubs: {
            AdminFleetTable: true,
            AdminFleetMap: true,
            LowFuelAlerts: true,
            ReservedCardsWidget: true,
            MaintenanceActions: true,
            VehicleFormModal: true,
            VehicleHistoryDrawer: true,
          },
        },
      })

    it('deletes the car the table confirms (E13)', async () => {
      const free = car('b')
      const store = makeStore([car('a'), free])
      vi.mocked(carsApi.remove).mockResolvedValue()
      wrapper = mountSection(store)
      await flushPromises()

      await wrapper.findComponent(AdminFleetTable).props('confirmDelete')(free)

      expect(carsApi.remove).toHaveBeenCalledWith('VINB')
      expect(store.state.cars.items.map((item) => item._id)).toEqual(['a'])
      expect(notify.success).toHaveBeenCalledWith('Toyota Camry removed from the fleet')
    })

    it('reports a failed delete and keeps the car', async () => {
      const free = car('b')
      const store = makeStore([car('a'), free])
      vi.mocked(carsApi.remove).mockRejectedValue(new Error('Server error'))
      wrapper = mountSection(store)
      await flushPromises()

      await wrapper.findComponent(AdminFleetTable).props('confirmDelete')(free)

      expect(notify.apiError).toHaveBeenCalledWith(expect.any(Error), 'Could not remove the car')
      expect(store.state.cars.items.map((item) => item._id)).toEqual(['a', 'b'])
    })

    it('passes the history car and its trips to the drawer', async () => {
      const free = car('b')
      const store = makeStore([car('a'), free])
      const trip = {
        _id: 'trip1',
        userId: null,
        carId: { _id: 'b' },
        startDate: new Date().toISOString(),
        endDate: null,
      }
      store.commit('admin/trips/SET_ITEMS', [trip, { ...trip, _id: 'trip2', carId: { _id: 'a' } }])
      wrapper = mountSection(store)
      await flushPromises()

      wrapper.findComponent(AdminFleetTable).vm.$emit('history', free)
      await flushPromises()

      const drawer = wrapper.findComponent(VehicleHistoryDrawer)
      expect(drawer.props('car')).toEqual(free)
      expect(drawer.props('trips').map((item) => item._id)).toEqual(['trip1'])
    })
  })

  describe('VehicleHistoryDrawer', () => {
    // Presentational: mounted with props only, no store or router
    it('lists the trips it is given and emits view-trip', async () => {
      const trip = {
        _id: 'trip1',
        userId: { firstName: 'Hanna', lastName: 'Paulava' },
        carId: { _id: 'b' },
        startDate: new Date().toISOString(),
        endDate: null,
      }
      wrapper = mount(VehicleHistoryDrawer, {
        props: { open: true, car: car('b'), trips: [trip] },
        attachTo: document.body,
      })
      await flushPromises()

      expect(bodyText()).toContain('History of Toyota Camry')
      expect(bodyText()).toContain('1 booking')
      expect(bodyText()).toContain('Hanna Paulava')
      bodyButton('Details').click()
      expect(wrapper.emitted('view-trip')).toEqual([['trip1']])
    })

    it('says when the car has not been booked', async () => {
      wrapper = mount(VehicleHistoryDrawer, {
        props: { open: true, car: car('b'), trips: [] },
        attachTo: document.body,
      })
      await flushPromises()

      expect(bodyText()).toContain('This car has not been booked yet.')
    })
  })

  describe('AdminFleetTable', () => {
    // Presentational: mounted with props only, no store or router
    it('blocks deleting a car in a trip and deletes a free one only after confirming', async () => {
      const busy = car('a', { status: 'in_use' })
      const free = car('b')
      let finish
      const confirmDelete = vi.fn(() => new Promise((resolve) => (finish = resolve)))
      wrapper = mount(AdminFleetTable, {
        props: { cars: [busy, free], confirmDelete },
        attachTo: document.body,
      })

      const busyDelete = wrapper.find('button[aria-label^="Delete Toyota Camry (not possible"]')
      expect(busyDelete.attributes('disabled')).toBeDefined()

      const deleteButtons = wrapper.findAll('button[aria-label="Delete Toyota Camry"]')
      expect(deleteButtons).toHaveLength(1)
      await deleteButtons[0].trigger('click')
      await vi.waitFor(() =>
        expect(bodyText()).toContain('Remove Toyota Camry (B-7) from the fleet?'),
      )
      expect(confirmDelete).not.toHaveBeenCalled()

      bodyButton('Remove').click()
      await flushPromises()

      expect(confirmDelete).toHaveBeenCalledWith(free)
      // The popconfirm waits for the returned request
      expect(bodyButton('Remove').classList.contains('ant-btn-loading')).toBe(true)
      finish()
      await flushPromises()
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

    it('shows a failed load as an error with Retry, not as an empty group (M11)', async () => {
      const store = makeStore([car('a', { status: 'reserved' })])
      vi.mocked(carsApi.listReserved)
        .mockRejectedValueOnce(new Error('Network error.'))
        .mockResolvedValueOnce([{ vin: 'VINA', userFirstName: 'Hanna', userLicenseNumber: 'AB1' }])
      wrapper = mountWith(ReservedCardsWidget, { store })
      await store.dispatch('admin/fleet/fetchWidgets')
      await flushPromises()

      expect(wrapper.text()).toContain('Reserved cars could not be loaded')
      expect(wrapper.text()).not.toContain('No reserved cars in this group')

      await wrapper
        .findAll('button')
        .find((b) => b.text() === 'Retry')
        .trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('Hanna')
    })

    it('lists a reserved car once, for its current driver (M13)', async () => {
      const store = makeStore([car('a', { status: 'reserved' })])
      store.commit('admin/trips/SET_ITEMS', [
        { _id: 't1', carId: 'a', endDate: null, userId: { licenseNumber: 'NOW222' } },
      ])
      vi.mocked(carsApi.listReserved).mockResolvedValue([
        { vin: 'VINA', userFirstName: 'Old', userLastName: 'Booker', userLicenseNumber: 'OLD111' },
        { vin: 'VINA', userFirstName: 'Vera', userLastName: 'Now', userLicenseNumber: 'NOW222' },
        { vin: 'VINA', userFirstName: 'Vera', userLastName: 'Now', userLicenseNumber: 'NOW222' },
      ])
      wrapper = mountWith(ReservedCardsWidget, { store })
      await store.dispatch('admin/fleet/fetchReserved', false)
      await flushPromises()

      expect(wrapper.findAll('li')).toHaveLength(1)
      expect(wrapper.text()).toContain('Vera Now')
      expect(wrapper.text()).not.toContain('Old Booker')
    })
  })

  describe('LowFuelAlerts', () => {
    it('shows a failed load as an error, not as "no low-fuel cars" (M11)', async () => {
      const store = makeStore()
      vi.mocked(carsApi.listInUseLowFuel).mockRejectedValueOnce(new Error('Network error.'))
      vi.mocked(carsApi.listReserved).mockResolvedValue([])
      wrapper = mountWith(LowFuelAlerts, { store })
      await store.dispatch('admin/fleet/fetchWidgets')
      await flushPromises()

      expect(wrapper.text()).toContain('Fuel alerts could not be loaded')
      expect(wrapper.text()).not.toContain('No low-fuel cars')
    })
  })
})
