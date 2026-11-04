// Coordinates and distances. The backend stores GeoJSON points, so coordinates are
// [lng, lat]; everything else in the frontend works with { lat, lng } objects.

export const DEFAULT_CENTER = Object.freeze({ lat: 53.9023, lng: 27.5615 }) // Minsk centre

const EARTH_RADIUS_M = 6371000

const isValidPoint = (point) =>
  Number.isFinite(point?.lat) &&
  Number.isFinite(point?.lng) &&
  Math.abs(point.lat) <= 90 &&
  Math.abs(point.lng) <= 180

export const toLatLng = (location) => {
  const coordinates = Array.isArray(location) ? location : location?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  const [lng, lat] = coordinates
  const point = { lat, lng }
  return isValidPoint(point) ? point : null
}

export const toGeoJsonPoint = ({ lat, lng }) => ({ type: 'Point', coordinates: [lng, lat] })

// Great-circle distance in metres
export const haversineDistance = (a, b) => {
  if (!isValidPoint(a) || !isValidPoint(b)) return null
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Average walking speed of 80 m per minute, at least 1 minute
export const walkingMinutes = (meters) => Math.max(1, Math.ceil(meters / 80))

export const distanceToCar = (origin, car) => {
  const target = toLatLng(car?.location)
  return origin && target ? haversineDistance(origin, target) : null
}
