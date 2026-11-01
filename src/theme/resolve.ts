import { darken, deriveAccentRamp, isValidHex, lighten, readableOn } from './color'
import {
  BORDER_WIDTH_SCALE,
  CONTENT_WIDTH_SCALE,
  DENSITY_SCALE,
  FONT_FAMILY_SCALE,
  FONT_SCALE,
  RADIUS_SCALE,
  SHADOW_SCALE,
  TABLE_DENSITY_SCALE,
} from './scales'
import { DEFAULT_THEME_ID, THEME_PRESETS } from './themes'
import type {
  AppearanceState,
  ColorModeId,
  ResolvedAppearance,
  ThemeId,
  ThemePreset,
  ThemeRef,
} from './types'

export const DEFAULT_FONT_FAMILY = 'plus-jakarta' as const
export const DEFAULT_FONT_SCALE = 'md' as const

export const DEFAULT_APPEARANCE: AppearanceState = {
  themeId: DEFAULT_THEME_ID,
  overrides: {},
}

/** Check if preset is designed with dark surfaces */
export const isDarkPreset = (preset: ThemePreset): boolean => {
  if (typeof preset.id === 'string' && preset.id.startsWith('dark-')) return true
  const surface = preset.palette?.surface?.toLowerCase() || ''
  if (surface.startsWith('#') && surface.length >= 7) {
    const hex = surface.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16) || 0
    const g = parseInt(hex.substring(2, 4), 16) || 0
    const b = parseInt(hex.substring(4, 6), 16) || 0
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma < 128
  }
  return false
}

/** Check system dark mode preference */
export const getSystemPrefersDark = (): boolean => {
  if (typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches)
}

/**
 * Find a theme by id across the built-ins and any user-made themes,
 * falling back to the default when the id is unknown (e.g. a custom theme
 * that has since been deleted).
 */
export const findTheme = (id: ThemeRef, customThemes: ThemePreset[] = []): ThemePreset =>
  THEME_PRESETS[id as ThemeId] ??
  customThemes.find((t) => t.id === id) ??
  THEME_PRESETS[DEFAULT_THEME_ID]

/** Fill every optional setting from the active preset (or the global default). */
export const resolveAppearance = (
  state: AppearanceState,
  customThemes: ThemePreset[] = []
): ResolvedAppearance => {
  const preset = findTheme(state.themeId, customThemes)
  const o = state.overrides

  const presetIsDark = isDarkPreset(preset)
  const colorMode: ColorModeId = o.colorMode ?? (presetIsDark ? 'dark' : 'light')

  let resolvedColorMode: 'light' | 'dark' = 'light'
  if (colorMode === 'dark') {
    resolvedColorMode = 'dark'
  } else if (colorMode === 'light') {
    resolvedColorMode = 'light'
  } else {
    resolvedColorMode = presetIsDark || getSystemPrefersDark() ? 'dark' : 'light'
  }
  const isDark = resolvedColorMode === 'dark'

  const palette = { ...preset.palette }

  // High-contrast, accessibility-checked dark adaptation for light themes (Matches E-commerce-admin)
  if (isDark && !presetIsDark) {
    palette.surface = '#0f172a'
    palette.surfaceMuted = '#1e293b'
    palette.surfaceSunken = '#0b0f19'
    palette.border = '#334155'
    palette.borderStrong = '#475569'
    palette.text = '#f8fafc'
    palette.textMuted = '#cbd5e1'
    palette.textSubtle = '#94a3b8'
    palette.accentLight = `color-mix(in srgb, ${palette.accent} 16%, #0f172a)`
    palette.accentMuted = `color-mix(in srgb, ${palette.accent} 28%, #1e293b)`
    palette.accentHover = lighten(palette.accent, 0.1)
    palette.isDark = true
  } else if (!isDark && presetIsDark) {
    // Graceful light fallback if a dark preset has colorMode forced to light
    palette.surface = '#ffffff'
    palette.surfaceMuted = '#f8fafc'
    palette.surfaceSunken = '#edf2f7'
    palette.border = '#e2e8f0'
    palette.borderStrong = '#cbd5e1'
    palette.text = '#0f172a'
    palette.textMuted = '#475569'
    palette.textSubtle = '#64748b'
    palette.isDark = false
  }

  if (o.accent && isValidHex(o.accent)) {
    Object.assign(palette, deriveAccentRamp(o.accent))
  }

  return {
    themeId: preset.id,
    colorMode,
    resolvedColorMode,
    isDark,
    density: o.density ?? preset.defaults.density,
    radius: o.radius ?? preset.defaults.radius,
    borderWidth: o.borderWidth ?? preset.defaults.borderWidth,
    shadow: o.shadow ?? preset.defaults.shadow,
    tableDensity: o.tableDensity ?? preset.defaults.tableDensity,
    fontFamily: o.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontScale: o.fontScale ?? DEFAULT_FONT_SCALE,
    contentWidth: o.contentWidth ?? 'wide',
    fieldStyle: o.fieldStyle ?? preset.defaults.fieldStyle,
    labelPlacement: o.labelPlacement ?? 'top',
    labelCase: o.labelCase ?? 'normal',
    requiredStyle: o.requiredStyle ?? 'asterisk',
    focusStyle: o.focusStyle ?? 'ring',
    buttonStyle: o.buttonStyle ?? 'solid',
    validationStyle: o.validationStyle ?? 'outlined',
    tableRowStyle: o.tableRowStyle ?? 'plain',
    dialogStyle: o.dialogStyle ?? 'standard',
    alertStyle: o.alertStyle ?? 'outlined',
    reduceMotion: o.reduceMotion ?? false,
    palette,
  }
}

