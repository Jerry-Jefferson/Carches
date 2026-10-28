// Class names per tone (see `tone` in utils/derive.js). Written out in full so
// Tailwind's source scan finds them — never build them like `bg-${tone}`.

export const TONES = Object.freeze({
  success: { soft: 'bg-success/15 text-success', solid: 'bg-success', text: 'text-success' },
  warning: { soft: 'bg-warning/15 text-warning', solid: 'bg-warning', text: 'text-warning' },
  info: { soft: 'bg-info/15 text-info', solid: 'bg-info', text: 'text-info' },
  destructive: {
    soft: 'bg-destructive/15 text-destructive',
    solid: 'bg-destructive',
    text: 'text-destructive',
  },
  muted: {
    soft: 'bg-muted text-muted-foreground',
    solid: 'bg-muted-foreground',
    text: 'text-muted-foreground',
  },
  accent: {
    soft: 'bg-accent text-accent-foreground',
    solid: 'bg-accent',
    text: 'text-accent-foreground',
  },
})

export const toneClasses = (tone) => TONES[tone] ?? TONES.muted
