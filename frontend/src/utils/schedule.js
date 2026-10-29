// Rules for a scheduled booking start (client-side only: the backend accepts any
// startDate and reserves the car until then). Times are the browser's local time.

export const START_MODE = Object.freeze({ NOW: 'now', SCHEDULE: 'schedule' })

export const SCHEDULE_MAX_DAYS = 7
export const SCHEDULE_STEP_MINUTES = 5
// Format of the date picker value, parsed by `new Date()` as local time
export const SCHEDULE_VALUE_FORMAT = 'YYYY-MM-DDTHH:mm'

const MINUTE = 60000
const DAY = 24 * 60 * MINUTE

const pad = (value) => String(value).padStart(2, '0')

const startOfDay = (time) => {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const range = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i)

export const latestStart = (now = Date.now()) => now + SCHEDULE_MAX_DAYS * DAY

// Date → "2026-10-29T14:35" in local time (the picker's value format)
export const toPickerValue = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const fromPickerValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// One hour from now, rounded up to the minute step
export const defaultStart = (now = Date.now()) => {
  const step = SCHEDULE_STEP_MINUTES * MINUTE
  return new Date(Math.ceil((now + 60 * MINUTE) / step) * step)
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

// For a-date-picker's disabled-time: past hours and minutes of today
export const disabledTimeOf = (day, now = Date.now()) => {
  const current = new Date(now)
  const isToday = day && startOfDay(day) === startOfDay(now)
  return {
    disabledHours: () => (isToday ? range(0, current.getHours()) : []),
    disabledMinutes: (hour) =>
      isToday && hour === current.getHours() ? range(0, current.getMinutes() + 1) : [],
  }
}
