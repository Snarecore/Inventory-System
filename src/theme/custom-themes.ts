import { isValidHex, normalizeHex } from './color'
import { THEME_PRESETS } from './themes'
import type { ThemePalette, ThemePreset } from './types'

const CUSTOM_THEME_KEY = 'cash-boi-custom-themes'
const EXPORT_FORMAT = 'cash-boi/themes'
const EXPORT_VERSION = 1

/** Custom theme ids are namespaced so they can never collide with built-ins. */
export const CUSTOM_PREFIX = 'custom:'

export const isCustomThemeId = (id: string): boolean => id.startsWith(CUSTOM_PREFIX)

export type ThemePaletteColorKey = Exclude<keyof ThemePalette, 'isDark'>

export const PALETTE_KEYS: ThemePaletteColorKey[] = [
  'accent',
  'accentHover',
  'accentLight',
  'accentDark',
  'accentMuted',
  'accentSecondary',
  'surface',
  'surfaceMuted',
  'surfaceSunken',
  'border',
  'borderStrong',
  'text',
  'textMuted',
  'textSubtle',
]

/** Human labels for the palette editor. */
export const PALETTE_LABELS: Record<ThemePaletteColorKey, string> = {
  accent: 'Accent',
  accentHover: 'Accent (hover)',
  accentLight: 'Accent (light fill)',
  accentDark: 'Accent (dark)',
  accentMuted: 'Accent (muted)',
  accentSecondary: 'Secondary accent',
  surface: 'Surface',
  surfaceMuted: 'Surface (muted)',
  surfaceSunken: 'Surface (sunken)',
  border: 'Border',
  borderStrong: 'Border (strong)',
  text: 'Text',
  textMuted: 'Text (muted)',
  textSubtle: 'Text (subtle)',
}

const DEFAULTS = THEME_PRESETS['brand-navy']

export const blankTheme = (name = 'My theme'): ThemePreset => ({
  id: `${CUSTOM_PREFIX}${crypto.randomUUID()}`,
  name,
  description: '',
  palette: { ...DEFAULTS.palette },
  defaults: { ...DEFAULTS.defaults },
})

/**
 * Validate an unknown value as a theme. Unknown keys are dropped and any
 * missing or malformed colour falls back to the default theme's value, so an
 * imported file can never produce an unrenderable theme.
 */
export const sanitizeTheme = (value: unknown): ThemePreset | null => {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<ThemePreset>

  if (typeof v.name !== 'string' || !v.name.trim()) return null
  const rawPalette = (v.palette ?? {}) as Partial<ThemePalette>

  const palette = {} as ThemePalette
  for (const key of PALETTE_KEYS) {
    const raw = rawPalette[key]
    const fallback = DEFAULTS.palette[key] ?? ''
    palette[key] =
      typeof raw === 'string' && isValidHex(raw) ? normalizeHex(raw) : fallback
  }

  const rawDefaults = (v.defaults ?? {}) as Partial<ThemePreset['defaults']>
  const allowed = {
    density: ['compact', 'default', 'comfortable'],
    radius: ['none', 'sm', 'md', 'lg', 'xl'],
    borderWidth: ['hairline', 'standard', 'strong'],
    shadow: ['none', 'subtle', 'raised'],
    tableDensity: ['compact', 'default', 'comfortable'],
    fieldStyle: ['outlined', 'filled', 'underlined', 'soft'],
  } as const

  const defaults = { ...DEFAULTS.defaults }
  for (const key of Object.keys(allowed) as (keyof typeof allowed)[]) {
    const raw = rawDefaults[key]
    if (typeof raw === 'string' && (allowed[key] as readonly string[]).includes(raw)) {
      // Index signature is widened above; the membership check guarantees the type.
      ;(defaults as Record<string, string>)[key] = raw
    }
  }

  const id =
    typeof v.id === 'string' && isCustomThemeId(v.id)
      ? v.id
      : `${CUSTOM_PREFIX}${crypto.randomUUID()}`

  return {
    id: id as ThemePreset['id'],
    name: v.name.trim().slice(0, 48),
    description: typeof v.description === 'string' ? v.description.trim().slice(0, 160) : '',
    palette,
    defaults,
  }
}

export const loadCustomThemes = (): ThemePreset[] => {
  try {
    const raw = window.localStorage.getItem(CUSTOM_THEME_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(sanitizeTheme).filter((t): t is ThemePreset => t !== null)
  } catch {
    return []
  }
}

export const persistCustomThemes = (themes: ThemePreset[]): void => {
  try {
    window.localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(themes))
  } catch {
    // Storage unavailable — themes last for this session only.
  }
}

export const exportThemes = (themes: ThemePreset[]): string =>
  JSON.stringify(
    { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), themes },
    null,
    2
  )

export interface ThemeImportResult {
  themes: ThemePreset[]
  error?: string
}

export const parseThemeImport = (text: string): ThemeImportResult => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { themes: [], error: 'That file is not valid JSON.' }
  }

  let candidates: unknown[]
  if (Array.isArray(parsed)) {
    candidates = parsed
  } else if (parsed && typeof parsed === 'object' && 'themes' in parsed) {
    const env = parsed as { format?: string; themes?: unknown }
    if (env.format && env.format !== EXPORT_FORMAT) {
      return { themes: [], error: 'That file does not contain Cash Boi themes.' }
    }
    candidates = Array.isArray(env.themes) ? env.themes : []
  } else {
    candidates = [parsed]
  }

  const themes = candidates.map(sanitizeTheme).filter((t): t is ThemePreset => t !== null)
  if (!themes.length) return { themes: [], error: 'No usable themes were found in that file.' }
  return { themes }
}

export const downloadThemes = (themes: ThemePreset[], filename = 'cash-boi-themes.json') => {
  const blob = new Blob([exportThemes(themes)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
