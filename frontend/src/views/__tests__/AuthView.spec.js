import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import * as authApi from '@/api/auth'
import auth from '@/store/modules/auth'
import notify from '@/utils/notify'
import AuthView from '../AuthView.vue'

vi.mock('@/api/auth', () => ({ signIn: vi.fn(), signUp: vi.fn(), logout: vi.fn() }))
vi.mock('@/utils/notify', () => ({ default: { success: vi.fn(), warning: vi.fn() } }))

const USER = { _id: 'u1', email: 'vera@carshes.by', firstName: 'Vera', role: 'user' }
const Stub = { template: '<div />' }

describe('AuthView', () => {
  let wrapper
  let router

  const setup = async (path = '/auth') => {
    const store = createStore({ strict: true, modules: { auth } })
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/auth', name: 'auth', component: AuthView },
        { path: '/fleet', name: 'fleet', component: Stub },
        { path: '/trips', name: 'my-trips', component: Stub },
      ],
    })
    await router.push(path)
    wrapper = mount(AuthView, { global: { plugins: [store, router] }, attachTo: document.body })
    return wrapper
  }

  const tab = (value) => wrapper.find(`#auth-tab-${value}`)

  const signIn = async () => {
    await wrapper.find('input[autocomplete="email"]').setValue('vera@carshes.by')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')
  }

  beforeEach(() => {
    vi.mocked(authApi.signIn).mockReset()
    vi.mocked(authApi.signUp).mockReset()
    vi.mocked(notify.success).mockReset()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('opens the sign-in tab by default and register with ?mode=signup', async () => {
    await setup()
    expect(tab('signin').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('input[autocomplete="current-password"]').exists()).toBe(true)
    wrapper.unmount()

    await setup('/auth?mode=signup')
    expect(tab('signup').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('input[autocomplete="new-password"]').exists()).toBe(true)
  })

  it('switches tabs through ?mode=, keeping the redirect and the e-mail', async () => {
    await setup('/auth?redirect=/trips')
    await wrapper.find('input[autocomplete="email"]').setValue('kept@carshes.by')

    await tab('signup').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ redirect: '/trips', mode: 'signup' })
    expect(wrapper.find('input[autocomplete="email"]').element.value).toBe('kept@carshes.by')
  })

  it('clears form errors when switching tabs', async () => {
    await setup()
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Password is required'))

    await tab('signup').trigger('click')
    await flushPromises()
    await tab('signin').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Password is required')
  })

  it('moves between tabs with the arrow keys', async () => {
    await setup()
    await tab('signin').trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()

    expect(router.currentRoute.value.query.mode).toBe('signup')
  })

  it('returns to ?redirect= after signing in', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({ user: USER, token: 'jwt' })
    await setup('/auth?redirect=/trips')
    await signIn()

    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/trips'))
    expect(notify.success).not.toHaveBeenCalled()
  })

  it.each(['//evil.example', 'https://evil.example', undefined])(
    'goes to the fleet when the redirect is %s',
    async (redirect) => {
      vi.mocked(authApi.signIn).mockResolvedValue({ user: USER, token: 'jwt' })
      await setup(redirect ? `/auth?redirect=${encodeURIComponent(redirect)}` : '/auth')
      await signIn()

      await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('fleet'))
    },
  )

  it('welcomes new users after registering', async () => {
    vi.mocked(authApi.signUp).mockResolvedValue({ user: USER, token: 'jwt' })
    await setup('/auth?mode=signup')
    for (const [autocomplete, value] of Object.entries({
      'given-name': 'Vera',
      'family-name': 'Davydova',
      off: 'MP1234567',
      email: 'vera@carshes.by',
    })) {
      await wrapper.find(`input[autocomplete="${autocomplete}"]`).setValue(value)
    }
    for (const input of wrapper.findAll('input[type="password"]')) {
      await input.setValue('password123')
    }
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('fleet'))
    expect(notify.success).toHaveBeenCalledWith('Welcome to Carshes, Vera!')
  })
})
