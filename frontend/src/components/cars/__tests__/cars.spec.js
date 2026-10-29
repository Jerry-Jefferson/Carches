import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

import { DEFAULT_FILTERS } from '@/utils/fleetFilters'
import CarCard from '../CarCard.vue'
import FleetFilters from '../FleetFilters.vue'
import FleetHeader from '../FleetHeader.vue'
import FleetMap from '../FleetMap.vue'
import SortDropdown from '../SortDropdown.vue'

const CAR = {
  _id: 'car1',
  productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 },
  registrationNumber: '1234 AB-7',
  status: 'free',
  fuelLevel: 82,
  mileage: 18420,
  location: { type: 'Point', coordinates: [27.5615, 53.9023] },
}

const makeRouter = () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['fleet', 'car-details', 'my-trips'].map((name) => ({
      path: name === 'car-details' ? '/cars/:id' : `/${name}`,
      name,
      component: { template: '<div />' },
    })),
  })
  return router
}

// Numbers are grouped with a non-breaking space (ru-BY)
const text = (wrapper) => wrapper.text().replace(/\s+/g, ' ')

const mountWithRouter = (component, options = {}) =>
  mount(component, { ...options, global: { plugins: [makeRouter()], ...options.global } })

describe('CarCard', () => {
  it('shows the car data and books a free car', async () => {
    const wrapper = mountWithRouter(CarCard, { props: { car: CAR, distance: 1200 } })

    expect(wrapper.text()).toContain('Toyota Camry')
    expect(wrapper.text()).toContain('1234 AB-7')
    expect(wrapper.text()).toContain('Available')
    expect(wrapper.text()).toContain('2023')
    expect(text(wrapper)).toContain('18 420 km')
    expect(wrapper.text()).toContain('≈ 1.2 km • 15 min walk')
    expect(wrapper.find('a[href="/cars/car1"]').exists()).toBe(true)

    const book = wrapper.findAll('button').find((button) => button.text().includes('Book Now'))
    await book.trigger('click')
    expect(wrapper.emitted('book')).toEqual([[CAR]])
  })

  it('disables booking for other statuses and hides the distance without location', () => {
    const wrapper = mountWithRouter(CarCard, { props: { car: { ...CAR, status: 'in_use' } } })

    const button = wrapper.findAll('button').at(-1)
    expect(button.text()).toBe('In trip')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('walk')
  })
})

describe('FleetFilters', () => {
  const mountFilters = (props = {}) =>
    mount(FleetFilters, {
      props: {
        filters: { ...DEFAULT_FILTERS },
        brandCounts: { BMW: 2, Toyota: 3 },
        statusCounts: { free: 5, reserved: 1, in_use: 0, unavailable: 0, in_service: 0 },
        sort: 'fuel',
        ...props,
      },
      attachTo: document.body,
    })

  it('shows brand pills with counts and emits the chosen brand', async () => {
    const wrapper = mountFilters()
    const pills = wrapper.find('[aria-label="Brand"]').findAll('button')

    expect(pills.map((pill) => pill.text().replace(/\s+/g, ' '))).toEqual([
      'All cars 5',
      'BMW 2',
      'Toyota 3',
    ])
    await pills[2].trigger('click')

    expect(wrapper.emitted('change')).toEqual([[{ brand: 'Toyota' }]])
    wrapper.unmount()
  })

  it('keeps a selected brand that no longer matches visible', () => {
    const wrapper = mountFilters({ filters: { ...DEFAULT_FILTERS, brand: 'Audi' } })

    expect(wrapper.find('[aria-label="Brand"]').text()).toContain('Audi')
    wrapper.unmount()
  })

  it('turns off "Available only" and resets the status with it', async () => {
    const wrapper = mountFilters()

    await wrapper.find('.ant-switch').trigger('click')

    expect(wrapper.emitted('change')[0][0]).toEqual({ availableOnly: false, status: 'all' })
    wrapper.unmount()
  })

  it('offers Reset only when a filter is set', () => {
    const plain = mountFilters()
    const filtered = mountFilters({ filters: { ...DEFAULT_FILTERS, minFuel: 30 } })

    const hasReset = (wrapper) =>
      wrapper.findAll('button').some((button) => button.text() === 'Reset')
    expect(hasReset(plain)).toBe(false)
    expect(hasReset(filtered)).toBe(true)
    plain.unmount()
    filtered.unmount()
  })
})

describe('SortDropdown', () => {
  it('disables "Distance to you" without location', () => {
    const wrapper = mount(SortDropdown, { props: { value: 'fuel', distanceEnabled: false } })

    const distance = wrapper.vm.options.find((option) => option.value === 'distance')
    expect(distance.disabled).toBe(true)
    expect(distance.label).toContain('needs location')
  })
})

describe('FleetHeader', () => {
  it('asks for the location until it is known', async () => {
    const wrapper = mountWithRouter(FleetHeader, { props: { freeCount: 3, geoStatus: 'idle' } })

    expect(wrapper.text()).toContain('3 available cars')
    expect(wrapper.text()).toContain('Minsk • City centre')
    const button = wrapper.findAll('button').find((item) => item.text() === 'Use my location')
    await button.trigger('click')
    expect(wrapper.emitted('locate')).toHaveLength(1)
  })

  it('links to the nearest free car', () => {
    const wrapper = mountWithRouter(FleetHeader, {
      props: { freeCount: 1, geoStatus: 'granted', nearest: { car: CAR, distance: 320 } },
    })

    expect(wrapper.text()).toContain('Minsk • Your location')
    expect(wrapper.text()).toContain('1 available car')
    const link = wrapper.find('a[href="/cars/car1"]')
    expect(link.text()).toBe('320 m • ≈ 4 min')
  })

  it('explains a refused location and toggles the map', async () => {
    const wrapper = mountWithRouter(FleetHeader, { props: { geoStatus: 'denied' } })

    expect(wrapper.text()).toContain('Location unavailable')
    const mapButton = wrapper.findAll('button').find((item) => item.text().includes('Map View'))
    await mapButton.trigger('click')
    expect(wrapper.emitted('toggle-map')).toHaveLength(1)
  })
})

describe('FleetMap', () => {
  const MapViewStub = {
    name: 'MapView',
    props: ['markers', 'userLocation'],
    template: '<div class="map-stub" />',
  }

  const mountMap = (props) =>
    mountWithRouter(FleetMap, { props, global: { stubs: { MapView: MapViewStub } } })

  it('passes one marker per car with a location, coloured by status', () => {
    const cars = [
      CAR,
      { ...CAR, _id: 'car2', status: 'in_use' },
      { ...CAR, _id: 'x', location: null },
    ]
    const wrapper = mountMap({ cars })

    const markers = wrapper.findComponent(MapViewStub).props('markers')
    expect(markers).toEqual([
      expect.objectContaining({ id: 'car1', lat: 53.9023, lng: 27.5615, tone: 'success' }),
      expect.objectContaining({ id: 'car2', tone: 'info' }),
    ])
    expect(wrapper.text()).toContain('2 cars on the map')
  })

  it('counts cars within 1.5 km of the user and emits close', async () => {
    const wrapper = mountMap({
      cars: [CAR, { ...CAR, _id: 'car2' }],
      distances: { car1: 400, car2: 4000 },
      userLocation: { lat: 53.9, lng: 27.56 },
    })

    expect(wrapper.text()).toContain('1 car within 1.5 km')
    await wrapper.find('button[aria-label="Close map"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
