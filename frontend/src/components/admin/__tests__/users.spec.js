import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as usersApi from '@/api/users'
import admin from '@/store/modules/admin'
import auth from '@/store/modules/auth'
import cars from '@/store/modules/cars'
import geo from '@/store/modules/geo'
import AdminUsersSection from '../AdminUsersSection.vue'
import AdminUsersTable from '../AdminUsersTable.vue'
import UserDetailsDrawer from '../UserDetailsDrawer.vue'
import UserFormModal from '../UserFormModal.vue'

vi.mock('@/api/users', () => ({
  getMe: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@/api/bookings', () => ({
  listMine: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
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
vi.mock('@/utils/notify', () => ({
  default: { success: vi.fn(), error: vi.fn(), apiError: vi.fn() },
}))

const HOUR = 3600000
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString()

const ADMIN = {
  _id: 'admin1',
  email: 'admin@carshes.local',
  role: 'admin',
  firstName: 'Ada',
  lastName: 'Admin',
  licenseNumber: 'ADMIN0001',
  createdAt: '2026-01-10T10:00:00.000Z',
}
const HANNA = {
  _id: 'user1',
  email: 'hanna@carshes.test',
  role: 'user',
  firstName: 'Hanna',
  lastName: 'Paulava',
  licenseNumber: 'AB123456',
  createdAt: '2026-03-14T10:00:00.000Z',
}
const CAR = {
  _id: 'car1',
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 },
  registrationNumber: '1234 AB-7',
  status: 'in_use',
}
const TRIPS = [
  {
    _id: 'trip1',
    userId: HANNA,
    carId: { _id: 'car1', vin: 'VIN1', registrationNumber: '1234 AB-7' },
    startDate: iso(-HOUR),
    endDate: null,
  },
  {
    _id: 'trip2',
    userId: HANNA,
    carId: { _id: 'gone', vin: 'VIN2', registrationNumber: '9999 ZZ-7' },
    startDate: iso(-5 * HOUR),
    endDate: iso(-4 * HOUR),
  },
]

const makeStore = () => {
  const store = createStore({ strict: true, modules: { admin, auth, cars, geo } })
  store.commit('auth/SET_SESSION', { user: ADMIN, token: 't', remember: false })
  store.commit('admin/users/SET_ITEMS', [ADMIN, HANNA])
  store.commit('admin/trips/SET_ITEMS', TRIPS)
  store.commit('cars/SET_ITEMS', [CAR])
  return store
}

const makeRouter = async (path = '/admin?tab=users') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin', name: 'admin', component: { template: '<div />' } }],
  })
  await router.push(path)
  return router
}

