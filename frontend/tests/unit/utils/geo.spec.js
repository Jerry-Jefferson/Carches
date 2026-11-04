import { describe, it, expect } from 'vitest'

import {
  DEFAULT_CENTER,
  directionsUrl,
  distanceToCar,
  haversineDistance,
  mapUrl,
  toGeoJsonPoint,
  toLatLng,
  walkingMinutes,
} from '@/utils/geo'

describe('toLatLng', () => {
  it('reads GeoJSON [lng, lat] order', () => {
    expect(toLatLng({ type: 'Point', coordinates: [27.5615, 53.9023] })).toEqual({
      lat: 53.9023,
      lng: 27.5615,
    })
    expect(toLatLng([27.5615, 53.9023])).toEqual({ lat: 53.9023, lng: 27.5615 })
  })

  it.each([null, {}, { coordinates: [1] }, { coordinates: [200, 10] }, { coordinates: [10, 95] }])(
    'returns null for %o',
    (input) => {
      expect(toLatLng(input)).toBeNull()
    },
  )

  it('round-trips with toGeoJsonPoint', () => {
    const point = { lat: 53.9, lng: 27.5 }
    expect(toGeoJsonPoint(point)).toEqual({ type: 'Point', coordinates: [27.5, 53.9] })
    expect(toLatLng(toGeoJsonPoint(point))).toEqual(point)
  })
})

describe('haversineDistance', () => {
  it('is 0 for the same point', () => {
    expect(haversineDistance(DEFAULT_CENTER, DEFAULT_CENTER)).toBe(0)
  })

  it('measures one degree of latitude as ~111.2 km', () => {
    const d = haversineDistance({ lat: 53, lng: 27 }, { lat: 54, lng: 27 })
    expect(d).toBeGreaterThan(111000)
    expect(d).toBeLessThan(111400)
  })

  it('matches a known Minsk distance (centre → depot ≈ 1.95 km)', () => {
    const d = haversineDistance(DEFAULT_CENTER, { lat: 53.8883, lng: 27.5443 })
    expect(d).toBeGreaterThan(1900)
    expect(d).toBeLessThan(2000)
  })

  it('returns null for invalid points', () => {
    expect(haversineDistance(null, DEFAULT_CENTER)).toBeNull()
  })
})

describe('distanceToCar', () => {
  const car = { location: { type: 'Point', coordinates: [27.5615, 53.9023] } }

  it('uses the car location in [lng, lat] order', () => {
    // Swapping lat/lng would put the car ~3 000 km away
    expect(distanceToCar(DEFAULT_CENTER, car)).toBe(0)
  })

  it('returns null without an origin or location', () => {
    expect(distanceToCar(null, car)).toBeNull()
    expect(distanceToCar(DEFAULT_CENTER, {})).toBeNull()
  })
})

describe('walkingMinutes', () => {
  it.each([
    [0, 1],
    [80, 1],
    [81, 2],
    [1200, 15],
  ])('%d m → %d min', (meters, minutes) => {
    expect(walkingMinutes(meters)).toBe(minutes)
  })
})

describe('external map links', () => {
  const car = { lat: 53.9, lng: 27.56 }

  it('builds a map link to the point', () => {
    expect(mapUrl(car)).toBe(
      'https://www.openstreetmap.org/?mlat=53.9&mlon=27.56#map=17/53.9/27.56',
    )
  })

  it('builds walking directions with and without an origin', () => {
    expect(directionsUrl(car, { lat: 53.91, lng: 27.55 })).toBe(
      'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=53.91%2C27.55%3B53.9%2C27.56',
    )
    expect(directionsUrl(car)).toContain('route=%3B53.9%2C27.56')
  })
})
