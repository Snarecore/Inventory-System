import type {
  ButtonStyleId,
  ContentWidthId,
  FieldStyleId,
  FocusStyleId,
  LabelCaseId,
  LabelPlacementId,
  RequiredStyleId,
  BorderWidthId,
  DensityId,
  FontFamilyId,
  FontScaleId,
  RadiusId,
  ShadowId,
  TableDensityId,
  ValidationStyleId,
  TableRowStyleId,
  DialogStyleId,
  AlertStyleId,
  ColorModeId,
} from './types'
import { FONT_LIST } from './fonts'

export interface ScaleOption<T extends string> {
  id: T
  label: string
  hint: string
}

/** Control density — drives field height, horizontal padding and vertical rhythm. */
export const DENSITY_SCALE: Record<
  DensityId,
  { controlH: string; controlPx: string; fieldGap: string; sectionGap: string }
> = {
  compact: { controlH: '30px', controlPx: '10px', fieldGap: '12px', sectionGap: '16px' },
  default: { controlH: '34px', controlPx: '12px', fieldGap: '16px', sectionGap: '24px' },
  comfortable: { controlH: '40px', controlPx: '14px', fieldGap: '20px', sectionGap: '32px' },
}

export const DENSITY_OPTIONS: ScaleOption<DensityId>[] = [
  { id: 'compact', label: 'Compact', hint: '30px controls — most rows per screen' },
  { id: 'default', label: 'Default', hint: '34px controls — balanced' },
  { id: 'comfortable', label: 'Comfortable', hint: '40px controls — easiest to hit' },
]

/** Base font size. Everything else is sized in em/rem relative to this. */
export const FONT_SCALE: Record<FontScaleId, { base: string; label: string; heading: string }> = {
  sm: { base: '13px', label: '11px', heading: '1.125rem' },
  md: { base: '14px', label: '12px', heading: '1.25rem' },
  lg: { base: '15px', label: '12px', heading: '1.375rem' },
  xl: { base: '16px', label: '13px', heading: '1.5rem' },
}

export const FONT_SCALE_OPTIONS: ScaleOption<FontScaleId>[] = [
  { id: 'sm', label: 'Small', hint: '13px base' },
  { id: 'md', label: 'Medium', hint: '14px base' },
  { id: 'lg', label: 'Large', hint: '15px base' },
  { id: 'xl', label: 'Extra large', hint: '16px base' },
]

/** Maximum width for pages using the shared ui-page container. */
export const CONTENT_WIDTH_SCALE: Record<ContentWidthId, string> = {
  standard: '1200px',
  wide: '1440px',
  full: '100%',
}

export const CONTENT_WIDTH_OPTIONS: ScaleOption<ContentWidthId>[] = [
  { id: 'standard', label: 'Standard', hint: '1200px — focused workspace' },
  { id: 'wide', label: 'Wide', hint: '1440px — more room for content' },
  { id: 'full', label: 'Full width', hint: 'Use all available space' },
]

/**
 * Font families are defined in ./fonts.ts, which also carries the category,
 * loading source and "best use" guidance. These two exports keep the older
 * shape so resolve.ts and existing callers do not need to change.
 */
export const FONT_FAMILY_SCALE: Record<FontFamilyId, { stack: string; label: string }> =
  Object.fromEntries(
    FONT_LIST.map((f) => [f.id, { stack: f.stack, label: f.label }])
  ) as Record<FontFamilyId, { stack: string; label: string }>

export const FONT_FAMILY_OPTIONS: ScaleOption<FontFamilyId>[] = FONT_LIST.map((f) => ({
  id: f.id,
  label: f.label,
  hint: f.bestUse,
}))

/** Corner radius. */
export const RADIUS_SCALE: Record<RadiusId, { sm: string; md: string; lg: string }> = {
  none: { sm: '0px', md: '0px', lg: '0px' },
  sm: { sm: '2px', md: '4px', lg: '6px' },
  md: { sm: '4px', md: '8px', lg: '12px' },
  lg: { sm: '6px', md: '12px', lg: '16px' },
  xl: { sm: '8px', md: '14px', lg: '20px' },
}

export const RADIUS_OPTIONS: ScaleOption<RadiusId>[] = [
  { id: 'none', label: 'Square', hint: '0px' },
  { id: 'sm', label: 'Slight', hint: '4px' },
  { id: 'md', label: 'Rounded', hint: '8px' },
  { id: 'lg', label: 'Soft', hint: '12px' },
  { id: 'xl', label: 'Pill-ish', hint: '14px' },
]

/** Border weight. */
export const BORDER_WIDTH_SCALE: Record<BorderWidthId, string> = {
  hairline: '1px',
  standard: '1.5px',
  strong: '2px',
}

export const BORDER_WIDTH_OPTIONS: ScaleOption<BorderWidthId>[] = [
  { id: 'hairline', label: 'Hairline', hint: '1px' },
  { id: 'standard', label: 'Standard', hint: '1.5px' },
  { id: 'strong', label: 'Strong', hint: '2px' },
]

/** Elevation. */
export const SHADOW_SCALE: Record<ShadowId, { card: string; control: string }> = {
  none: { card: 'none', control: 'none' },
  subtle: {
    card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
    control: '0 1px 1px rgba(15,23,42,0.03)',
  },
  raised: {
    card: '0 4px 6px -1px rgba(15,23,42,0.07), 0 10px 20px -8px rgba(15,23,42,0.12)',
    control: '0 1px 2px rgba(15,23,42,0.06)',
  },
}

