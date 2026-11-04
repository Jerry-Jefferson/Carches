// Car names built from the populated production info.

export const carBrand = (car) => car?.productionInfo?.brand ?? ''

export const carName = (car, { withYear = false } = {}) => {
  const info = car?.productionInfo
  if (!info || typeof info !== 'object' || !info.brand) return 'Unknown car'
  const name = [info.brand, info.model].filter(Boolean).join(' ')
  return withYear && info.year ? `${name} ${info.year}` : name
}
