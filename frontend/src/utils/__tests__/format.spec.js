import { describe, it, expect } from 'vitest'

import {
  carName,
  formatCoords,
  formatDate,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatKm,
  formatMoney,
  formatNumber,
  formatPercent,
  formatTime,
  formatWalk,
  initials,
  shortId,
} from '@/utils/format'

// ru-BY groups digits with a no-break space
const NBSP = ' '

describe('number formatters', () => {
  it.each([
    [formatMoney, 6400, `6${NBSP}400,00${NBSP}Br`],
    [formatNumber, 18420, `18${NBSP}420`],
    [formatNumber, 999, '999'],
    [formatKm, 18420, `18${NBSP}420 km`],
    [formatKm, 0, '0 km'],
    [formatPercent, 82, `82${NBSP}%`],
    [formatPercent, 0, `0${NBSP}%`],
  ])('%o(%o) → %o', (format, input, expected) => {
    expect(format(input)).toBe(expected)
  })

  it.each([formatMoney, formatNumber, formatKm, formatPercent])(
    'returns a dash for missing values',
    (format) => {
      expect(format(null)).toBe('—')
      expect(format(undefined)).toBe('—')
      expect(format(NaN)).toBe('—')
    },
  )
})

describe('distance formatters', () => {
  it.each([
    [0, '0 m'],
    [284, '280 m'],
    [995, '1000 m'],
    [1000, '1.0 km'],
    [1490, '1.5 km'],
    [12345, '12.3 km'],
  ])('formatDistance(%d) → %s', (meters, expected) => {
    expect(formatDistance(meters)).toBe(expected)
  })

  it.each([
    [0, '≈ 1 min walk'],
    [80, '≈ 1 min walk'],
    [81, '≈ 2 min walk'],
    [1200, '≈ 15 min walk'],
  ])('formatWalk(%d) → %s', (meters, expected) => {
    expect(formatWalk(meters)).toBe(expected)
  })

  it('returns a dash without a distance', () => {
    expect(formatDistance(null)).toBe('—')
    expect(formatWalk(undefined)).toBe('—')
  })
})

describe('date formatters', () => {
  // 15:00 UTC is 18:00 in Minsk (UTC+3, no DST)
  const value = '2026-10-28T15:00:00.000Z'

  it('formats in English, 24-hour clock, Minsk time', () => {
    expect(formatDate(value)).toBe('28 Oct 2026')
    expect(formatTime(value)).toBe('18:00')
    expect(formatDateTime(value)).toBe('28 Oct 2026, 18:00')
  })

  it('uses the Minsk date across midnight UTC', () => {
    expect(formatDate('2026-10-28T22:30:00.000Z')).toBe('29 Oct 2026')
  })

  it('accepts Date objects and timestamps', () => {
    expect(formatTime(new Date(value))).toBe('18:00')
    expect(formatTime(Date.parse(value))).toBe('18:00')
  })

  it.each([null, undefined, '', 'not a date'])('returns a dash for %o', (input) => {
    expect(formatDate(input)).toBe('—')
    expect(formatDateTime(input)).toBe('—')
  })
})

describe('formatDuration', () => {
  const MIN = 60000

  it.each([
    [0, '0 min'],
    [54 * MIN, '54 min'],
    [59 * MIN + 59999, '59 min'],
    [60 * MIN, '1 h 00 min'],
    [188 * MIN, '3 h 08 min'],
    [26 * 60 * MIN + 5 * MIN, '26 h 05 min'],
  ])('%d ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })

  it('returns a dash for negative or missing values', () => {
    expect(formatDuration(-1)).toBe('—')
    expect(formatDuration(null)).toBe('—')
  })
})

describe('formatCoords', () => {
  it('prints GeoJSON [lng, lat] as "lat, lng" with 5 decimals', () => {
    expect(formatCoords({ type: 'Point', coordinates: [27.5615, 53.9023] })).toBe(
      '53.90230, 27.56150',
    )
    expect(formatCoords([27.5443, 53.8883])).toBe('53.88830, 27.54430')
  })

  it('returns a dash for invalid input', () => {
    expect(formatCoords(null)).toBe('—')
    expect(formatCoords({ coordinates: ['a', 'b'] })).toBe('—')
  })
})

describe('carName', () => {
  const car = { productionInfo: { brand: 'Toyota', model: 'Camry', year: 2023 } }

  it('joins brand and model, optionally the year', () => {
    expect(carName(car)).toBe('Toyota Camry')
    expect(carName(car, { withYear: true })).toBe('Toyota Camry 2023')
  })

  it('handles unpopulated or missing production info', () => {
    expect(carName({ productionInfo: '665f1c2e9b1e8a0012345678' })).toBe('Unknown car')
    expect(carName({})).toBe('Unknown car')
    expect(carName(null)).toBe('Unknown car')
  })
})

describe('initials', () => {
  it.each([
    [{ firstName: 'vera', lastName: 'Davydova' }, 'VD'],
    [{ firstName: 'Ivan', lastName: '' }, 'I'],
    [{ firstName: ' ', lastName: ' ', email: 'admin@carshes.by' }, 'A'],
    [null, '?'],
  ])('%o → %s', (user, expected) => {
    expect(initials(user)).toBe(expected)
  })
})

describe('shortId', () => {
  it('uses the last 6 characters, uppercase', () => {
    expect(shortId('665f1c2e9b1e8a0012a1b2c3')).toBe('#A1B2C3')
  })

  it('returns a dash without an id', () => {
    expect(shortId(undefined)).toBe('—')
  })
})
