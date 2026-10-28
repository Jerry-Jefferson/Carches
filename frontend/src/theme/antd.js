import { theme as antdTheme } from 'ant-design-vue'

const hslChannelsToHex = (channels) => {
  const match = channels.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/)
  if (!match) return null

  const h = Number(match[1])
  const s = Number(match[2]) / 100
  const l = Number(match[3]) / 100

  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

const readToken = (styles, name) => hslChannelsToHex(styles.getPropertyValue(`--${name}`))

// Maps design system CSS variables to Ant Design tokens.
// Ant Design derives hover/active/disabled shades itself, so it needs concrete colors.
const TOKEN_MAP = {
  colorPrimary: 'primary',
  colorPrimaryHover: 'primary-hover',
  colorPrimaryActive: 'primary-hover',
  colorTextLightSolid: 'primary-foreground',
  colorLink: 'secondary',
  colorLinkHover: 'secondary-hover',
  colorText: 'foreground',
  colorTextHeading: 'foreground',
  colorTextSecondary: 'muted-foreground',
  colorTextDescription: 'muted-foreground',
  colorBgLayout: 'background',
  colorBgContainer: 'card',
  colorBgElevated: 'popover',
  colorFillSecondary: 'muted',
  colorBorder: 'input',
  colorBorderSecondary: 'border',
}

export const buildAntdTheme = (root = document.documentElement) => {
  const styles = getComputedStyle(root)
  const isDark = root.classList.contains('dark')

  const token = Object.fromEntries(
    Object.entries(TOKEN_MAP)
      .map(([antdToken, cssVar]) => [antdToken, readToken(styles, cssVar)])
      .filter(([, value]) => value),
  )

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token,
  }
}
