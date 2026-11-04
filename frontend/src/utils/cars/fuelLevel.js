// Fuel level thresholds and the color tone of a 0–100 fuel level.

export const LOW_FUEL_THRESHOLD = 25 // same rule as GET /cars/in-use/low-fuel
export const FUEL_WARNING_THRESHOLD = 40

export const fuelTone = (level) => {
  if (level < LOW_FUEL_THRESHOLD) return 'destructive'
  if (level < FUEL_WARNING_THRESHOLD) return 'warning'
  return 'success'
}
