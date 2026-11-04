// Generic helpers over API lists: populated references, counting and text search.

// The "any" value of a select filter (brand, status, role)
export const ALL = 'all'

// A populated reference ({ _id, … }) or a bare id → the id
export const refId = (ref) => (ref && typeof ref === 'object' ? (ref._id ?? null) : (ref ?? null))

// { [key]: count }; items whose key is null or undefined are skipped
export const countBy = (items, keyOf) => {
  const counts = {}
  for (const item of items) {
    const key = keyOf(item)
    if (key !== null && key !== undefined) counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

// Case-insensitive substring search; `needle` must already be lower-cased
export const matchesText = (value, needle) =>
  String(value ?? '')
    .toLowerCase()
    .includes(needle)
