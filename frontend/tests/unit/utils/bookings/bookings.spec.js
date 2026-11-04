import { describe, it, expect } from 'vitest'

import {
  defaultStart,
  disabledTimeOf,
  isDayDisabled,
  scheduleError,
} from '@/utils/bookings/bookingSchedule'
import { completeEndDate, defaultEndTime } from '@/utils/bookings/tripCompletion'
import { BOOKING_STATUS, bookingStatus, bookingStatusMeta } from '@/utils/bookings/bookingStatus'
import { REMOVED_CAR, tripCarName } from '@/utils/bookings/tripLabels'
import { fuelUsed, tripDistance, tripDuration } from '@/utils/bookings/tripMetrics'

const MINUTE = 60000
const DAY = 24 * 60 * MINUTE
// 29 Oct 2026, 14:32 local time
const LOCAL_NOW = new Date(2026, 9, 29, 14, 32).getTime()
// 28 Oct 2026, 12:00 UTC
const NOW = new Date('2026-10-28T12:00:00.000Z')

describe('bookingStatus', () => {
  it.each([
    [
      'completed when endDate is set',
      { startDate: '2026-10-28T10:00:00Z', endDate: '2026-10-28T11:00:00Z' },
      BOOKING_STATUS.COMPLETED,
    ],
    [
      'completed even if the start is in the future',
      { startDate: '2026-10-29T10:00:00Z', endDate: '2026-10-29T11:00:00Z' },
      BOOKING_STATUS.COMPLETED,
    ],
    [
      'upcoming when the start is in the future',
      { startDate: '2026-10-28T12:00:01Z', endDate: null },
      BOOKING_STATUS.UPCOMING,
    ],
    [
      'active when the start is exactly now',
      { startDate: NOW.toISOString(), endDate: null },
      BOOKING_STATUS.ACTIVE,
    ],
    [
      'active when the start has passed',
      { startDate: '2026-10-28T09:00:00Z' },
      BOOKING_STATUS.ACTIVE,
    ],
  ])('%s', (_, booking, expected) => {
    expect(bookingStatus(booking, NOW)).toBe(expected)
  })
})

describe('tripDuration', () => {
  it('measures completed trips start → end', () => {
    expect(
      tripDuration({ startDate: '2026-10-28T10:00:00Z', endDate: '2026-10-28T11:30:00Z' }, NOW),
    ).toBe(90 * 60000)
  })

  it('measures open trips up to now', () => {
    expect(tripDuration({ startDate: '2026-10-28T11:18:00Z', endDate: null }, NOW)).toBe(42 * 60000)
  })

  it('is 0 for upcoming trips and null without a start', () => {
    expect(tripDuration({ startDate: '2026-10-29T10:00:00Z' }, NOW)).toBe(0)
    expect(tripDuration({}, NOW)).toBeNull()
  })
})

describe('tripDistance and fuelUsed', () => {
  const finished = {
    startMileage: 18420,
    finishMileage: 18451,
    startFuelLevel: 82,
    finishFuelLevel: 70,
  }

  it('compute deltas when both ends are known', () => {
    expect(tripDistance(finished)).toBe(31)
    expect(fuelUsed(finished)).toBe(12)
  })

  it('handle zero values', () => {
    expect(tripDistance({ startMileage: 0, finishMileage: 0 })).toBe(0)
    expect(fuelUsed({ startFuelLevel: 0, finishFuelLevel: 0 })).toBe(0)
  })

  it('return null for open trips', () => {
    const open = { startMileage: 18420, finishMileage: null, startFuelLevel: 82 }
    expect(tripDistance(open)).toBeNull()
    expect(fuelUsed(open)).toBeNull()
  })
})

describe('booking status metadata', () => {
  it.each([
    ['active', 'Active', 'info'],
    ['upcoming', 'Upcoming', 'warning'],
    ['completed', 'Completed', 'success'],
  ])('booking status %s → %s (%s)', (status, label, tone) => {
    expect(bookingStatusMeta(status)).toMatchObject({ label, tone })
  })

  it('falls back for unknown statuses', () => {
    expect(bookingStatusMeta('lost')).toMatchObject({ label: 'Unknown', tone: 'muted' })
  })
})

