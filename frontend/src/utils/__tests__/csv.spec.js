import { describe, it, expect, vi, afterEach } from 'vitest'

import { downloadCsv, toCsv } from '@/utils/csv'

const BOM = '﻿'

describe('toCsv', () => {
  const columns = [
    { title: 'VIN', value: 'vin' },
    { title: 'Car', value: (row) => `${row.brand} ${row.model}` },
    { title: 'Fuel', value: 'fuelLevel' },
  ]

  it('starts with a BOM and a header row, CRLF line endings', () => {
    const csv = toCsv(
      [{ vin: 'JTDBR32E720123456', brand: 'Toyota', model: 'Camry', fuelLevel: 82 }],
      columns,
    )
    expect(csv).toBe(`${BOM}VIN,Car,Fuel\r\nJTDBR32E720123456,Toyota Camry,82`)
  })

  it('quotes cells with delimiters, quotes and line breaks', () => {
    const csv = toCsv(
      [{ a: 'one, two', b: 'say "hi"', c: 'line\nbreak' }],
      [
        { title: 'A', value: 'a' },
        { title: 'B', value: 'b' },
        { title: 'C', value: 'c' },
      ],
    )
    expect(csv.split('\r\n')[1]).toBe('"one, two","say ""hi""","line\nbreak"')
  })

  it('neutralises formula-like strings but keeps negative numbers', () => {
    const csv = toCsv(
      [{ a: '=HYPERLINK("x")', b: '@SUM(1)', c: -12 }],
      [
        { title: 'A', value: 'a' },
        { title: 'B', value: 'b' },
        { title: 'C', value: 'c' },
      ],
    )
    expect(csv.split('\r\n')[1]).toBe(`"'=HYPERLINK(""x"")",'@SUM(1),-12`)
  })

  it('writes empty cells for null/undefined and ISO strings for dates', () => {
    const csv = toCsv(
      [{ a: null, b: new Date('2026-10-28T15:00:00.000Z') }],
      [
        { title: 'A', value: 'a' },
        { title: 'B', value: 'b' },
        { title: 'Missing', value: 'nope' },
      ],
    )
    expect(csv.split('\r\n')[1]).toBe(',2026-10-28T15:00:00.000Z,')
  })

  it('supports another delimiter', () => {
    const csv = toCsv(
      [{ a: '1;2', b: '3,4' }],
      [
        { title: 'A', value: 'a' },
        { title: 'B', value: 'b' },
      ],
      { delimiter: ';' },
    )
    expect(csv.split('\r\n')[1]).toBe('"1;2";3,4')
  })
})

describe('downloadCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('clicks a temporary link with the file name and frees the URL', () => {
    vi.useFakeTimers()
    URL.createObjectURL = vi.fn(() => 'blob:csv')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadCsv('fleet.csv', 'a,b')

    const link = click.mock.contexts[0]
    expect(link.download).toBe('fleet.csv')
    expect(link.href).toBe('blob:csv')
    expect(document.querySelector('a[download]')).toBeNull()
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:csv')
  })
})
