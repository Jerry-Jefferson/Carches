// Car statuses and their display metadata (label, color tone, icon).
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

const UNKNOWN_STATUS = Object.freeze({ label: 'Unknown', tone: 'muted', icon: StopOutlined })

export const carStatusMeta = (status) => CAR_STATUS_META[status] ?? UNKNOWN_STATUS

// { free: 2, reserved: 0, … } — every status present, unknown statuses skipped
export const countCarsByStatus = (cars) => {
  const counts = Object.fromEntries(Object.values(CAR_STATUS).map((status) => [status, 0]))
  for (const car of cars) if (car.status in counts) counts[car.status] += 1
  return counts
}
