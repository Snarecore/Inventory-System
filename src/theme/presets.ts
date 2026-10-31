import { THEME_PRESETS } from './themes'
import type { AppearanceState, ThemeId } from './types'

const PRESET_STORAGE_KEY = 'cash-boi-appearance-presets'
const EXPORT_FORMAT = 'cash-boi/appearance'
const EXPORT_VERSION = 1

export interface SavedPreset {
  id: string
  name: string
  savedAt: string
  state: AppearanceState
}

interface ExportEnvelope {
  format: string
  version: number
  exportedAt: string
  presets: SavedPreset[]
}

/**
 * Validate an unknown value as AppearanceState. Anything unrecognised is
 * dropped rather than trusted — imported files are untrusted input.
 */
const sanitizeState = (value: unknown): AppearanceState | null => {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<AppearanceState>
  if (typeof v.themeId !== 'string' || !(v.themeId in THEME_PRESETS)) return null

  const overrides =
    v.overrides && typeof v.overrides === 'object' && !Array.isArray(v.overrides)
      ? { ...v.overrides }
      : {}

  return { themeId: v.themeId as ThemeId, overrides }
}

const sanitizePreset = (value: unknown): SavedPreset | null => {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<SavedPreset>
  const state = sanitizeState(v.state)
  if (!state) return null
  if (typeof v.name !== 'string' || !v.name.trim()) return null

  return {
    id: typeof v.id === 'string' && v.id ? v.id : crypto.randomUUID(),
    name: v.name.trim().slice(0, 60),
    savedAt: typeof v.savedAt === 'string' ? v.savedAt : new Date().toISOString(),
    state,
  }
}

export const loadPresets = (): SavedPreset[] => {
  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(sanitizePreset).filter((p): p is SavedPreset => p !== null)
  } catch {
    return []
  }
}

export const persistPresets = (presets: SavedPreset[]): void => {
  try {
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // Storage unavailable — presets simply will not survive a reload.
  }
}

export const createPreset = (name: string, state: AppearanceState): SavedPreset => ({
  id: crypto.randomUUID(),
  name: name.trim().slice(0, 60),
  savedAt: new Date().toISOString(),
  state: { themeId: state.themeId, overrides: { ...state.overrides } },
})

/** Serialise presets to a downloadable JSON string. */
export const exportPresets = (presets: SavedPreset[]): string => {
  const envelope: ExportEnvelope = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    presets,
  }
  return JSON.stringify(envelope, null, 2)
}

export interface ImportResult {
  presets: SavedPreset[]
  error?: string
}

/** Parse an exported file. Accepts the envelope, a bare array, or one preset. */
export const parseImport = (text: string): ImportResult => {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { presets: [], error: 'That file is not valid JSON.' }
  }

  let candidates: unknown[]
  if (Array.isArray(parsed)) {
    candidates = parsed
  } else if (parsed && typeof parsed === 'object' && 'presets' in parsed) {
    const envelope = parsed as Partial<ExportEnvelope>
    if (envelope.format && envelope.format !== EXPORT_FORMAT) {
      return { presets: [], error: 'That file was not exported from Cash Boi.' }
    }
    candidates = Array.isArray(envelope.presets) ? envelope.presets : []
  } else {
    candidates = [parsed]
  }

  const presets = candidates.map(sanitizePreset).filter((p): p is SavedPreset => p !== null)

  if (!presets.length) {
    return { presets: [], error: 'No usable presets were found in that file.' }
  }
  return { presets }
}

/** Trigger a browser download of the given presets. */
export const downloadPresets = (presets: SavedPreset[], filename = 'cash-boi-appearance.json') => {
  const blob = new Blob([exportPresets(presets)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
