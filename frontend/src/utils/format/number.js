// Number display formatters (`ru-BY` grouping); missing values print as EMPTY_VALUE.

import { EMPTY_VALUE, LOCALE_NUMBER, isNumber } from './locale'

const moneyFormat = new Intl.NumberFormat(LOCALE_NUMBER, { style: 'currency', currency: 'BYN' })
const numberFormat = new Intl.NumberFormat(LOCALE_NUMBER, { maximumFractionDigits: 0 })
const percentFormat = new Intl.NumberFormat(LOCALE_NUMBER, {
  style: 'percent',
  maximumFractionDigits: 0,
})

// Not used yet: the API has no prices (backend gap G1)
export const formatMoney = (amount) => (isNumber(amount) ? moneyFormat.format(amount) : EMPTY_VALUE)

export const formatNumber = (value) => (isNumber(value) ? numberFormat.format(value) : EMPTY_VALUE)

export const formatKm = (km) => (isNumber(km) ? `${numberFormat.format(km)} km` : EMPTY_VALUE)

// Takes a 0–100 value (fuel level), not a 0–1 fraction
export const formatPercent = (value) =>
  isNumber(value) ? percentFormat.format(value / 100) : EMPTY_VALUE
