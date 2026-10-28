import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createStore } from 'vuex'
import Antd from 'ant-design-vue'

import App from '@/App.vue'
import HomeView from '@/views/HomeView.vue'

describe('App', () => {
  it('renders the home page through the router', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomeView }],
    })
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: { plugins: [router, createStore({}), Antd] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Carshes')
    expect(wrapper.find('button, a.ant-btn').exists()).toBe(true)
  })
})
