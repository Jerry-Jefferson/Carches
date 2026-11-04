// Locale settings of every display formatter. Numbers use Belarusian grouping (`ru-BY`),
// dates and times are English and always shown in the Minsk timezone, whatever the
// browser's zone is.

export const LOCALE_NUMBER = 'ru-BY'
export const LOCALE_DATE = 'en-GB'
export const TIME_ZONE = 'Europe/Minsk'

// Shown instead of a missing or invalid value
export const EMPTY_VALUE = '—'

export const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
