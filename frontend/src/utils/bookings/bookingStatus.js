// Booking status, which the backend does not store, and its display metadata
// (label, color tone, icon). `tone` is a design-system color token.

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue'

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

export const bookingStatusMeta = (status) => BOOKING_STATUS_META[status] ?? UNKNOWN_STATUS

const toTime = (value) => (value ? new Date(value).getTime() : NaN)

// endDate set → completed; start in the future → upcoming; otherwise active
export const bookingStatus = (booking, now = Date.now()) => {
  if (booking?.endDate) return BOOKING_STATUS.COMPLETED
  if (toTime(booking?.startDate) > toTime(now)) return BOOKING_STATUS.UPCOMING
  return BOOKING_STATUS.ACTIVE
}
