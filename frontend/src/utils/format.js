// Display formatters. Numbers use Belarusian grouping (`ru-BY`), dates and times
// are English and always shown in the Minsk timezone, whatever the browser's zone is.

import { walkingMinutes } from './geo'

export const LOCALE_NUMBER = 'ru-BY'
export const LOCALE_DATE = 'en-GB'
export const TIME_ZONE = 'Europe/Minsk'

const EMPTY = '—'

const moneyFormat = new Intl.NumberFormat(LOCALE_NUMBER, { style: 'currency', currency: 'BYN' })
const numberFormat = new Intl.NumberFormat(LOCALE_NUMBER, { maximumFractionDigits: 0 })
const percentFormat = new Intl.NumberFormat(LOCALE_NUMBER, {
  style: 'percent',
  maximumFractionDigits: 0,
})
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

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// Not used yet: the API has no prices (backend gap G1)
export const formatMoney = (amount) => (isNumber(amount) ? moneyFormat.format(amount) : EMPTY)

export const formatNumber = (value) => (isNumber(value) ? numberFormat.format(value) : EMPTY)

export const formatKm = (km) => (isNumber(km) ? `${numberFormat.format(km)} km` : EMPTY)

// Takes a 0–100 value (fuel level), not a 0–1 fraction
export const formatPercent = (value) =>
  isNumber(value) ? percentFormat.format(value / 100) : EMPTY

export const formatDistance = (meters) => {
  if (!isNumber(meters)) return EMPTY
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export const formatWalk = (meters) =>
  isNumber(meters) ? `≈ ${walkingMinutes(meters)} min walk` : EMPTY

export const formatDate = (value) => {
  const date = toDate(value)
  return date ? dateFormat.format(date) : EMPTY
}

export const formatTime = (value) => {
  const date = toDate(value)
  return date ? timeFormat.format(date) : EMPTY
}

export const formatDateTime = (value) => {
  const date = toDate(value)
  return date ? `${dateFormat.format(date)}, ${timeFormat.format(date)}` : EMPTY
}

export const formatDuration = (ms) => {
  if (!isNumber(ms) || ms < 0) return EMPTY
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

// Accepts a GeoJSON point or its [lng, lat] coordinates; prints "lat, lng"
export const formatCoords = (location) => {
  const coordinates = Array.isArray(location) ? location : location?.coordinates
  if (!Array.isArray(coordinates) || !coordinates.every(isNumber)) return EMPTY
  const [lng, lat] = coordinates
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export const carName = (car, { withYear = false } = {}) => {
  const info = car?.productionInfo
  if (!info || typeof info !== 'object' || !info.brand) return 'Unknown car'
  const name = [info.brand, info.model].filter(Boolean).join(' ')
  return withYear && info.year ? `${name} ${info.year}` : name
}

export const initials = (user) => {
  const fromName = [user?.firstName, user?.lastName]
    .map((part) => part?.trim()?.[0])
    .filter(Boolean)
    .join('')
  const value = fromName || user?.email?.trim()?.[0] || '?'
  return value.toUpperCase()
}

export const shortId = (id) => (id ? `#${String(id).slice(-6).toUpperCase()}` : EMPTY)
