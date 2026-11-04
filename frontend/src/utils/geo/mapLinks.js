// Links to OpenStreetMap for a point ({ lat, lng }).

const coordsParam = ({ lat, lng }) => `${lat},${lng}`

export const mapUrl = (point) =>
  `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=17/${point.lat}/${point.lng}`

// Walking directions; without an origin the map asks the user for a starting point
export const directionsUrl = (destination, origin = null) => {
  const route = `${origin ? coordsParam(origin) : ''};${coordsParam(destination)}`
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${encodeURIComponent(route)}`
}
