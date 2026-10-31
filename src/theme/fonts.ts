import type { FontFamilyId } from './types'

/**
 * Font registry.
 *
 * Web fonts are fetched on demand (see `ensureFontLoaded`) rather than all
 * being linked from index.html — loading every family up front would cost
 * roughly a dozen stylesheet round-trips on first paint for fonts nobody picked.
 */

export type FontCategory = 'system' | 'sans' | 'bengali' | 'serif' | 'mono'
export type FontSource = 'system' | 'google' | 'cdn'

export interface FontDefinition {
  id: FontFamilyId
  label: string
  /** The "best use" guidance shown in the picker. */
  bestUse: string
  category: FontCategory
  source: FontSource
  /** Full CSS font stack. */
  stack: string
  /** Stylesheet to inject when this font is selected. Absent for system fonts. */
  href?: string
  /** Shown as a caveat in the picker. */
  note?: string
}

/**
 * Appended to every Latin stack. Nirmala UI ships with Windows and Shonar
 * Bangla with Office, so Bengali text and the ৳ sign still render even when
 * the chosen Latin face has no Bengali coverage.
 */
const BN_FALLBACK = `'Nirmala UI', 'Shonar Bangla', 'Noto Sans Bengali'`
const SANS_TAIL = `${BN_FALLBACK}, ui-sans-serif, system-ui, sans-serif`

const google = (query: string) => `https://fonts.googleapis.com/css2?family=${query}&display=swap`

