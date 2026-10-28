// CSV export of already loaded rows (admin "Export report").

// Excel needs the BOM to read UTF-8 correctly
const BOM = '﻿'

// Cells starting with these are run as formulas by spreadsheet apps (CSV injection)
const FORMULA_PREFIX = /^[=+\-@\t\r]/

const escapeCell = (value, delimiter) => {
  if (value === null || value === undefined) return ''
  let text = value instanceof Date ? value.toISOString() : String(value)
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) text = `'${text}`
  const needsQuotes = text.includes(delimiter) || /["\r\n]/.test(text)
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text
}

// columns: [{ title: 'VIN', value: 'vin' }, { title: 'Car', value: (row) => carName(row) }]
export const toCsv = (rows, columns, { delimiter = ',' } = {}) => {
  const read = (row, { value }) => (typeof value === 'function' ? value(row) : row?.[value])
  const lines = [
    columns.map((column) => escapeCell(column.title, delimiter)),
    ...rows.map((row) => columns.map((column) => escapeCell(read(row, column), delimiter))),
  ]
  return BOM + lines.map((cells) => cells.join(delimiter)).join('\r\n')
}

export const downloadCsv = (filename, csv) => {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking in the same tick can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
