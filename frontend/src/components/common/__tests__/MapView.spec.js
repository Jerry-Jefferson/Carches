import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import MapView from '../MapView.vue'

// Minimal Leaflet double: records markers and map handlers
const leaflet = vi.hoisted(() => {
  const state = {
    markers: [],
    mapHandlers: {},
    fitBounds: vi.fn(),
    setView: vi.fn(),
    remove: vi.fn(),
  }
  const map = {
    setView: (...args) => {
      state.setView(...args)
      return map
    },
    fitBounds: state.fitBounds,
    getZoom: () => 13,
    on: (event, handler) => {
      state.mapHandlers[event] = handler
      return map
    },
    invalidateSize: vi.fn(),
    remove: state.remove,
  }
  const layer = {
    addTo: () => layer,
    clearLayers: () => {
      state.markers = []
    },
  }
  const L = {
    map: vi.fn(() => map),
    tileLayer: () => ({ addTo: () => {} }),
    layerGroup: () => layer,
    divIcon: (options) => options,
    marker: (latlng, options) => {
      const handlers = {}
      const marker = {
        latlng,
        options,
        handlers,
        on: (event, handler) => {
          handlers[event] = handler
          return marker
        },
        addTo: () => {
          state.markers.push(marker)
          return marker
        },
        getLatLng: () => latlng,
      }
      return marker
    },
    popup: () => ({ setLatLng: () => ({ setContent: () => ({ openOn: vi.fn() }) }) }),
  }
  return { L, state }
})

vi.mock('leaflet', () => ({ default: leaflet.L }))
vi.mock('leaflet/dist/leaflet.css', () => ({}))

const MARKERS = [
  { id: 'a', lat: 53.9, lng: 27.56, tone: 'success', label: 'Toyota Camry' },
  { id: 'b', lat: 53.91, lng: 27.57, tone: 'info', label: 'BMW X5' },
]

describe('MapView', () => {
  let wrapper

  const mountMap = async (props = {}) => {
    wrapper = mount(MapView, { props: { markers: MARKERS, ...props }, attachTo: document.body })
    await vi.waitFor(() => expect(wrapper.emitted('ready')).toBeTruthy())
    return wrapper
  }

  beforeEach(() => {
    leaflet.state.markers = []
    leaflet.state.mapHandlers = {}
    leaflet.state.fitBounds.mockClear()
    leaflet.state.remove.mockClear()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('draws one labelled marker per item, coloured by tone, and fits them', async () => {
    await mountMap()

    expect(leaflet.state.markers).toHaveLength(2)
    expect(leaflet.state.markers[0].latlng).toEqual([53.9, 27.56])
    expect(leaflet.state.markers[0].options.title).toBe('Toyota Camry')
    expect(leaflet.state.markers[0].options.icon.html).toContain('bg-success')
    expect(leaflet.state.fitBounds).toHaveBeenCalled()
  })

  it('adds the user location and redraws when markers change', async () => {
    await mountMap({ userLocation: { lat: 53.92, lng: 27.58 } })
    expect(leaflet.state.markers).toHaveLength(3)

    await wrapper.setProps({ markers: MARKERS.slice(0, 1) })
    expect(leaflet.state.markers).toHaveLength(2)
  })

  it('emits marker-click with the marker id', async () => {
    await mountMap()

    leaflet.state.markers[1].handlers.click()

    expect(wrapper.emitted('marker-click')).toEqual([['b']])
  })

  it('emits pick on map click only when pickable', async () => {
    await mountMap({ pickable: true })

    leaflet.state.mapHandlers.click({ latlng: { lat: 53.95, lng: 27.6 } })

    expect(wrapper.emitted('pick')).toEqual([[{ lat: 53.95, lng: 27.6 }]])
  })

  it('removes the map on unmount', async () => {
    await mountMap()

    wrapper.unmount()
    wrapper = null

    expect(leaflet.state.remove).toHaveBeenCalled()
  })
})
