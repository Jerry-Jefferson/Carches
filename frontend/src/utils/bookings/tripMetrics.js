// Trip metrics the backend does not store: duration, distance driven and fuel used.

const toTime = (value) => (value ? new Date(value).getTime() : NaN)

// Milliseconds; open trips are measured up to `now`, upcoming ones are 0
export const tripDuration = (booking, now = Date.now()) => {
  const start = toTime(booking?.startDate)
  if (Number.isNaN(start)) return null
  const end = booking.endDate ? toTime(booking.endDate) : toTime(now)
  return Math.max(0, end - start)
}

const bothNumbers = (a, b) => Number.isFinite(a) && Number.isFinite(b)

// Kilometres driven, only once the finish mileage is known
export const tripDistance = (booking) =>
  bothNumbers(booking?.startMileage, booking?.finishMileage)
    ? booking.finishMileage - booking.startMileage
    : null

// Fuel percentage points used, only once the finish fuel level is known
export const fuelUsed = (booking) =>
  bothNumbers(booking?.startFuelLevel, booking?.finishFuelLevel)
    ? booking.startFuelLevel - booking.finishFuelLevel
    : null
