import { describe, it, expect } from 'vitest'

import {
  defaultStart,
  disabledTimeOf,
  fromPickerValue,
  isDayDisabled,
  scheduleError,
  toPickerValue,
} from '../schedule'

const MINUTE = 60000
const DAY = 24 * 60 * MINUTE
// 29 Oct 2026, 14:32 local time
const NOW = new Date(2026, 9, 29, 14, 32).getTime()

describe('schedule', () => {
  it('converts to and from the picker value in local time', () => {
    expect(toPickerValue(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07')
    expect(fromPickerValue('2026-01-05T09:07').getTime()).toBe(new Date(2026, 0, 5, 9, 7).getTime())
    expect(fromPickerValue('')).toBeNull()
    expect(fromPickerValue('nonsense')).toBeNull()
  })

  it('suggests a start one hour ahead, rounded up to 5 minutes', () => {
    expect(defaultStart(NOW)).toEqual(new Date(2026, 9, 29, 15, 35))
  })

  it.each([
    [null, 'Pick a start time.'],
    [new Date(NOW - MINUTE), 'Pick a time in the future.'],
    [new Date(NOW), 'Pick a time in the future.'],
    [new Date(NOW + 7 * DAY + MINUTE), 'You can book up to 7 days ahead.'],
    [new Date(NOW + MINUTE), ''],
    [new Date(NOW + 7 * DAY), ''],
  ])('scheduleError(%s)', (date, expected) => {
    expect(scheduleError(date, NOW)).toBe(expected)
  })

  it('disables days before today and after the last allowed day', () => {
    expect(isDayDisabled(new Date(2026, 9, 28, 23, 59), NOW)).toBe(true)
    expect(isDayDisabled(new Date(2026, 9, 29, 0, 0), NOW)).toBe(false)
    expect(isDayDisabled(new Date(2026, 10, 5, 23, 0), NOW)).toBe(false)
    expect(isDayDisabled(new Date(2026, 10, 6, 0, 0), NOW)).toBe(true)
  })

  it('disables past hours and minutes of today only', () => {
    const today = disabledTimeOf(new Date(2026, 9, 29, 18, 0), NOW)
    expect(today.disabledHours()).toEqual([...Array(14).keys()])
    expect(today.disabledMinutes(14)).toEqual([...Array(33).keys()])
    expect(today.disabledMinutes(15)).toEqual([])

    const tomorrow = disabledTimeOf(new Date(2026, 9, 30, 8, 0), NOW)
    expect(tomorrow.disabledHours()).toEqual([])
    expect(tomorrow.disabledMinutes(14)).toEqual([])
  })
})