/**
 * Turn resolved settings into the CSS custom properties the stylesheet reads.
 *
 * Note the `--primary-color*` names: those already exist in index.css and are
 * mapped into Tailwind's `@theme`, so overwriting them here re-colours every
 * existing `bg-primary` / `text-primary` utility across the app for free.
 */
export const appearanceToCssVars = (r: ResolvedAppearance): Record<string, string> => {
  const density = DENSITY_SCALE[r.density]
  const font = FONT_SCALE[r.fontScale]
  const contentWidth = CONTENT_WIDTH_SCALE[r.contentWidth]
  const family = FONT_FAMILY_SCALE[r.fontFamily]
  const radius = RADIUS_SCALE[r.radius]
  const shadow = SHADOW_SCALE[r.shadow]
  const table = TABLE_DENSITY_SCALE[r.tableDensity]
  const border = BORDER_WIDTH_SCALE[r.borderWidth]
  const p = r.palette

  return {
    // --- brand ramp (also feeds the pre-existing Tailwind @theme mapping) ---
    '--primary-color': p.accent,
    '--primary-color-hover': p.accentHover,
    '--primary-color-light': p.accentLight,
    '--primary-color-dark': p.accentDark,
    '--primary-color-muted': p.accentMuted,
    '--secondary-color': p.accentSecondary ?? p.accent,
    '--secondary-color-hover': p.accentSecondary ? darken(p.accentSecondary, 0.18) : p.accentHover,
    '--secondary-color-light': p.accentSecondary ? lighten(p.accentSecondary, 0.92) : p.accentLight,
    '--ui-accent-2': p.accentSecondary ?? p.accent,
    // Readable foreground for anything painted on the secondary accent.
    '--ui-on-accent-2': readableOn(p.accentSecondary ?? p.accent),
    '--brand-primary': p.accent,
    '--brand-primary-light': p.accentLight,
    '--brand-primary-dark': '#001a3d',
    '--brand-secondary': p.accent,
    '--ui-on-accent': readableOn(p.accent),
    '--table-header-bg': p.accent,
    '--table-header-text': readableOn(p.accent),

    // --- chrome ---
    '--ui-surface': p.surface,
    '--ui-surface-muted': p.surfaceMuted,
    '--ui-surface-sunken': p.surfaceSunken,
    '--ui-border': p.border,
    '--ui-border-strong': p.borderStrong,
    '--ui-text': p.text,
    '--ui-text-muted': p.textMuted,
    '--ui-text-subtle': p.textSubtle,

    // --- density ---
    '--ui-control-h': density.controlH,
    '--ui-control-px': density.controlPx,
    '--ui-field-gap': density.fieldGap,
    '--ui-section-gap': density.sectionGap,

    // --- typography ---
    '--ui-font-family': family.stack,
    '--ui-font-size': font.base,
    '--ui-label-size': font.label,
    '--ui-heading-size': font.heading,
    '--ui-content-max-width': contentWidth,

    // --- shape ---
    '--ui-radius-sm': radius.sm,
    '--ui-radius': radius.md,
    '--ui-radius-lg': radius.lg,
    '--ui-border-width': border,

    // --- elevation ---
    '--ui-shadow-card': shadow.card,
    '--ui-shadow-control': shadow.control,

    // --- table & page chrome ---
    '--ui-table-row-h': table.rowH,
    '--ui-table-cell-px': table.cellPx,
    '--ui-table-cell-py': table.cellPy,
    '--ui-page-padding': table.pagePadding,

    // --- dark mode & control background ---
    '--ui-control-bg': r.isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.92)',
    '--color-scheme': r.isDark ? 'dark' : 'light',
  }
}

/** Write the variables onto an element (defaults to <html>). */
export const applyAppearance = (
  resolved: ResolvedAppearance,
  target: HTMLElement = document.documentElement
): void => {
  const vars = appearanceToCssVars(resolved)
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value)
  }
  // Dark mode class, dataset, and colorScheme
  target.classList.toggle('dark', resolved.isDark)
  target.dataset.mode = resolved.isDark ? 'dark' : 'light'
  target.dataset.themeMode = resolved.isDark ? 'dark' : 'light'
  target.dataset.colorMode = resolved.colorMode
  target.dataset.resolvedMode = resolved.resolvedColorMode
  target.style.colorScheme = resolved.isDark ? 'dark' : 'light'

  // Non-numeric presentation choices ride as data-attributes; index.css keys
  // its variant rules off them.
  target.dataset.theme = resolved.themeId
  target.dataset.density = resolved.density
  target.dataset.fieldStyle = resolved.fieldStyle
  target.dataset.labelPlacement = resolved.labelPlacement
  target.dataset.labelCase = resolved.labelCase
  target.dataset.requiredStyle = resolved.requiredStyle
  target.dataset.focusStyle = resolved.focusStyle
  target.dataset.buttonStyle = resolved.buttonStyle
  target.dataset.validationStyle = resolved.validationStyle
  target.dataset.tableRowStyle = resolved.tableRowStyle
  target.dataset.dialogStyle = resolved.dialogStyle
  target.dataset.alertStyle = resolved.alertStyle
  target.dataset.reduceMotion = String(resolved.reduceMotion)
}
