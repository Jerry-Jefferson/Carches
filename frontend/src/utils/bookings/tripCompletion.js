// Rules for the end time of a trip the admin completes (E22).

import { pickerTime } from '@/utils/common/pickerValue'

// A trip's start in ms, NaN when it is missing or invalid
export const tripStartTime = (trip) => new Date(trip?.startDate ?? NaN).getTime()

// End time sent with E22: the picked end, but never before the start (a trip that started
// at 15:53:40 and ends "now" at 15:53 ends at its start). Without a valid start the
// picked end is kept.
export const completeEndDate = (value, trip) => {
  const end = pickerTime(value)
  const start = tripStartTime(trip)
  return new Date(Number.isNaN(start) ? end : Math.max(end, start)).toISOString()
}

// Default end for the complete-trip form: now, or the start of a trip that has not begun
// yet (Upcoming), so the form does not open with an error
export const defaultEndTime = (trip, now = Date.now()) => {
  const start = tripStartTime(trip)
  return Number.isNaN(start) ? now : Math.max(now, start)
}
