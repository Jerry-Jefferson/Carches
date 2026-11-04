import { describe, it, expect } from 'vitest'

import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatRelative,
  formatTime,
  minskDayKey,
} from '@/utils/format/dateTime'
import { formatKm, formatMoney, formatNumber, formatPercent } from '@/utils/format/number'

// ru-BY groups digits with a no-break space
const NBSP = ' '

const DAY = 24 * 3600000
// 29 Oct 2026, 12:00 in Minsk (UTC+3)
const NOW = Date.parse('2026-10-29T09:00:00Z')

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

describe('minskDayKey and formatRelative', () => {
  it('minskDayKey uses the Minsk calendar day', () => {
    expect(minskDayKey('2026-10-28T21:30:00Z')).toBe('2026-10-29')
    expect(minskDayKey(null)).toBeNull()
  })

  it('formatRelative prints the largest whole unit', () => {
    expect(formatRelative(NOW - 30 * 1000, NOW)).toBe('just now')
    expect(formatRelative(NOW - 5 * 60000, NOW)).toBe('5 minutes ago')
    expect(formatRelative(NOW - DAY, NOW)).toBe('yesterday')
    expect(formatRelative(NOW - 3 * DAY, NOW)).toBe('3 days ago')
    expect(formatRelative(null, NOW)).toBe('—')
  })
})
