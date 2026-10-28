import { describe, it, expect, afterEach } from 'vitest'
import { theme as antdTheme } from 'ant-design-vue'

import { buildAntdTheme } from '@/theme/antd'

const root = document.documentElement

describe('buildAntdTheme', () => {
  afterEach(() => {
    root.removeAttribute('style')
    root.classList.remove('dark')
  })

  it('maps design tokens to Ant Design colors', () => {
    root.style.setProperty('--surface', '0 0% 100%')
    root.style.setProperty('--card', '48 76% 92%')
    root.style.setProperty('--destructive', '0 62% 42%')
    root.style.setProperty('--success', '145 55% 26%')
    root.style.setProperty('--warning', '30 85% 30%')
    root.style.setProperty('--info', '205 70% 32%')

    const { token } = buildAntdTheme(root)

    // Inputs and tables sit on `surface`, not `card`
    expect(token.colorBgContainer).toBe('#ffffff')
    expect(token.colorError).toBe('#ae2929')
    expect(token.colorSuccess).toBe('#1e673c')
    expect(token.colorWarning).toBe('#8e4d0b')
    expect(token.colorInfo).toBe('#185b8b')
  })

  it('sets radii and the font from --font-sans', () => {
    root.style.setProperty('--font-sans', "'Plus Jakarta Sans', sans-serif")

    const { token } = buildAntdTheme(root)

    expect(token).toMatchObject({
      borderRadius: 8,
      borderRadiusLG: 12,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    })
  })

  it('skips tokens that are not defined', () => {
    const { token } = buildAntdTheme(root)

    expect(token.colorError).toBeUndefined()
    expect(token.fontFamily).toBeUndefined()
  })

  it('switches algorithm with the .dark class', () => {
    expect(buildAntdTheme(root).algorithm).toBe(antdTheme.defaultAlgorithm)
    root.classList.add('dark')
    expect(buildAntdTheme(root).algorithm).toBe(antdTheme.darkAlgorithm)
  })
})
