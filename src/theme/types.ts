/**
 * Appearance system types.
 *
 * The system is intentionally split in two:
 *  - `ThemePreset`  : a named, designed look (palette + its own shape/density defaults)
 *  - `AppearanceOverrides` : per-setting user tweaks that win over the preset
 *
 * Effective value = override ?? preset default ?? global default.
 * Clearing the overrides returns the UI to the preset exactly as designed.
 */

export type ThemeId =
  | 'brand-navy'
  | 'brand-cyan'
  | 'corporate-navy'
  | 'slate-neutral'
  | 'redwood-warm'
  | 'teal-finance'
  | 'contrast-mono'
  | 'indigo-pro'
  | 'emerald-books'
  | 'graphite'
  | 'sandstone'

export type DensityId = 'compact' | 'default' | 'comfortable'
export type FontScaleId = 'sm' | 'md' | 'lg' | 'xl'
export type ContentWidthId = 'standard' | 'wide' | 'full'
export type RadiusId = 'none' | 'sm' | 'md' | 'lg' | 'xl'
export type BorderWidthId = 'hairline' | 'standard' | 'strong'
export type TableDensityId = 'compact' | 'default' | 'comfortable'
export type ShadowId = 'none' | 'subtle' | 'raised'
export type FieldStyleId = 'outlined' | 'filled' | 'underlined' | 'soft'
export type LabelPlacementId = 'top' | 'left'
export type LabelCaseId = 'normal' | 'upper'
export type RequiredStyleId = 'asterisk' | 'text' | 'none'
export type FocusStyleId = 'ring' | 'border' | 'underline' | 'glow'
export type ButtonStyleId = 'solid' | 'soft' | 'outline'
export type ValidationStyleId = 'outlined' | 'soft' | 'callout'
export type TableRowStyleId = 'plain' | 'striped'
export type DialogStyleId = 'standard' | 'outlined' | 'accent'
export type AlertStyleId = 'outlined' | 'soft' | 'solid'
export type FontFamilyId =
  // System (no download)
  | 'verdana'
  | 'arial'
  | 'segoe-ui'
  | 'tahoma'
  | 'system'
  // Web sans-serif
  | 'inter'
  | 'roboto'
  | 'open-sans'
  | 'lato'
  | 'ibm-plex'
  | 'source-sans'
  | 'nunito-sans'
  | 'poppins'
  | 'noto-sans'
  | 'plus-jakarta'
  // Bengali
  | 'noto-sans-bengali'
  | 'hind-siliguri'
  | 'solaiman-lipi'
  // Serif
  | 'georgia'
  | 'times-new-roman'
  // Monospace
  | 'courier-new'

/** Colour ramp for a theme. All values are CSS colours. */
export interface ThemePalette {
  /** Brand / action colour. Drives --primary-color and every `bg-primary` utility. */
  accent: string
  accentHover: string
  accentLight: string
  accentDark: string
  accentMuted: string
  /** Optional second brand colour. Drives --secondary-color; falls back to accent. */
  accentSecondary?: string
  /** Chrome */
  surface: string
  surfaceMuted: string
  surfaceSunken: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textSubtle: string
}

/**
 * A built-in ThemeId, or a `custom:<uuid>` id for a user-made theme.
 * The `& {}` keeps autocomplete on the built-ins while allowing any string.
 */
export type ThemeRef = ThemeId | (string & {})

export interface ThemePreset {
  id: ThemeRef
  name: string
  description: string
  palette: ThemePalette
  /** Shape and density this preset was designed around. */
  defaults: {
    density: DensityId
    radius: RadiusId
    borderWidth: BorderWidthId
    shadow: ShadowId
    tableDensity: TableDensityId
    fieldStyle: FieldStyleId
  }
}

/**
 * User tweaks. Every field is optional; `undefined` means "inherit from the preset".
 */
export interface AppearanceOverrides {
  density?: DensityId
  radius?: RadiusId
  borderWidth?: BorderWidthId
  shadow?: ShadowId
  tableDensity?: TableDensityId
  /** Typography is preset-independent — presets do not define fonts. */
  fontFamily?: FontFamilyId
  fontScale?: FontScaleId
  contentWidth?: ContentWidthId
  /** Hex colour that overrides the preset accent. Ramp is derived from it. */
  accent?: string
  /** Field and label presentation — preset-independent. */
  fieldStyle?: FieldStyleId
  labelPlacement?: LabelPlacementId
  labelCase?: LabelCaseId
  requiredStyle?: RequiredStyleId
  focusStyle?: FocusStyleId
  buttonStyle?: ButtonStyleId
  validationStyle?: ValidationStyleId
  tableRowStyle?: TableRowStyleId
  dialogStyle?: DialogStyleId
  alertStyle?: AlertStyleId
  /** Suppress transitions and animations app-wide. */
  reduceMotion?: boolean
}

export interface AppearanceState {
  themeId: ThemeRef
  overrides: AppearanceOverrides
}

/** Fully resolved values, with every `undefined` filled in. */
export interface ResolvedAppearance {
  themeId: ThemeRef
  density: DensityId
  radius: RadiusId
  borderWidth: BorderWidthId
  shadow: ShadowId
  tableDensity: TableDensityId
  fontFamily: FontFamilyId
  fontScale: FontScaleId
  contentWidth: ContentWidthId
  fieldStyle: FieldStyleId
  labelPlacement: LabelPlacementId
  labelCase: LabelCaseId
  requiredStyle: RequiredStyleId
  focusStyle: FocusStyleId
  buttonStyle: ButtonStyleId
  validationStyle: ValidationStyleId
  tableRowStyle: TableRowStyleId
  dialogStyle: DialogStyleId
  alertStyle: AlertStyleId
  reduceMotion: boolean
  palette: ThemePalette
}
