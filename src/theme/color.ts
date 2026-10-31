/**
 * Minimal colour helpers for deriving an accent ramp from a single hex value.
 * Kept dependency-free and deliberately small — this is not a colour library.
 */

interface Rgb {
  r: number
  g: number
  b: number
}

const clamp = (n: number, min = 0, max = 255) => Math.min(max, Math.max(min, n))

export const isValidHex = (value: string): boolean => /^#?[0-9a-fA-F]{6}$/.test(value.trim())

export const normalizeHex = (value: string): string => {
  const v = value.trim()
  return (v.startsWith('#') ? v : `#${v}`).toLowerCase()
}

const hexToRgb = (hex: string): Rgb => {
  const v = normalizeHex(hex).slice(1)
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}

const rgbToHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map((c) => clamp(Math.round(c)).toString(16).padStart(2, '0')).join('')}`

/** Mix a colour toward white (amount > 0) or black (amount < 0). */
const mix = (hex: string, target: Rgb, amount: number): string => {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex({
    r: r + (target.r - r) * amount,
    g: g + (target.g - g) * amount,
    b: b + (target.b - b) * amount,
  })
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 }
const BLACK: Rgb = { r: 0, g: 0, b: 0 }

export const lighten = (hex: string, amount: number): string => mix(hex, WHITE, amount)
export const darken = (hex: string, amount: number): string => mix(hex, BLACK, amount)

/**
 * Relative luminance per WCAG 2.1, used to decide whether text on the accent
 * should be white or near-black.
 */
export const luminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex)
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * Readable foreground for a given background.
 *
 * Compares both candidates rather than using a fixed luminance threshold —
 * mid-tone accents such as the logo cyan #009bde read better with dark text
 * even though their luminance sits below a naive cut-off.
 */
export const readableOn = (hex: string): string => {
  const l = luminance(hex)
  const vsWhite = 1.05 / (l + 0.05)
  const vsDark = (l + 0.05) / (luminance('#0f172a') + 0.05)
  return vsDark > vsWhite ? '#0f172a' : '#ffffff'
}

/** Build the full accent ramp the design tokens expect from one base colour. */
export const deriveAccentRamp = (accent: string) => ({
  accent: normalizeHex(accent),
  accentHover: darken(accent, 0.18),
  accentLight: lighten(accent, 0.94),
  accentDark: darken(accent, 0.38),
  accentMuted: lighten(accent, 0.86),
})

/**
 * WCAG 2.1 contrast ratio between two colours (1 to 21).
 * 4.5 is the AA threshold for normal text, 3 for large text, 7 for AAA.
 */
export const contrastRatio = (a: string, b: string): number => {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export type ContrastGrade = 'AAA' | 'AA' | 'AA Large' | 'Fail'

export const gradeContrast = (ratio: number): ContrastGrade => {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}
