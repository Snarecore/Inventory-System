import type { IconType } from 'react-icons'

export type Theme = 'light' | 'dark' | 'system'

export interface NavItem {
  label: string
  href: string
  icon?: IconType
}

export interface FeatureItem {
  title: string
  description: string
  icon: IconType
}
