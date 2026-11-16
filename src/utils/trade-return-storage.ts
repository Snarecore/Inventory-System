import type { SaleItem, SalesReturnItem, PurchaseItem, PurchaseReturnItem } from "@/types";

const SALES_STORAGE_PREFIX = "trade_persisted_returns_v1";
const PURCHASE_STORAGE_PREFIX = "trade_persisted_purchase_returns_v1";

/**
 * Clean up all legacy persisted trade returns from browser localStorage.
 * Ensures that client browsers never retain stale synthetic return records.
 */
export function purgeAllLegacyPersistedTradeReturns(): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(SALES_STORAGE_PREFIX) || key.startsWith(PURCHASE_STORAGE_PREFIX))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn("Failed to purge legacy trade returns from localStorage:", err);
  }
}

// Auto-purge on module load
if (typeof window !== "undefined") {
  purgeAllLegacyPersistedTradeReturns();
}

/**
 * No-op: Trade returns are 100% backend-driven. Nothing is stored in browser localStorage.
 */
export function savePersistedTradeReturn(_sale?: SaleItem, _returnItem?: SalesReturnItem): void {
  purgeAllLegacyPersistedTradeReturns();
}

/**
 * Returns empty arrays. Trade returns are strictly derived from authoritative backend APIs.
 */
export function getPersistedTradeReturns(): {
  returnedSales: SaleItem[];
  returnVouchers: SalesReturnItem[];
} {
  return { returnedSales: [], returnVouchers: [] };
}

/**
 * Clears legacy storage keys.
 */
export function removePersistedTradeReturnsByInvoices(_invoiceKeys?: string[]): void {
  purgeAllLegacyPersistedTradeReturns();
}

/**
 * Clears legacy storage keys.
 */
export function clearAllPersistedTradeReturns(): void {
  purgeAllLegacyPersistedTradeReturns();
}

/**
 * No-op: Purchase returns are 100% backend-driven. Nothing is stored in browser localStorage.
 */
export function savePersistedPurchaseReturn(_purchase?: PurchaseItem, _returnItem?: PurchaseReturnItem): void {
  purgeAllLegacyPersistedTradeReturns();
}

/**
 * Returns empty arrays. Purchase returns are strictly derived from authoritative backend APIs.
 */
export function getPersistedPurchaseReturns(): {
  returnedPurchases: PurchaseItem[];
  returnVouchers: PurchaseReturnItem[];
} {
  return { returnedPurchases: [], returnVouchers: [] };
}

/**
 * Clears legacy storage keys.
 */
export function removePersistedPurchaseReturnsByInvoices(_invoiceKeys?: string[]): void {
  purgeAllLegacyPersistedTradeReturns();
}

/**
 * Clears legacy storage keys.
 */
export function clearAllPersistedPurchaseReturns(): void {
  purgeAllLegacyPersistedTradeReturns();
}
