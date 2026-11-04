// Rules for the scheduled start of a new booking (client-side only: the backend accepts any
// startDate and reserves the car until then). Times are the browser's local time.

import { DAY_MS, MINUTE_MS } from '@/utils/common/time'

export const START_MODE = Object.freeze({ NOW: 'now', SCHEDULE: 'schedule' })

export const SCHEDULE_MAX_DAYS = 7
export const SCHEDULE_STEP_MINUTES = 5

const startOfDay = (time) => {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const range = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i)

export const latestStart = (now = Date.now()) => now + SCHEDULE_MAX_DAYS * DAY_MS

// One hour from now, rounded up to the minute step
export const defaultStart = (now = Date.now()) => {
  const step = SCHEDULE_STEP_MINUTES * MINUTE_MS
  return new Date(Math.ceil((now + 60 * MINUTE_MS) / step) * step)
}

// '' when the start time is acceptable, otherwise the reason
export const scheduleError = (date, now = Date.now()) => {
  if (!date) return 'Pick a start time.'
  const time = new Date(date).getTime()
  if (Number.isNaN(time)) return 'Pick a start time.'
  if (time <= now) return 'Pick a time in the future.'
  if (time > latestStart(now)) return `You can book up to ${SCHEDULE_MAX_DAYS} days ahead.`
  return ''
}

// For a-date-picker's disabled-date: days before today or after the last allowed day
export const isDayDisabled = (day, now = Date.now()) => {
  const time = startOfDay(day)
  return time < startOfDay(now) || time > startOfDay(latestStart(now))
}

// For a-date-picker's disabled-time: past hours and minutes of today, and on the last
// allowed day the times after latestStart
export const disabledTimeOf = (day, now = Date.now()) => {
  const current = new Date(now)
  const last = new Date(latestStart(now))
  const isToday = day && startOfDay(day) === startOfDay(now)
  const isLastDay = day && startOfDay(day) === startOfDay(last)
  return {
    disabledHours: () => [
      ...(isToday ? range(0, current.getHours()) : []),
      ...(isLastDay ? range(last.getHours() + 1, 24) : []),
    ],
    disabledMinutes: (hour) => [
      ...(isToday && hour === current.getHours() ? range(0, current.getMinutes() + 1) : []),
      ...(isLastDay && hour === last.getHours() ? range(last.getMinutes() + 1, 60) : []),
    ],
  }
}
