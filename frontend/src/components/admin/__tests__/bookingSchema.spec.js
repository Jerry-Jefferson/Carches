import { describe, it, expect } from 'vitest'

import { completeTripSchema } from '../bookingSchema'

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
