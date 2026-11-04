import { describe, it, expect } from 'vitest'

import { countBy, matchesText, refId } from '@/utils/common/collections'
import { shortId } from '@/utils/common/ids'
import { fromPickerValue, toPickerValue } from '@/utils/common/pickerValue'

describe('collections', () => {
  it('refId reads populated and bare references', () => {
    expect(refId({ _id: 'x' })).toBe('x')
    expect(refId('y')).toBe('y')
    expect(refId(null)).toBeNull()
  })

  it('countBy counts by key and skips missing keys', () => {
    const items = [{ k: 'a' }, { k: 'b' }, { k: 'a' }, { k: null }, {}]
    expect(countBy(items, (item) => item.k)).toEqual({ a: 2, b: 1 })
  })

  it('matchesText searches case-insensitively and tolerates missing values', () => {
    expect(matchesText('Toyota Camry', 'camry')).toBe(true)
    expect(matchesText('Toyota Camry', 'bmw')).toBe(false)
    expect(matchesText(null, 'x')).toBe(false)
  })
})

describe('pickerValue', () => {
  it('converts to and from the picker value in local time', () => {
    expect(toPickerValue(new Date(2026, 0, 5, 9, 7))).toBe('2026-01-05T09:07')
    expect(fromPickerValue('2026-01-05T09:07').getTime()).toBe(new Date(2026, 0, 5, 9, 7).getTime())
    expect(fromPickerValue('')).toBeNull()
    expect(fromPickerValue('nonsense')).toBeNull()
  })
})

describe('shortId', () => {
  it('uses the last 6 characters, uppercase', () => {
    expect(shortId('665f1c2e9b1e8a0012a1b2c3')).toBe('#A1B2C3')
  })

  it('returns a dash without an id', () => {
    expect(shortId(undefined)).toBe('—')
  })
})
