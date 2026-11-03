import { describe, it, expect } from 'vitest'

import { completeEndDate, completeTripSchema, defaultEndTime } from '../bookingSchema'

const TRIP = { startDate: '2026-10-29T12:53:40.000Z', startMileage: 1000 }
const values = (endDate) => ({ endDate, finishFuelLevel: 50, finishMileage: 1010 })

describe('completeTripSchema', () => {
  // The picker has minute precision, so "now" right after the start rounds down below it
  it('accepts an end in the same minute as the start', () => {
    expect(completeTripSchema(TRIP).safeParse(values('2026-10-29T12:53:00.000Z')).success).toBe(
      true,
    )
  })

  it('rejects an end in an earlier minute', () => {
    const result = completeTripSchema(TRIP).safeParse(values('2026-10-29T12:52:00.000Z'))
    expect(result.success).toBe(false)
    expect(result.error.issues[0].message).toBe('End must be after the start')
  })
})

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
