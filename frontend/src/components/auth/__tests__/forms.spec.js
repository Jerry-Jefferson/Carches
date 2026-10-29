import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'

import * as authApi from '@/api/auth'
import auth from '@/store/modules/auth'
import RegisterForm from '../RegisterForm.vue'
import SignInForm from '../SignInForm.vue'

vi.mock('@/api/auth', () => ({ signIn: vi.fn(), signUp: vi.fn(), logout: vi.fn() }))

const USER = { _id: 'u1', email: 'vera@carshes.by', firstName: 'Vera', role: 'user' }
const apiError = (message, statusCode) => Object.assign(new Error(message), { statusCode })

describe('auth forms', () => {
  let wrapper
  let store

  const mountForm = (component, props = {}) => {
    store = createStore({ strict: true, modules: { auth } })
    wrapper = mount(component, { props, global: { plugins: [store] }, attachTo: document.body })
    return wrapper
  }

  const input = (selector) => wrapper.find(selector)
  const submit = () => wrapper.find('form').trigger('submit')

  beforeEach(() => {
    vi.mocked(authApi.signIn).mockReset()
    vi.mocked(authApi.signUp).mockReset()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('SignInForm', () => {
    const fill = async ({ email = 'vera@carshes.by', password = 'password123' } = {}) => {
      await input('input[autocomplete="email"]').setValue(email)
      await input('input[type="password"]').setValue(password)
    }

    it('starts with the e-mail passed in', () => {
      mountForm(SignInForm, { email: 'kept@carshes.by' })

      expect(input('input[autocomplete="email"]').element.value).toBe('kept@carshes.by')
    })

    it('shows validation errors and does not call the API', async () => {
      mountForm(SignInForm)
      await submit()

      await vi.waitFor(() => expect(wrapper.text()).toContain('Email is required'))
      expect(wrapper.text()).toContain('Password is required')
      expect(authApi.signIn).not.toHaveBeenCalled()
    })

    it('signs in, remembers the token when asked and emits success', async () => {
      vi.mocked(authApi.signIn).mockResolvedValue({ user: USER, token: 'jwt' })
      mountForm(SignInForm)
      await fill()
      await input('input[type="checkbox"]').setValue(true)
      await submit()

      await vi.waitFor(() => expect(wrapper.emitted('success')).toBeTruthy())
      expect(authApi.signIn).toHaveBeenCalledWith({
        email: 'vera@carshes.by',
        password: 'password123',
      })
      expect(wrapper.emitted('success')[0][0]).toEqual(USER)
      expect(store.state.auth.remember).toBe(true)
      expect(localStorage.getItem('carshes.token')).toBe('jwt')
    })

    it('emits the e-mail as it is typed', async () => {
      mountForm(SignInForm)
      await input('input[autocomplete="email"]').setValue('v@c.by')

      expect(wrapper.emitted('update:email').at(-1)).toEqual(['v@c.by'])
    })

    it('shows wrong credentials as a form-level alert', async () => {
      vi.mocked(authApi.signIn).mockRejectedValue(apiError('Invalid email or password', 401))
      mountForm(SignInForm)
      await fill()
      await submit()

      await vi.waitFor(() =>
        expect(wrapper.find('.ant-alert').text()).toContain('Invalid email or password'),
      )
      expect(wrapper.emitted('success')).toBeUndefined()
    })
  })

  describe('RegisterForm', () => {
    const fill = async ({ password, confirmPassword, ...overrides } = {}) => {
      const values = {
        'given-name': 'Vera',
        'family-name': 'Davydova',
        off: 'mp1234567',
        email: 'vera@carshes.by',
        ...overrides,
      }
      for (const [autocomplete, value] of Object.entries(values)) {
        await input(`input[autocomplete="${autocomplete}"]`).setValue(value)
      }
      const passwords = wrapper.findAll('input[type="password"]')
      await passwords[0].setValue(password ?? 'password123')
      await passwords[1].setValue(confirmPassword ?? 'password123')
    }

    it('requires matching passwords', async () => {
      mountForm(RegisterForm)
      await fill({ confirmPassword: 'different1' })
      await submit()

      await vi.waitFor(() => expect(wrapper.text()).toContain('Passwords do not match'))
      expect(authApi.signUp).not.toHaveBeenCalled()
    })

    it('upper-cases the licence number on blur', async () => {
      mountForm(RegisterForm)
      const licence = input('input[autocomplete="off"]')
      await licence.setValue(' mp1234567 ')
      await licence.trigger('blur')

      await vi.waitFor(() => expect(licence.element.value).toBe('MP1234567'))
    })

    it('sends only the backend fields and emits success', async () => {
      vi.mocked(authApi.signUp).mockResolvedValue({ user: USER, token: 'jwt' })
      mountForm(RegisterForm)
      await fill()
      await submit()

      await vi.waitFor(() => expect(wrapper.emitted('success')).toBeTruthy())
      expect(authApi.signUp).toHaveBeenCalledWith({
        email: 'vera@carshes.by',
        password: 'password123',
        firstName: 'Vera',
        lastName: 'Davydova',
        licenseNumber: 'MP1234567',
      })
      expect(sessionStorage.getItem('carshes.token')).toBe('jwt')
    })

    it.each([
      ['A user with this email already exists', 'input[autocomplete="email"]'],
      ['A user with this license number already exists', 'input[autocomplete="off"]'],
    ])('shows "%s" on its field', async (message, selector) => {
      vi.mocked(authApi.signUp).mockRejectedValue(apiError(message, 409))
      mountForm(RegisterForm)
      await fill()
      await submit()

      await vi.waitFor(() => {
        const item = input(selector).element.closest('.ant-form-item')
        expect(item.textContent).toContain(message)
      })
      expect(wrapper.find('.ant-alert').exists()).toBe(false)
    })

    it('shows other errors as a form-level alert', async () => {
      vi.mocked(authApi.signUp).mockRejectedValue(
        apiError('Network error. Check your connection.', null),
      )
      mountForm(RegisterForm)
      await fill()
      await submit()

      await vi.waitFor(() => expect(wrapper.find('.ant-alert').text()).toContain('Network error'))
    })
  })
})
