import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { cwd } from 'node:process'

// Ant Design draws text on every solid fill with colorTextLightSolid, which is the dark
// primary-foreground (theme/antd.js). On a red fill that is ~1.7:1, so danger actions must
// stay outlined: `danger` without `type="primary"`, and `ok-type="default"` on popconfirms
// and modals whose OK button is `danger`.

const SRC = resolve(cwd(), 'src')

const vueFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : vueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })

// Opening tags of Ant Design components, attributes included (they may span lines)
const tagsOf = (source) => source.match(/<a-[\w-]+\b[^>]*>/g) ?? []

const isSolidDanger = (tag) => {
  const dangerButton = /^<a-button\b/.test(tag) && /\bdanger\b/.test(tag)
  if (dangerButton) return /\btype="primary"/.test(tag)
  const dangerOk = /ok-button-props="\{[^"]*\bdanger:\s*true/.test(tag)
  return dangerOk && !/\bok-type="default"/.test(tag)
}

describe('danger buttons', () => {
  it('are never solid (dark text on red fails contrast)', () => {
    const offenders = vueFiles(SRC).flatMap((file) =>
      tagsOf(readFileSync(file, 'utf8'))
        .filter(isSolidDanger)
        .map((tag) => `${relative(SRC, file)}: ${tag.replace(/\s+/g, ' ').slice(0, 120)}`),
    )
    expect(offenders).toEqual([])
  })

  it('detects the solid patterns', () => {
    expect(isSolidDanger('<a-button type="primary" danger>')).toBe(true)
    expect(isSolidDanger('<a-popconfirm :ok-button-props="{ danger: true }">')).toBe(true)
    expect(isSolidDanger('<a-button danger>')).toBe(false)
    expect(
      isSolidDanger('<a-popconfirm ok-type="default" :ok-button-props="{ danger: true }">'),
    ).toBe(false)
  })
})