describe('tripCarName', () => {
  it('names the car, or tells a removed car from an unloaded fleet', () => {
    const car = { productionInfo: { brand: 'Toyota', model: 'Camry' } }
    expect(tripCarName({ car })).toBe('Toyota Camry')
    expect(tripCarName({ car: null })).toBe(REMOVED_CAR)
    expect(tripCarName({ car: null }, false)).toBe('Car')
  })
})

describe('schedule', () => {
  it('suggests a start one hour ahead, rounded up to 5 minutes', () => {
    expect(defaultStart(LOCAL_NOW)).toEqual(new Date(2026, 9, 29, 15, 35))
  })

  it.each([
    [null, 'Pick a start time.'],
    [new Date(LOCAL_NOW - MINUTE), 'Pick a time in the future.'],
    [new Date(LOCAL_NOW), 'Pick a time in the future.'],
    [new Date(LOCAL_NOW + 7 * DAY + MINUTE), 'You can book up to 7 days ahead.'],
    [new Date(LOCAL_NOW + MINUTE), ''],
    [new Date(LOCAL_NOW + 7 * DAY), ''],
  ])('scheduleError(%s)', (date, expected) => {
    expect(scheduleError(date, LOCAL_NOW)).toBe(expected)
  })

  it('disables days before today and after the last allowed day', () => {
    expect(isDayDisabled(new Date(2026, 9, 28, 23, 59), LOCAL_NOW)).toBe(true)
    expect(isDayDisabled(new Date(2026, 9, 29, 0, 0), LOCAL_NOW)).toBe(false)
    expect(isDayDisabled(new Date(2026, 10, 5, 23, 0), LOCAL_NOW)).toBe(false)
    expect(isDayDisabled(new Date(2026, 10, 6, 0, 0), LOCAL_NOW)).toBe(true)
  })

  it('disables past hours and minutes of today only', () => {
    const today = disabledTimeOf(new Date(2026, 9, 29, 18, 0), LOCAL_NOW)
    expect(today.disabledHours()).toEqual([...Array(14).keys()])
    expect(today.disabledMinutes(14)).toEqual([...Array(33).keys()])
    expect(today.disabledMinutes(15)).toEqual([])

    const tomorrow = disabledTimeOf(new Date(2026, 9, 30, 8, 0), LOCAL_NOW)
    expect(tomorrow.disabledHours()).toEqual([])
    expect(tomorrow.disabledMinutes(14)).toEqual([])
  })

  it('disables times after the 7-day limit on the last day (L21)', () => {
    const limit = new Date(LOCAL_NOW + 7 * DAY)
    const hour = limit.getHours()
    const last = disabledTimeOf(new Date(limit.getTime() - 60 * MINUTE), LOCAL_NOW)
    expect(last.disabledHours()).toEqual([...Array(24).keys()].slice(hour + 1))
    expect(last.disabledMinutes(hour)).toEqual([...Array(60).keys()].slice(limit.getMinutes() + 1))
    expect(last.disabledMinutes(hour - 1)).toEqual([])
  })
})

describe('ending a trip', () => {
  const TRIP = { startDate: '2026-10-29T12:53:40.000Z', startMileage: 1000 }

  describe('completeEndDate (L25)', () => {
    it('clamps an end in the start minute to the start', () => {
      expect(completeEndDate('2026-10-29T12:53:00.000Z', TRIP)).toBe(TRIP.startDate)
      expect(completeEndDate('2026-10-29T13:10:00.000Z', TRIP)).toBe('2026-10-29T13:10:00.000Z')
    })

    it('keeps the picked end when the start is missing or invalid', () => {
      expect(completeEndDate('2026-10-29T13:10:00.000Z', {})).toBe('2026-10-29T13:10:00.000Z')
      expect(completeEndDate('2026-10-29T13:10:00.000Z', { startDate: 'nonsense' })).toBe(
        '2026-10-29T13:10:00.000Z',
      )
    })
  })

  describe('defaultEndTime (L12)', () => {
    const now = Date.parse('2026-10-29T12:00:00.000Z')

    it('is now for a trip that has started, the start for one that has not', () => {
      expect(defaultEndTime({ startDate: '2026-10-29T11:00:00.000Z' }, now)).toBe(now)
      expect(defaultEndTime({ startDate: '2026-10-29T14:00:00.000Z' }, now)).toBe(
        Date.parse('2026-10-29T14:00:00.000Z'),
      )
      expect(defaultEndTime({}, now)).toBe(now)
    })
  })
})
