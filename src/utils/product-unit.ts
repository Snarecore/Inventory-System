import type { ProductItem } from '@/types'

export interface StockDisplayInfo {
  hasSecondaryUnit: boolean
  displayStock: string
  primaryStockText: string
  unit: string
  quantity: number
  conversionFactor: number | null
}

/**
 * Extracts conversion factor (1 Primary Unit = X Secondary Units) from packing_levels
 * or direct properties if present.
 */
export function getProductConversionFactor(
  product: ProductItem | any,
  secondaryUnit?: string
): number | null {
  if (!product) return null

  const directFactor = Number(
    product.conversionFactor ??
    product.conversion_factor ??
    product.conversionRate ??
    product.conversion_rate
  )
  if (!isNaN(directFactor) && directFactor > 0) {
    return directFactor
  }

  const packing = String(product.packing_levels || product.packingLevels || '').trim()
  if (!packing) return null

  // 1. If format contains '=' (e.g. "1 Dozen = 12 PCS"), take value after '='
  if (packing.includes('=')) {
    const parts = packing.split('=')
    if (parts[1]) {
      const matchAfter = parts[1].match(/\d+(\.\d+)?/)
      if (matchAfter) {
        const val = parseFloat(matchAfter[0])
        if (val > 0) return val
      }
    }
  }

  // 2. Format from ProductForm: e.g. "12 PCS/Dozen" or "10 pcs/box"
  const secUnit = secondaryUnit || String(product.secondary_unit || product.secondaryUnit || '').trim()
  if (secUnit) {
    const escaped = secUnit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const secRegex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${escaped}`, 'i')
    const secMatch = packing.match(secRegex)
    if (secMatch) {
      const val = parseFloat(secMatch[1])
      if (val > 0) return val
    }
  }

  // 3. Fallback: first number found in packing_levels string
  const match = packing.match(/\d+(\.\d+)?/)
  if (match) {
    const val = parseFloat(match[0])
    if (val > 0) return val
  }

  return null
}

/**
 * Calculates stock display info for a product.
 * When secondary unit is given, the quantity is displayed directly in terms of that secondary unit
 * (e.g., if quantity is 100 and secondary unit is PCS, it displays "100 PCS").
 */
export function getProductStockDisplay(product: ProductItem | any): StockDisplayInfo {
  const baseQty = Number(product?.quantity ?? product?.stock ?? 0)
  const primaryUnit = (product?.unit || 'PCS').trim()
  const secondaryUnit = String(product?.secondary_unit || product?.secondaryUnit || '').trim()

  const formattedQty = baseQty.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })

  if (secondaryUnit) {
    const factor = getProductConversionFactor(product, secondaryUnit)

    let primaryStockText = primaryUnit
    if (factor && factor > 0 && baseQty > 0) {
      const inPrimary = Number((baseQty / factor).toFixed(2))
      primaryStockText = `~${inPrimary} ${primaryUnit}`
    }

    return {
      hasSecondaryUnit: true,
      displayStock: `${formattedQty} ${secondaryUnit}`,
      primaryStockText: primaryStockText,
      unit: secondaryUnit,
      quantity: baseQty,
      conversionFactor: factor,
    }
  }

  return {
    hasSecondaryUnit: false,
    displayStock: `${formattedQty} ${primaryUnit}`,
    primaryStockText: `${formattedQty} ${primaryUnit}`,
    unit: primaryUnit,
    quantity: baseQty,
    conversionFactor: null,
  }
}

/**
 * Returns the effective unit for a product:
 * Secondary unit if provided, otherwise Primary unit.
 */
export function getProductEffectiveUnit(product: ProductItem | any): string {
  if (!product) return "pcs"
  const secondary = String(product.secondary_unit || product.secondaryUnit || "").trim()
  if (secondary) return secondary
  return String(product.unit || "pcs").trim()
}

