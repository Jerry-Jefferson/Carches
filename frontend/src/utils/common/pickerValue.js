// Values of the Ant Design date picker: "2026-10-29T14:35" strings in the browser's local time.

// Format of the date picker value, parsed by `new Date()` as local time
export const PICKER_VALUE_FORMAT = 'YYYY-MM-DDTHH:mm'

const pad = (value) => String(value).padStart(2, '0')

// Date → "2026-10-29T14:35" in local time (the picker's value format)
export const toPickerValue = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const fromPickerValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// A picker value in ms, NaN when it is missing or invalid
export const pickerTime = (value) => fromPickerValue(value)?.getTime() ?? NaN
