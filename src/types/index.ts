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

export interface ProductItem {
  id?: string | number
  productId?: string | number
  name?: string
  productName?: string
  pcode?: string
  productCode?: string
  sku?: string
  barcode?: string
  category?: string
  categoryName?: string
  unit?: string
  secondary_unit?: string
  secondaryUnit?: string
  secondary_price?: number | string
  secondaryPrice?: number | string
  quantity?: number | string
  stock?: number | string
  buy_price?: number | string
  buyPrice?: number | string
  sell_price?: number | string
  sellPrice?: number | string
  low_stock_threshold?: number | string
  lowStockThreshold?: number | string
  packing_levels?: string
  packingLevels?: string
  status?: 'active' | 'inactive' | string | boolean
  featuredImage?: string
  image?: string
  imageUrl?: string
  branchId?: number | string
  orgId?: number | string
  [key: string]: any
}

export type PartyType = 'CUSTOMER' | 'SUPPLIER'

export interface PartyItem {
  id?: string | number
  partyId?: string | number
  party_id?: string | number
  name?: string
  partyName?: string
  party_name?: string
  type?: PartyType | string
  partyType?: PartyType | string
  party_type?: PartyType | string
  phone?: string
  phoneNumber?: string
  partyPhone?: string
  party_phone?: string
  email?: string
  partyEmail?: string
  address?: string
  partyAddress?: string
  openingBalance?: number | string
  opening_balance?: number | string
  balance?: number | string
  dueAmount?: number | string
  due_amount?: number | string
  status?: 'active' | 'inactive' | string | boolean
  branchId?: number | string
  orgId?: number | string
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: any
}
