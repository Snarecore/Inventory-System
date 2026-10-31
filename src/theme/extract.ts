import { darken, deriveAccentRamp, lighten, luminance, normalizeHex } from './color'
import { THEME_PRESETS } from './themes'
import type { ThemePalette } from './types'

/**
 * Pull a usable palette out of pasted text.
 *
 * Accepts a CSS block (`--bs-primary: #0d6efd;`), a JSON object, or just a
 * loose list of hex codes. Named variables are matched first because they
 * carry intent; anything left over is assigned by luminance and saturation.
 *
 * This reads colour values only — it does not copy anyone's CSS or assets.
 */

const HEX_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g

/** Expand #abc to #aabbcc. */
const expand = (hex: string): string => {
  const v = hex.slice(1)
  return v.length === 3
    ? `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`.toLowerCase()
    : `#${v}`.toLowerCase()
}

const rgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
})

/** 0 for grey, 1 for a fully saturated hue. */
const saturation = (hex: string): number => {
  const { r, g, b } = rgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

/** Variable names that commonly carry each role, in priority order. */
const ROLE_HINTS: { role: 'accent' | 'surface' | 'text' | 'border'; patterns: RegExp[] }[] = [
  {
    role: 'accent',
    patterns: [
      /--(?:bs-)?primary\b/i,
      /--(?:color-)?primary\b/i,
      /--p\b/i,
      /\baccent\b/i,
      /\bbrand\b/i,
      /\btheme-color\b/i,
    ],
  },
  {
    role: 'surface',
    patterns: [/body-bg/i, /--(?:bs-)?white\b/i, /\bbackground\b/i, /\bsurface\b/i, /--b1\b/i],
  },
  {
    role: 'text',
    patterns: [/body-color/i, /\bforeground\b/i, /\btext\b/i, /--bc\b/i, /--(?:bs-)?dark\b/i],
  },
  { role: 'border', patterns: [/border-color/i, /\bborder\b/i, /--b3\b/i] },
]

export interface ExtractResult {
  palette: ThemePalette
  /** Every distinct colour found, for the UI to show. */
  found: string[]
  /** Which roles were matched by name rather than inferred. */
  namedRoles: string[]
  error?: string
}

const DEFAULTS = THEME_PRESETS['brand-navy'].palette

export const extractPalette = (input: string): ExtractResult => {
  const text = input.trim()
  if (!text) {
    return { palette: { ...DEFAULTS }, found: [], namedRoles: [], error: 'Paste something first.' }
  }

  // --- distinct colours, in order of appearance ---
  const found: string[] = []
  for (const m of text.matchAll(HEX_RE)) {
    const hex = expand(m[0])
    if (!found.includes(hex)) found.push(hex)
  }

  if (!found.length) {
    return {
      palette: { ...DEFAULTS },
      found: [],
      namedRoles: [],
      error: 'No hex colours found. Expected values like #0d6efd.',
    }
  }

  // --- role matching by variable / key name ---
  const named: Partial<Record<'accent' | 'surface' | 'text' | 'border', string>> = {}
  const namedRoles: string[] = []

  // Each "name: #hex" pair on one line, covering CSS vars and JSON alike.
  const pairRe = /([-\w"']+)\s*[:=]\s*["']?(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\b/g
  const pairs = [...text.matchAll(pairRe)].map((m) => ({ key: m[1], hex: expand(m[2]) }))

  for (const { role, patterns } of ROLE_HINTS) {
    if (named[role]) continue
    for (const pattern of patterns) {
      const hit = pairs.find((p) => pattern.test(p.key))
      if (hit) {
        named[role] = hit.hex
        namedRoles.push(role)
        break
      }
    }
  }

  // --- infer whatever was not named ---
  const byLum = [...found].sort((a, b) => luminance(a) - luminance(b))
  const darkest = byLum[0]
  const lightest = byLum[byLum.length - 1]

  // The accent should be the most saturated colour that is not near-white or
  // near-black, so a page full of greys does not yield a grey "accent".
  const accentCandidates = found
    .filter((h) => {
      const l = luminance(h)
      return l > 0.02 && l < 0.85
    })
    .sort((a, b) => saturation(b) - saturation(a))

  const accent = named.accent ?? accentCandidates[0] ?? darkest
  const surface = named.surface ?? (luminance(lightest) > 0.8 ? lightest : '#ffffff')
  const text_ = named.text ?? (luminance(darkest) < 0.25 ? darkest : '#0f172a')
  const border = named.border ?? lighten(text_, 0.86)

  const ramp = deriveAccentRamp(accent)

  const palette: ThemePalette = {
    ...ramp,
    surface: normalizeHex(surface),
    surfaceMuted: darken(surface, 0.025),
    surfaceSunken: darken(surface, 0.06),
    border: normalizeHex(border),
    borderStrong: darken(border, 0.18),
    text: normalizeHex(text_),
    textMuted: lighten(text_, 0.35),
    textSubtle: lighten(text_, 0.58),
  }

  return { palette, found, namedRoles }
}

/* ===========================================================================
   Image / logo extraction
   ---------------------------------------------------------------------------
   Same bucketing approach as the text extractor, run over an image's pixels
   via canvas. Entirely client-side — the file is never uploaded anywhere.
   ======================================================================== */

/** Longest edge the image is scaled to before sampling. Keeps it fast. */
const SAMPLE_MAX = 240

export interface ImageExtractResult extends ExtractResult {
  /** Dominant colours with the share of opaque pixels each covers. */
  swatches: { hex: string; pct: number }[]
}

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`

/**
 * Read the dominant colours out of an image file and build a palette.
 * Rejects rather than throws so callers can show a message.
 */
export const extractPaletteFromImage = (file: File): Promise<ImageExtractResult> =>
  new Promise((resolve) => {
    const fail = (error: string): ImageExtractResult => ({
      palette: { ...DEFAULTS },
      found: [],
      namedRoles: [],
      swatches: [],
      error,
    })

    if (!file.type.startsWith('image/')) {
      resolve(fail('That file is not an image.'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(fail('That image could not be read.'))
    }

    img.onload = () => {
      URL.revokeObjectURL(url)

      const scale = Math.min(1, SAMPLE_MAX / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        resolve(fail('Canvas is unavailable in this browser.'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)

      let pixels: Uint8ClampedArray
      try {
        pixels = ctx.getImageData(0, 0, w, h).data
      } catch {
        // Tainted canvas — only possible for cross-origin sources.
        resolve(fail('That image could not be sampled.'))
        return
      }

      // Quantise to a coarse grid so antialiased edges collapse onto the
      // solid colour they surround, then average each bucket back.
      const buckets = new Map<string, { n: number; r: number; g: number; b: number }>()
      let total = 0
      for (let i = 0; i < pixels.length; i += 4) {
        const a = pixels[i + 3]
        if (a < 128) continue
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const key = `${Math.round(r / 16)},${Math.round(g / 16)},${Math.round(b / 16)}`
        const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
        e.n++
        e.r += r
        e.g += g
        e.b += b
        buckets.set(key, e)
      }

      if (!total && buckets.size === 0) {
        resolve(fail('That image has no opaque pixels.'))
        return
      }
      total = [...buckets.values()].reduce((s, e) => s + e.n, 0)

      const ranked = [...buckets.values()]
        .map((e) => ({
          hex: toHex(e.r / e.n, e.g / e.n, e.b / e.n),
          pct: (e.n / total) * 100,
        }))
        .sort((a, b) => b.pct - a.pct)

      const swatches = ranked.slice(0, 8)

      // Brand colours: saturated, not the paper, and covering real area.
      const brand = ranked.filter(
        (c) => saturation(c.hex) > 0.3 && luminance(c.hex) < 0.75 && c.pct > 0.4
      )

      const accent = brand[0]?.hex ?? ranked[0].hex
      // A second brand colour only counts if it is a clearly different hue.
      const secondary = brand.find(
        (c) => Math.abs(luminance(c.hex) - luminance(accent)) > 0.08
      )?.hex

      // Surface is the lightest colour with real area — usually the paper.
      const lightest = [...ranked]
        .filter((c) => c.pct > 1)
        .sort((a, b) => luminance(b.hex) - luminance(a.hex))[0]
      const surface = lightest && luminance(lightest.hex) > 0.8 ? '#ffffff' : '#ffffff'

      const darkest = [...ranked].sort((a, b) => luminance(a.hex) - luminance(b.hex))[0]
      const text = luminance(darkest.hex) < 0.2 ? darkest.hex : '#0a1b30'

      const ramp = deriveAccentRamp(accent)
      const border = lighten(text, 0.86)

      resolve({
        palette: {
          ...ramp,
          accentSecondary: secondary,
          surface,
          surfaceMuted: darken(surface, 0.025),
          surfaceSunken: darken(surface, 0.06),
          border,
          borderStrong: darken(border, 0.18),
          text: normalizeHex(text),
          textMuted: lighten(text, 0.35),
          textSubtle: lighten(text, 0.58),
        },
        found: ranked.slice(0, 12).map((c) => c.hex),
        namedRoles: secondary ? ['accent', 'accentSecondary'] : ['accent'],
        swatches,
      })
    }

    img.src = url
  })
