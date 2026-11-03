// Values the backend does not store but the UI shows: booking status, trip metrics,
// and display metadata (label, color tone, icon) for car and booking statuses.
// `tone` is a design-system color token: success, warning, info, destructive, muted.

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  SyncOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue'

// Mirrors VEHICLE_STATUS in backend/src/constants/vehicle.js
export const CAR_STATUS = Object.freeze({
  FREE: 'free',
  RESERVED: 'reserved',
  IN_USE: 'in_use',
  UNAVAILABLE: 'unavailable',
  IN_SERVICE: 'in_service',
})

export const CAR_STATUS_META = Object.freeze({
  [CAR_STATUS.FREE]: { label: 'Available', tone: 'success', icon: CheckCircleOutlined },
  [CAR_STATUS.RESERVED]: { label: 'Reserved', tone: 'warning', icon: ClockCircleOutlined },
  [CAR_STATUS.IN_USE]: { label: 'In trip', tone: 'info', icon: SyncOutlined },
  [CAR_STATUS.UNAVAILABLE]: { label: 'Unavailable', tone: 'muted', icon: StopOutlined },
  [CAR_STATUS.IN_SERVICE]: { label: 'In service', tone: 'destructive', icon: ToolOutlined },
})

export const BOOKING_STATUS = Object.freeze({
  ACTIVE: 'active',
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
})

export const BOOKING_STATUS_META = Object.freeze({
  [BOOKING_STATUS.ACTIVE]: { label: 'Active', tone: 'info', icon: SyncOutlined },
  [BOOKING_STATUS.UPCOMING]: { label: 'Upcoming', tone: 'warning', icon: ClockCircleOutlined },
  [BOOKING_STATUS.COMPLETED]: { label: 'Completed', tone: 'success', icon: CheckCircleOutlined },
})

const UNKNOWN_STATUS = Object.freeze({ label: 'Unknown', tone: 'muted', icon: StopOutlined })

export const carStatusMeta = (status) => CAR_STATUS_META[status] ?? UNKNOWN_STATUS

export const bookingStatusMeta = (status) => BOOKING_STATUS_META[status] ?? UNKNOWN_STATUS

const toTime = (value) => (value ? new Date(value).getTime() : NaN)

// endDate set → completed; start in the future → upcoming; otherwise active
export const bookingStatus = (booking, now = Date.now()) => {
  if (booking?.endDate) return BOOKING_STATUS.COMPLETED
  if (toTime(booking?.startDate) > toTime(now)) return BOOKING_STATUS.UPCOMING
  return BOOKING_STATUS.ACTIVE
}

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

export const LOW_FUEL_THRESHOLD = 25 // same rule as GET /cars/in-use/low-fuel
export const FUEL_WARNING_THRESHOLD = 40

export const fuelTone = (level) => {
  if (level < LOW_FUEL_THRESHOLD) return 'destructive'
  if (level < FUEL_WARNING_THRESHOLD) return 'warning'
  return 'success'
}
