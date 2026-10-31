import { createContext } from 'react'
import type {
  AppearanceOverrides,
  AppearanceState,
  ResolvedAppearance,
  ThemePreset,
  ThemeRef,
} from './types'

export interface AppearanceContextValue {
  /** Raw stored state: chosen theme plus any explicit overrides. */
  state: AppearanceState
  /** Every setting filled in — what the UI actually renders with. */
  resolved: ResolvedAppearance
  /** The active theme, built-in or custom. */
  activeTheme: ThemePreset
  /** Switch theme. Overrides are kept so an explicit font/density survives. */
  setTheme: (id: ThemeRef) => void
  /** Set one or more overrides. Pass `undefined` for a key to clear it. */
  setOverrides: (patch: AppearanceOverrides) => void
  /** Drop all overrides, returning to the active theme exactly as designed. */
  resetOverrides: () => void
  /** Back to the shipped default theme with no overrides. */
  resetAll: () => void
  /** True when at least one override is active. */
  hasOverrides: boolean

  /* ---- User-made themes ---- */
  customThemes: ThemePreset[]
  /** Create or update by id; returns the stored theme. */
  saveCustomTheme: (theme: ThemePreset) => ThemePreset
  /** Remove a custom theme. If it is active, falls back to the default. */
  deleteCustomTheme: (id: ThemeRef) => void
  /** Replace the whole custom-theme list (used by import). */
  replaceCustomThemes: (themes: ThemePreset[]) => void
}

export const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined)
