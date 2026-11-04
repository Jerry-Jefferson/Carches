// Picker values and the rules for booking times (client-side only: the backend accepts any
// startDate and reserves the car until then): the scheduled start of a new booking and the
// end of a completed trip. Times are the browser's local time.

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

// A picker value in ms, NaN when it is missing or invalid
export const pickerTime = (value) => fromPickerValue(value)?.getTime() ?? NaN

// A trip's start in ms, NaN when it is missing or invalid
export const tripStartTime = (trip) => new Date(trip?.startDate ?? NaN).getTime()

// End time sent with E22: the picked end, but never before the start (a trip that started
// at 15:53:40 and ends "now" at 15:53 ends at its start). Without a valid start the
// picked end is kept.
export const completeEndDate = (value, trip) => {
  const end = pickerTime(value)
  const start = tripStartTime(trip)
  return new Date(Number.isNaN(start) ? end : Math.max(end, start)).toISOString()
}

// Default end for the complete-trip form: now, or the start of a trip that has not begun
// yet (Upcoming), so the form does not open with an error
export const defaultEndTime = (trip, now = Date.now()) => {
  const start = tripStartTime(trip)
  return Number.isNaN(start) ? now : Math.max(now, start)
}
