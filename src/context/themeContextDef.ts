import { createContext } from 'react'
import type { Theme } from '@/types'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
