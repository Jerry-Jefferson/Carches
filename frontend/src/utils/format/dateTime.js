// Date and time display formatters, always in Minsk time, plus the Minsk calendar-day key
// used to group and compare dates.

import { EMPTY_VALUE, LOCALE_DATE, TIME_ZONE, isNumber } from './locale'

const dateFormat = new Intl.DateTimeFormat(LOCALE_DATE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})
const timeFormat = new Intl.DateTimeFormat(LOCALE_DATE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
})

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value) => {
  const date = toDate(value)
  return date ? dateFormat.format(date) : EMPTY_VALUE
}

export const formatTime = (value) => {
  const date = toDate(value)
  return date ? timeFormat.format(date) : EMPTY_VALUE
}

export const formatDateTime = (value) => {
  const date = toDate(value)
  return date ? `${dateFormat.format(date)}, ${timeFormat.format(date)}` : EMPTY_VALUE
}

// "2026-10-29" — the calendar day in Minsk, for grouping and comparing dates
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIME_ZONE,
})

export const minskDayKey = (value) => {
  const date = toDate(value)
  return date ? dayKeyFormat.format(date) : null
}

const relativeFormat = new Intl.RelativeTimeFormat(LOCALE_DATE, { numeric: 'auto' })
const RELATIVE_UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

// "5 minutes ago", "yesterday"; under a minute is "just now"
export const formatRelative = (value, now = Date.now()) => {
  const date = toDate(value)
  if (!date) return EMPTY_VALUE
  const seconds = Math.round((date.getTime() - now) / 1000)
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.trunc(seconds / size), unit)
  }
  return 'just now'
}

export const formatDuration = (ms) => {
  if (!isNumber(ms) || ms < 0) return EMPTY_VALUE
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}
