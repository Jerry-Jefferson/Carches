import { describe, it, expect, vi, afterEach } from 'vitest'

import { copyText } from '../clipboard'

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete document.execCommand
  })

  it('uses the Clipboard API when it is there', async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await copyText('hello')

    expect(writeText).toHaveBeenCalledWith('hello')
  })

  // navigator.clipboard is missing on non-HTTPS origins (L23)
  it('falls back to execCommand without the Clipboard API', async () => {
    vi.stubGlobal('navigator', {})
    let copied = null
    document.execCommand = vi.fn(() => {
      copied = document.activeElement?.value ?? document.querySelector('textarea')?.value
      return true
    })

    await copyText('https://carshes.test/cars/1')

    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(copied).toBe('https://carshes.test/cars/1')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('rejects when nothing can copy', async () => {
    vi.stubGlobal('navigator', {})
    document.execCommand = vi.fn(() => false)

    await expect(copyText('x')).rejects.toThrow()
  })
})
