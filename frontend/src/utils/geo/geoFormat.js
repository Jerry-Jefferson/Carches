// Display text for distances and coordinates; missing values print as EMPTY_VALUE.

import { EMPTY_VALUE, isNumber } from '@/utils/format/locale'
import { walkingMinutes } from './coordinates'

export const formatDistance = (meters) => {
  if (!isNumber(meters)) return EMPTY_VALUE
  // Rounded first, so 995 m is "1.0 km", not "1000 m"
  const rounded = Math.round(meters / 10) * 10
  if (rounded < 1000) return `${rounded} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export const formatWalk = (meters) =>
  isNumber(meters) ? `≈ ${walkingMinutes(meters)} min walk` : EMPTY_VALUE

// Accepts a GeoJSON point or its [lng, lat] coordinates; prints "lat, lng"
export const formatCoords = (location) => {
  const coordinates = Array.isArray(location) ? location : location?.coordinates
  if (!Array.isArray(coordinates) || !coordinates.every(isNumber)) return EMPTY_VALUE
  const [lng, lat] = coordinates
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}
