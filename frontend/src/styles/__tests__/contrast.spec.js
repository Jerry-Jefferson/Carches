import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

// WCAG 2.1 AA for normal text
const AA = 4.5

// Read from disk: with `css: false` Vitest stubs `.css?raw` imports as empty strings
const css = readFileSync(resolve(cwd(), 'src/styles/design-system.css'), 'utf8')

const readBlock = (selector) => {
  const start = css.indexOf(`${selector} {`)
  const body = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  )
}

const light = readBlock(':root')
// `.dark` sits on <html>, so tokens it does not redefine fall back to :root
const dark = { ...light, ...readBlock('.dark') }

const toRgb = (channels) => {
  const [h, s, l] = channels.replace(/%/g, '').split(/\s+/).map(Number)
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n) => {
    const k = (n + h / 30) % 12
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}

const luminance = (channels) => {
  const [r, g, b] = toRgb(channels).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const STATUS_TOKENS = ['destructive', 'success', 'warning', 'info']
const SURFACES = ['background', 'card', 'popover']

describe.each([
  ['light', light],
  ['dark', dark],
])('design tokens (%s)', (_, tokens) => {
  it.each(STATUS_TOKENS.flatMap((t) => SURFACES.map((s) => [t, s])))(
    '%s text is readable on %s',
    (token, surface) => {
      expect(contrast(tokens[token], tokens[surface])).toBeGreaterThanOrEqual(AA)
    },
  )

  it.each([...STATUS_TOKENS, 'surface'])('%s-foreground is readable on %s', (token) => {
    expect(contrast(tokens[`${token}-foreground`], tokens[token])).toBeGreaterThanOrEqual(AA)
  })
})