const mountWith = async (component, { props = {}, store = makeStore(), path } = {}) => {
  const router = await makeRouter(path)
  const wrapper = mount(component, {
    props,
    global: { plugins: [store, router] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, store, router }
}

const normalise = (value) => value.replace(/\s+/g, ' ')
const bodyText = () => normalise(document.body.textContent)
const bodyButton = (label) =>
  [...document.body.querySelectorAll('button')].find((button) => button.textContent.includes(label))
const formItem = (label) =>
  [...document.body.querySelectorAll('.ant-form-item')].find((item) =>
    item.querySelector('label')?.textContent.includes(label),
  )
const typeInto = async (label, value) => {
  const input = formItem(label).querySelector('input')
  input.value = value
  input.dispatchEvent(new Event('input'))
  await flushPromises()
}

describe('admin users section', () => {
  let wrapper

  beforeEach(() => {
    vi.mocked(usersApi.getById).mockReset()
    vi.mocked(usersApi.update).mockReset()
    vi.mocked(usersApi.remove).mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('shows trip counts and hides Delete for the current admin', async () => {
    ;({ wrapper } = await mountWith(AdminUsersTable, { props: { users: [ADMIN, HANNA] } }))

    const rows = wrapper.findAll('tbody tr.ant-table-row')
    expect(rows).toHaveLength(2)
    expect(normalise(rows[1].text())).toContain('1 / 2')
    expect(normalise(rows[0].text())).toContain('0 / 0')
    expect(wrapper.find('button[aria-label="Delete Ada Admin"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Delete Hanna Paulava"]').exists()).toBe(true)
  })

  it('deletes a user after confirmation, warning about an active trip', async () => {
    vi.mocked(usersApi.remove).mockResolvedValue()
    let store
    ;({ wrapper, store } = await mountWith(AdminUsersSection))

    await wrapper.find('button[aria-label="Delete Hanna Paulava"]').trigger('click')
    await vi.waitFor(() =>
      expect(bodyText()).toContain(
        'Delete Hanna Paulava? Their credit cards will also be removed. They have an active trip.',
      ),
    )
    bodyButton('Delete').click()
    await flushPromises()

    expect(usersApi.remove).toHaveBeenCalledWith('user1')
    expect(store.state.admin.users.items.map((user) => user._id)).toEqual(['admin1'])
  })

  it('filters by role with counts', async () => {
    ;({ wrapper } = await mountWith(AdminUsersSection))
    const pills = wrapper.find('[aria-label="Role"]').findAll('button')
    expect(pills.map((pill) => normalise(pill.text()))).toEqual(['All 2', 'Users 1', 'Admins 1'])

    await pills[2].trigger('click')

    expect(wrapper.findAll('tbody tr.ant-table-row')).toHaveLength(1)
    expect(wrapper.text()).toContain('Showing 1 of 2 users')
  })

  it('opens the focused user, clearing filters that hide them', async () => {
    vi.mocked(usersApi.getById).mockResolvedValue(HANNA)
    const store = makeStore()
    store.commit('admin/users/SET_FILTERS', { role: 'admin' })
    let router
    ;({ wrapper, router } = await mountWith(AdminUsersSection, {
      store,
      props: { focusId: 'user1' },
      path: '/admin?tab=users&user=user1',
    }))

    expect(store.state.admin.users.filters.role).toBe('all')
    expect(wrapper.find('tr.bg-primary\\/15').exists()).toBe(true)
    await vi.waitFor(() => expect(bodyText()).toContain('User details'))

    bodyButton('Close').click()
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'users' })
  })

  it('details drawer fetches the user and lists their trips', async () => {
    vi.mocked(usersApi.getById).mockResolvedValue({ ...HANNA, lastName: 'Klimovich' })
    let router
    ;({ wrapper, router } = await mountWith(UserDetailsDrawer, {
      props: { open: true, userId: 'user1' },
    }))

    expect(usersApi.getById).toHaveBeenCalledWith('user1')
    await vi.waitFor(() => expect(bodyText()).toContain('Hanna Klimovich'))
    expect(bodyText()).toContain('Trips (2)')
    expect(bodyText()).toContain('Toyota Camry')
    expect(bodyText()).toContain('Car no longer in fleet')

    bodyButton('Details').click()
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ tab: 'trips', trip: 'trip1' })
  })

  describe('UserFormModal', () => {
    const mountForm = () => mountWith(UserFormModal, { props: { open: true, user: HANNA } })

    it('validates the licence number like sign-up', async () => {
      ;({ wrapper } = await mountForm())

      await typeInto('licence', 'AB1')
      bodyButton('Save changes').click()

      await vi.waitFor(() =>
        expect(bodyText()).toContain('Licence number must be at least 6 characters long'),
      )
      expect(usersApi.update).not.toHaveBeenCalled()
      expect(bodyText()).toContain("Roles can't be changed here.")
    })

    it('sends only the four profile fields', async () => {
      vi.mocked(usersApi.update).mockResolvedValue({ ...HANNA, firstName: 'Anna' })
      let store
      ;({ wrapper, store } = await mountForm())

      await typeInto('First name', 'Anna')
      bodyButton('Save changes').click()

      await vi.waitFor(() => expect(usersApi.update).toHaveBeenCalled())
      const [id, changes] = vi.mocked(usersApi.update).mock.calls[0]
      expect(id).toBe('user1')
      expect(changes).toEqual({
        firstName: 'Anna',
        lastName: 'Paulava',
        email: 'hanna@carshes.test',
        licenseNumber: 'AB123456',
      })
      await vi.waitFor(() => expect(wrapper.emitted('saved')).toBeTruthy())
      expect(store.getters['admin/users/byId']('user1').firstName).toBe('Anna')
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    it('puts a duplicate e-mail error on the e-mail field', async () => {
      vi.mocked(usersApi.update).mockRejectedValue(
        new Error('Duplicate field value entered: taken@carshes.test. Please use another value'),
      )
      ;({ wrapper } = await mountForm())

      await typeInto('E-mail', 'taken@carshes.test')
      bodyButton('Save changes').click()

      await vi.waitFor(() =>
        expect(formItem('E-mail').textContent).toContain('A user with this email already exists'),
      )
      expect(wrapper.emitted('update:open')).toBeUndefined()
    })
  })
})
