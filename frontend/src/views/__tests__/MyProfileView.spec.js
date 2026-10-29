import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as authApi from '@/api/auth'
import * as usersApi from '@/api/users'
import auth from '@/store/modules/auth'
import MyProfileView from '../MyProfileView.vue'

vi.mock('@/api/auth', () => ({ logout: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }))
vi.mock('@/api/users', () => ({ getMe: vi.fn() }))

const USER = {
  _id: 'u1',
  email: 'hanna@carshes.test',
  role: 'user',
  firstName: 'Hanna',
  lastName: 'Paulava',
  licenseNumber: 'AB123456',
  createdAt: '2026-03-14T10:00:00.000Z',
}

const setup = async (user = USER) => {
  const store = createStore({ strict: true, modules: { auth } })
  store.commit('auth/SET_SESSION', { user, token: 't', remember: false })
  const Stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['auth', 'admin', 'my-profile'].map((name) => ({
      path: `/${name}`,
      name,
      component: Stub,
    })),
  })
  await router.push('/my-profile')
  const wrapper = mount(MyProfileView, { global: { plugins: [store, router] } })
  await flushPromises()
  return { wrapper, store, router }
}

const text = (wrapper) => wrapper.text().replace(/\s+/g, ' ')
const button = (wrapper, label) =>
  wrapper.findAll('button').find((item) => item.text().includes(label))

describe('MyProfileView', () => {
  let wrapper

  beforeEach(() => {
    vi.mocked(usersApi.getMe).mockReset()
    vi.mocked(authApi.logout).mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('shows the fresh profile, read-only', async () => {
    vi.mocked(usersApi.getMe).mockResolvedValue({ ...USER, lastName: 'Klimovich' })
    ;({ wrapper } = await setup())

    expect(usersApi.getMe).toHaveBeenCalled()
    expect(text(wrapper)).toContain('Hanna Klimovich')
    expect(text(wrapper)).toContain('hanna@carshes.test')
    expect(text(wrapper)).toContain('AB123456')
    expect(text(wrapper)).toContain('Member since 14 Mar 2026')
    expect(text(wrapper)).toContain('To change your details, contact support')
    expect(wrapper.find('input').exists()).toBe(false)
    expect(button(wrapper, 'Admin console')).toBeUndefined()
  })

  it('keeps the session copy when the refresh fails', async () => {
    vi.mocked(usersApi.getMe).mockRejectedValue(new Error('Network error.'))
    ;({ wrapper } = await setup())

    expect(text(wrapper)).toContain('Hanna Paulava')
  })

  it('offers the admin console to admins', async () => {
    const admin = { ...USER, role: 'admin' }
    vi.mocked(usersApi.getMe).mockResolvedValue(admin)
    let router
    ;({ wrapper, router } = await setup(admin))

    expect(text(wrapper)).toContain('Administrator')
    await button(wrapper, 'Admin console').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('admin')
  })

  it('logs out and goes to the sign-in page', async () => {
    vi.mocked(usersApi.getMe).mockResolvedValue(USER)
    vi.mocked(authApi.logout).mockResolvedValue()
    let store, router
    ;({ wrapper, store, router } = await setup())

    await button(wrapper, 'Log out').trigger('click')
    await flushPromises()

    expect(authApi.logout).toHaveBeenCalled()
    expect(store.state.auth.user).toBeNull()
    expect(router.currentRoute.value.name).toBe('auth')
  })
})