export const FONTS: Record<FontFamilyId, FontDefinition> = {
  /* ---------------- System (no download) ---------------- */
  verdana: {
    id: 'verdana',
    label: 'Verdana',
    bestUse: 'ERP, HRMS, tables, forms',
    category: 'system',
    source: 'system',
    stack: `Verdana, Geneva, ${SANS_TAIL}`,
  },
  arial: {
    id: 'arial',
    label: 'Arial',
    bestUse: 'General business applications',
    category: 'system',
    source: 'system',
    stack: `Arial, Helvetica, ${SANS_TAIL}`,
  },
  'segoe-ui': {
    id: 'segoe-ui',
    label: 'Segoe UI',
    bestUse: 'Microsoft-style applications',
    category: 'system',
    source: 'system',
    stack: `'Segoe UI', 'Segoe UI Variable', ${SANS_TAIL}`,
    note: 'Ships with Windows; falls back elsewhere',
  },
  tahoma: {
    id: 'tahoma',
    label: 'Tahoma',
    bestUse: 'Compact business interfaces',
    category: 'system',
    source: 'system',
    stack: `Tahoma, Verdana, ${SANS_TAIL}`,
  },
  system: {
    id: 'system',
    label: 'System UI',
    bestUse: 'Native operating-system appearance',
    category: 'system',
    source: 'system',
    stack: `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, ${SANS_TAIL}`,
  },

  /* ---------------- Web sans (Google) ---------------- */
  inter: {
    id: 'inter',
    label: 'Inter',
    bestUse: 'Modern web applications',
    category: 'sans',
    source: 'google',
    stack: `'Inter', ${SANS_TAIL}`,
    href: google('Inter:wght@300..700'),
  },
  roboto: {
    id: 'roboto',
    label: 'Roboto',
    bestUse: 'Admin dashboards',
    category: 'sans',
    source: 'google',
    stack: `'Roboto', ${SANS_TAIL}`,
    href: google('Roboto:wght@300..700'),
  },
  'open-sans': {
    id: 'open-sans',
    label: 'Open Sans',
    bestUse: 'Business portals',
    category: 'sans',
    source: 'google',
    stack: `'Open Sans', ${SANS_TAIL}`,
    href: google('Open+Sans:wght@300..800'),
  },
  lato: {
    id: 'lato',
    label: 'Lato',
    bestUse: 'Corporate websites',
    category: 'sans',
    source: 'google',
    stack: `'Lato', ${SANS_TAIL}`,
    href: google('Lato:wght@300;400;700;900'),
  },
  'ibm-plex': {
    id: 'ibm-plex',
    label: 'IBM Plex Sans',
    bestUse: 'Enterprise applications',
    category: 'sans',
    source: 'google',
    stack: `'IBM Plex Sans', ${SANS_TAIL}`,
    href: google('IBM+Plex+Sans:wght@300;400;500;600;700'),
  },
  'source-sans': {
    id: 'source-sans',
    label: 'Source Sans 3',
    bestUse: 'Reports and forms',
    category: 'sans',
    source: 'google',
    stack: `'Source Sans 3', ${SANS_TAIL}`,
    href: google('Source+Sans+3:wght@300..700'),
  },
  'nunito-sans': {
    id: 'nunito-sans',
    label: 'Nunito Sans',
    bestUse: 'Modern dashboards',
    category: 'sans',
    source: 'google',
    stack: `'Nunito Sans', ${SANS_TAIL}`,
    href: google('Nunito+Sans:wght@300..700'),
  },
  poppins: {
    id: 'poppins',
    label: 'Poppins',
    bestUse: 'Landing pages and headings',
    category: 'sans',
    source: 'google',
    stack: `'Poppins', ${SANS_TAIL}`,
    href: google('Poppins:wght@300;400;500;600;700'),
    note: 'Geometric and wide — heavy for dense tables',
  },
  'noto-sans': {
    id: 'noto-sans',
    label: 'Noto Sans',
    bestUse: 'Multilingual applications',
    category: 'sans',
    source: 'google',
    stack: `'Noto Sans', ${SANS_TAIL}`,
    href: google('Noto+Sans:wght@300..700'),
  },
  'plus-jakarta': {
    id: 'plus-jakarta',
    label: 'Plus Jakarta Sans',
    bestUse: 'Current Cash Boi default',
    category: 'sans',
    source: 'google',
    stack: `'Plus Jakarta Sans', ${SANS_TAIL}`,
    href: google('Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800'),
  },

  /* ---------------- Bengali ---------------- */
  'noto-sans-bengali': {
    id: 'noto-sans-bengali',
    label: 'Noto Sans Bengali',
    bestUse: 'Bengali UI text',
    category: 'bengali',
    source: 'google',
    stack: `'Noto Sans Bengali', ${BN_FALLBACK}, ui-sans-serif, sans-serif`,
    href: google('Noto+Sans+Bengali:wght@300..700'),
  },
  'hind-siliguri': {
    id: 'hind-siliguri',
    label: 'Hind Siliguri',
    bestUse: 'Bengali websites',
    category: 'bengali',
    source: 'google',
    stack: `'Hind Siliguri', ${BN_FALLBACK}, ui-sans-serif, sans-serif`,
    href: google('Hind+Siliguri:wght@300;400;500;600;700'),
    note: 'Covers Bengali and Latin in one face',
  },
  'solaiman-lipi': {
    id: 'solaiman-lipi',
    label: 'SolaimanLipi',
    bestUse: 'Bengali business applications',
    category: 'bengali',
    source: 'cdn',
    stack: `'SolaimanLipi', ${BN_FALLBACK}, ui-sans-serif, sans-serif`,
    href: 'https://fonts.maateen.me/solaiman-lipi/font.css',
    note: 'Community CDN, not Google — self-host for production',
  },

  /* ---------------- Serif ---------------- */
  georgia: {
    id: 'georgia',
    label: 'Georgia',
    bestUse: 'Formal documents',
    category: 'serif',
    source: 'system',
    stack: `Georgia, 'Times New Roman', ${BN_FALLBACK}, serif`,
  },
  'times-new-roman': {
    id: 'times-new-roman',
    label: 'Times New Roman',
    bestUse: 'Print-style reports',
    category: 'serif',
    source: 'system',
    stack: `'Times New Roman', Times, ${BN_FALLBACK}, serif`,
  },

  /* ---------------- Monospace ---------------- */
  'courier-new': {
    id: 'courier-new',
    label: 'Courier New',
    bestUse: 'Code and fixed-width data',
    category: 'mono',
    source: 'system',
    // Bengali has no common monospace face; the proportional fallback at least
    // renders the glyphs instead of tofu boxes.
    stack: `'Courier New', Courier, ui-monospace, monospace, ${BN_FALLBACK}`,
    note: 'Fixed width — aligns figures, but wide',
  },
}

export const FONT_LIST: FontDefinition[] = Object.values(FONTS)

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  system: 'System fonts — no download',
  sans: 'Web sans-serif',
  bengali: 'Bengali / বাংলা',
  serif: 'Serif',
  mono: 'Monospace',
}

export const FONT_CATEGORY_ORDER: FontCategory[] = ['system', 'sans', 'bengali', 'serif', 'mono']

/**
 * Inject the stylesheet for a font the first time it is selected.
 * System fonts need nothing; repeat calls are no-ops.
 */
export const ensureFontLoaded = (id: FontFamilyId): void => {
  if (typeof document === 'undefined') return

  const font = FONTS[id]
  if (!font?.href) return

  const attr = `data-font-id`
  if (document.head.querySelector(`link[${attr}="${id}"]`)) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = font.href
  link.setAttribute(attr, id)
  // A blocked or offline CDN must not break the page — the stack falls through.
  link.onerror = () => link.remove()
  document.head.appendChild(link)
}
