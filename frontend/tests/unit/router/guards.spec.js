import { describe, it, expect } from 'vitest'

import { safeRedirect, setDocumentTitle } from '@/router/guards'

describe('safeRedirect', () => {
  it.each([
    ['/fleet', '/fleet'],
    ['/cars/1?x=1#y', '/cars/1?x=1#y'],
    ['//evil.example', null],
    ['/\\evil.example', null],
    ['https://evil.example', null],
    ['fleet', null],
    [undefined, null],
    [['/fleet'], null],
  ])('%o → %o', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected)
  })
})

describe('setDocumentTitle', () => {
  it('uses the deepest route title, or the brand alone', () => {
    setDocumentTitle({ matched: [{ meta: { title: 'Fleet' } }, { meta: {} }] })
    expect(document.title).toBe('Fleet — Carshes')

    setDocumentTitle({ matched: [{ meta: {} }] })
    expect(document.title).toBe('Carshes')
  })
})
