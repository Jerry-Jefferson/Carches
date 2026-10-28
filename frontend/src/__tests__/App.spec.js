import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'

import App from '@/App.vue'
import auth from '@/store/modules/auth'

const mountAt = async (path) => {
  const store = createStore({ modules: { auth } })
  store.commit('auth/SET_SESSION', {
    user: { email: 'a@carshes.by', firstName: 'Ann', lastName: 'Lee', role: 'admin' },
    token: 'jwt',
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/auth',
        name: 'auth',
        component: { template: '<p>auth page</p>' },
        meta: { layout: 'auth' },
      },
      { path: '/fleet', name: 'fleet', component: { template: '<p>fleet page</p>' } },
      // Linked from the header and footer
      { path: '/trips', name: 'my-trips', component: {} },
      { path: '/profile', name: 'my-profile', component: {} },
      {
        path: '/admin',
        name: 'admin',
        component: { template: '<p>admin page</p>' },
        meta: { layout: 'admin' },
      },
    ],
  })
  router.push(path)
  await router.isReady()

  const wrapper = mount(App, { global: { plugins: [router, store] } })
  await flushPromises()
  return wrapper
}

describe('App', () => {
  it('wraps app pages in the header and footer', async () => {
    const wrapper = await mountAt('/fleet')

    expect(wrapper.text()).toContain('fleet page')
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('footer').exists()).toBe(true)
  })

  it('renders the auth page without app chrome', async () => {
    const wrapper = await mountAt('/auth')

    expect(wrapper.text()).toContain('auth page')
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('footer').exists()).toBe(false)
  })

  it('renders admin pages in the admin layout', async () => {
    const wrapper = await mountAt('/admin')

    expect(wrapper.text()).toContain('admin page')
    expect(wrapper.find('aside[aria-label="Admin"]').exists()).toBe(true)
    expect(wrapper.find('footer').exists()).toBe(false)
  })
})
