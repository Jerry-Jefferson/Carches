import { describe, it, expect } from 'vitest'

import {
  BOOKING_STATUS,
  CAR_STATUS,
  CAR_STATUS_META,
  bookingStatus,
  bookingStatusMeta,
  carStatusMeta,
  fuelTone,
  fuelUsed,
  tripDistance,
  tripDuration,
} from '@/utils/derive'

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

describe('status metadata', () => {
  it('covers every backend car status', () => {
    expect(Object.keys(CAR_STATUS_META).sort()).toEqual(Object.values(CAR_STATUS).sort())
  })

  it.each([
    ['free', 'Available', 'success'],
    ['reserved', 'Reserved', 'warning'],
    ['in_use', 'In trip', 'info'],
    ['unavailable', 'Unavailable', 'muted'],
    ['in_service', 'In service', 'destructive'],
  ])('car status %s → %s (%s)', (status, label, tone) => {
    expect(carStatusMeta(status)).toMatchObject({ label, tone })
    expect(carStatusMeta(status).icon).toBeTruthy()
  })

  it.each([
    ['active', 'Active', 'info'],
    ['upcoming', 'Upcoming', 'warning'],
    ['completed', 'Completed', 'success'],
  ])('booking status %s → %s (%s)', (status, label, tone) => {
    expect(bookingStatusMeta(status)).toMatchObject({ label, tone })
  })

  it('falls back for unknown statuses', () => {
    expect(carStatusMeta('teleported')).toMatchObject({ label: 'Unknown', tone: 'muted' })
  })
})

describe('fuelTone', () => {
  it.each([
    [0, 'destructive'],
    [24, 'destructive'],
    [25, 'warning'],
    [39, 'warning'],
    [40, 'success'],
    [100, 'success'],
  ])('%d %% → %s', (level, tone) => {
    expect(fuelTone(level)).toBe(tone)
  })
})