export const SHADOW_OPTIONS: ScaleOption<ShadowId>[] = [
  { id: 'none', label: 'Flat', hint: 'No shadow' },
  { id: 'subtle', label: 'Subtle', hint: 'Light lift on cards' },
  { id: 'raised', label: 'Raised', hint: 'Pronounced depth' },
]

/** Table row height and page chrome. */
export const TABLE_DENSITY_SCALE: Record<
  TableDensityId,
  { rowH: string; cellPx: string; cellPy: string; pagePadding: string }
> = {
  compact: { rowH: '36px', cellPx: '10px', cellPy: '6px', pagePadding: '16px' },
  default: { rowH: '44px', cellPx: '14px', cellPy: '10px', pagePadding: '24px' },
  comfortable: { rowH: '52px', cellPx: '18px', cellPy: '14px', pagePadding: '32px' },
}

export const TABLE_DENSITY_OPTIONS: ScaleOption<TableDensityId>[] = [
  { id: 'compact', label: 'Compact', hint: '36px rows' },
  { id: 'default', label: 'Default', hint: '44px rows' },
  { id: 'comfortable', label: 'Comfortable', hint: '52px rows' },
]

/* ---------------------------------------------------------------------------
   Presentation options — how fields and labels are drawn.
   These are applied as data-attributes on <html>; see the rules in index.css.
   ------------------------------------------------------------------------ */

export const FIELD_STYLE_OPTIONS: ScaleOption<FieldStyleId>[] = [
  { id: 'outlined', label: 'Outlined', hint: 'Border on all sides, white fill' },
  { id: 'filled', label: 'Filled', hint: 'Tinted fill, border only on focus' },
  { id: 'underlined', label: 'Underlined', hint: 'Bottom rule only, no box' },
  { id: 'soft', label: 'Soft', hint: 'Tinted fill with a visible border' },
]

export const LABEL_PLACEMENT_OPTIONS: ScaleOption<LabelPlacementId>[] = [
  { id: 'top', label: 'Above field', hint: 'Stacked — best for narrow columns' },
  { id: 'left', label: 'Beside field', hint: 'Inline — denser, classic ERP' },
]

export const LABEL_CASE_OPTIONS: ScaleOption<LabelCaseId>[] = [
  { id: 'normal', label: 'Sentence case', hint: 'Invoice amount' },
  { id: 'upper', label: 'Uppercase', hint: 'INVOICE AMOUNT' },
]

export const REQUIRED_STYLE_OPTIONS: ScaleOption<RequiredStyleId>[] = [
  { id: 'asterisk', label: 'Asterisk', hint: 'Amount *' },
  { id: 'text', label: 'Text', hint: 'Amount (required)' },
  { id: 'none', label: 'Hidden', hint: 'No indicator' },
]

export const FOCUS_STYLE_OPTIONS: ScaleOption<FocusStyleId>[] = [
  { id: 'ring', label: 'Ring', hint: '3px halo around the field' },
  { id: 'border', label: 'Thick border', hint: 'Border weight increases' },
  { id: 'underline', label: 'Underline', hint: 'Accent bar along the bottom' },
  { id: 'glow', label: 'Glow', hint: 'Wider, softer halo' },
]

export const BUTTON_STYLE_OPTIONS: ScaleOption<ButtonStyleId>[] = [
  { id: 'solid', label: 'Solid', hint: 'Filled accent background' },
  { id: 'soft', label: 'Soft', hint: 'Tinted background, accent text' },
  { id: 'outline', label: 'Outline', hint: 'Accent border, transparent fill' },
]

export const VALIDATION_STYLE_OPTIONS: ScaleOption<ValidationStyleId>[] = [
  { id: 'outlined', label: 'Red outline + message', hint: 'Clear border with text below' },
  { id: 'soft', label: 'Soft highlight', hint: 'Tinted red field with text below' },
  { id: 'callout', label: 'Message callout', hint: 'Outlined field and boxed message' },
]

export const TABLE_ROW_STYLE_OPTIONS: ScaleOption<TableRowStyleId>[] = [
  { id: 'plain', label: 'Plain rows', hint: 'Clean background with hover state' },
  { id: 'striped', label: 'Striped rows', hint: 'Alternating backgrounds for scanning' },
]

export const DIALOG_STYLE_OPTIONS: ScaleOption<DialogStyleId>[] = [
  { id: 'standard', label: 'Standard', hint: 'Theme surface with normal elevation' },
  { id: 'outlined', label: 'Outlined', hint: 'Visible border around the dialog' },
  { id: 'accent', label: 'Accent header', hint: 'Brand color bar at the top' },
]

export const ALERT_STYLE_OPTIONS: ScaleOption<AlertStyleId>[] = [
  { id: 'outlined', label: 'Outlined', hint: 'Surface alert with semantic border' },
  { id: 'soft', label: 'Soft', hint: 'Semantic tinted background' },
  { id: 'solid', label: 'Solid', hint: 'Strong semantic color background' },
]

export const COLOR_MODE_OPTIONS: ScaleOption<ColorModeId>[] = [
  { id: 'light', label: 'Light mode', hint: 'Crisp daylight surfaces with high legibility' },
  { id: 'dark', label: 'Dark mode', hint: 'Low-glare charcoal surfaces for late-night workflows' },
  { id: 'system', label: 'System (Auto)', hint: 'Synchronize automatically with your device OS settings' },
]
