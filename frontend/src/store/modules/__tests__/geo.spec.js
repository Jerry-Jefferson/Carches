import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createStore } from 'vuex'

import { DEFAULT_CENTER } from '@/utils/geo'
import geo from '../geo'

const makeStore = () => createStore({ strict: true, modules: { geo } })

const mockGeolocation = (impl) => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: vi.fn(impl) },
  })
}

const POSITION = { coords: { latitude: 53.91, longitude: 27.55 } }

describe('geo module', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    delete navigator.geolocation
  })

  it('falls back to Minsk centre without a location', () => {
    const store = makeStore()

    expect(store.getters['geo/hasLocation']).toBe(false)
    expect(store.getters['geo/origin']).toEqual(DEFAULT_CENTER)
  })

  it('locate stores the coordinates and remembers the answer', async () => {
    mockGeolocation((resolve) => resolve(POSITION))
    const store = makeStore()

    await store.dispatch('geo/locate')

    expect(store.state.geo.status).toBe('granted')
    expect(store.getters['geo/origin']).toEqual({ lat: 53.91, lng: 27.55 })
    expect(sessionStorage.getItem('carshes.geo')).toBe('granted')
  })

  it('locate does not throw when the user refuses', async () => {
    mockGeolocation((resolve, reject) => reject(new Error('denied')))
    const store = makeStore()

    await store.dispatch('geo/locate')

    expect(store.state.geo.status).toBe('denied')
    expect(store.getters['geo/hasLocation']).toBe(false)
  })

  it('reports browsers without geolocation', async () => {
    const store = makeStore()

    await store.dispatch('geo/locate')

    expect(store.state.geo.status).toBe('unsupported')
  })

  it('init re-locates only after an earlier "yes" in this tab', async () => {
    mockGeolocation((resolve) => resolve(POSITION))

    const fresh = makeStore()
    await fresh.dispatch('geo/init')
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(fresh.state.geo.status).toBe('idle')

    sessionStorage.setItem('carshes.geo', 'granted')
    const returning = makeStore()
    await returning.dispatch('geo/init')
    expect(returning.state.geo.status).toBe('granted')

    sessionStorage.setItem('carshes.geo', 'denied')
    const refused = makeStore()
    await refused.dispatch('geo/init')
    expect(refused.state.geo.status).toBe('denied')
  })
})
