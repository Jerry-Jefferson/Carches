import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as authApi from '@/api/auth'
import auth from '@/store/modules/auth'
import AppFooter from '../AppFooter.vue'
import HeaderSearch from '../HeaderSearch.vue'
import MainNav from '../MainNav.vue'
import UserMenu from '../UserMenu.vue'

vi.mock('@/api/auth', () => ({ logout: vi.fn() }))

const USER = { email: 'vera@carshes.by', firstName: 'Vera', lastName: 'Davydova', role: 'user' }
const Stub = { template: '<div />' }

const setup = async ({ user = USER, path = '/fleet' } = {}) => {
  const store = createStore({ strict: true, modules: { auth } })
  if (user) store.commit('auth/SET_SESSION', { user, token: 'jwt', remember: false })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['auth', 'fleet', 'my-trips', 'my-profile', 'admin'].map((name) => ({
      path: `/${name}`,
      name,
      component: Stub,
    })),
  })
  await router.push(path)
  return { store, router, plugins: [store, router] }
}

describe('MainNav', () => {
  it('shows Fleet and My Trips to users and marks the current page', async () => {
    const { plugins } = await setup()
    const wrapper = mount(MainNav, { global: { plugins } })

    expect(wrapper.text()).toContain('Fleet')
    expect(wrapper.text()).toContain('My Trips')
    expect(wrapper.text()).not.toContain('Admin Panel')
    expect(wrapper.find('[aria-current="page"]').text()).toBe('Fleet')
  })

  it('adds Admin Panel for admins', async () => {
    const { plugins } = await setup({ user: { ...USER, role: 'admin' } })
    const wrapper = mount(MainNav, { global: { plugins } })

    expect(wrapper.text()).toContain('Admin Panel')
  })
})

describe('HeaderSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates ?q= on the fleet page after a pause, keeping other filters', async () => {
    const { router, plugins } = await setup({ path: '/fleet?brand=BMW' })
    const wrapper = mount(HeaderSearch, { global: { plugins } })

    await wrapper.find('input').setValue('camry')
    expect(router.currentRoute.value.query.q).toBeUndefined()
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ brand: 'BMW', q: 'camry' })
  })

  it('opens the fleet with the query on Enter from another page', async () => {
    const { router, plugins } = await setup({ path: '/my-trips' })
    const wrapper = mount(HeaderSearch, { global: { plugins } })

    await wrapper.find('input').setValue('  bmw ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/fleet?q=bmw')
  })

  it('follows ?q= when the URL changes', async () => {
    const { router, plugins } = await setup({ path: '/fleet?q=audi' })
    const wrapper = mount(HeaderSearch, { global: { plugins } })
    expect(wrapper.find('input').element.value).toBe('audi')

    await router.replace('/fleet')
    await flushPromises()

    expect(wrapper.find('input').element.value).toBe('')
  })
})

describe('UserMenu', () => {
  it('shows the user and logs out to /auth', async () => {
    vi.mocked(authApi.logout).mockResolvedValue()
    const { store, router, plugins } = await setup()
    const wrapper = mount(UserMenu, { global: { plugins }, attachTo: document.body })

    expect(wrapper.text()).toContain('Vera Davydova')
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Log out'))

    const logout = [...document.querySelectorAll('.ant-dropdown-menu-item')].find((item) =>
      item.textContent.includes('Log out'),
    )
    logout.click()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('auth'))

    expect(authApi.logout).toHaveBeenCalled()
    expect(store.getters['auth/isAuthenticated']).toBe(false)
    wrapper.unmount()
  })
})

describe('AppFooter', () => {
  it('links to existing pages and shows support contacts', async () => {
    const { plugins } = await setup()
    const wrapper = mount(AppFooter, { global: { plugins } })

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['/fleet', '/my-trips', '/my-profile']))
    expect(hrefs.some((href) => href.startsWith('mailto:'))).toBe(true)
    expect(wrapper.text()).toContain(`© ${new Date().getFullYear()} Carshes`)
  })
})
