import type { SaleItem, SalesReturnItem, PurchaseItem, PurchaseReturnItem } from "@/types";
import { getStoredUser, getUserInfo, getActiveBranchId, getBusinessCode } from "./auth-storage";

interface PersistedReturnRecord {
  sale: SaleItem;
  returnItem: SalesReturnItem;
  timestamp: number;
}

interface PersistedPurchaseReturnRecord {
  purchase: PurchaseItem;
  returnItem: PurchaseReturnItem;
  timestamp: number;
}

const SALES_STORAGE_PREFIX = "trade_persisted_returns_v1";
const PURCHASE_STORAGE_PREFIX = "trade_persisted_purchase_returns_v1";

const getStorageKey = (prefix: string = SALES_STORAGE_PREFIX): string => {
  try {
    const userInfo = getUserInfo();
    const user = getStoredUser();
    const bCode = getBusinessCode() || userInfo?.businessCode || user?.businessCode || "default";
    const branchId = getActiveBranchId() || userInfo?.branchId || 0;
    return `${prefix}_${bCode}_${branchId}`;
  } catch {
    return `${prefix}_default`;
  }
};

/**
 * Persist a trade return so that 100% returned sales are never lost
 * even if backend APIs drop them from active sale listings.
 */
export function savePersistedTradeReturn(sale: SaleItem, returnItem: SalesReturnItem): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const key = getStorageKey(SALES_STORAGE_PREFIX);
    const raw = localStorage.getItem(key);
    let map: Record<string, PersistedReturnRecord> = {};

    if (raw) {
      try {
        map = JSON.parse(raw) || {};
      } catch {
        map = {};
      }
    }

    const saleKey = String(
      sale.invoiceNo ||
        sale.orderNo ||
        returnItem.salesInvoiceNo ||
        returnItem.invoiceNo ||
        returnItem.orderNo ||
        ""
    )
      .trim()
      .toLowerCase();
    if (!saleKey) return;

    // Ensure enriched return flags
    const enrichedSale: SaleItem = {
      ...sale,
      hasReturn: true,
      returnNo: returnItem.returnNo || sale.returnNo,
      returnGrandTotal: returnItem.grandTotal ?? returnItem.totalAmount ?? sale.returnGrandTotal,
      returnRefundAmount: returnItem.refundAmount ?? returnItem.grandTotal ?? sale.returnRefundAmount,
      returnDetails:
        returnItem.returnDetails && returnItem.returnDetails.length > 0
          ? returnItem.returnDetails
          : sale.returnDetails,
    };

    const enrichedReturn: SalesReturnItem = {
      ...returnItem,
      hasReturn: true,
      salesInvoiceNo: returnItem.salesInvoiceNo || sale.salesInvoiceNo || sale.invoiceNo,
      orderNo: returnItem.orderNo || sale.orderNo,
      invoiceNo: returnItem.invoiceNo || sale.invoiceNo,
    };

    map[saleKey] = {
      sale: enrichedSale,
      returnItem: enrichedReturn,
      timestamp: Date.now(),
    };

    // Keep map bounded to 300 entries
    const entries = Object.entries(map);
    if (entries.length > 300) {
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      map = Object.fromEntries(entries.slice(0, 300));
    }

    localStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.warn("Failed to persist trade return to localStorage:", err);
  }
}

/**
 * Retrieve all persisted trade returns for the active tenant/branch.
 */
export function getPersistedTradeReturns(): {
  returnedSales: SaleItem[];
  returnVouchers: SalesReturnItem[];
} {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { returnedSales: [], returnVouchers: [] };
    }
    const key = getStorageKey(SALES_STORAGE_PREFIX);
    const raw = localStorage.getItem(key);
    if (!raw) return { returnedSales: [], returnVouchers: [] };

    const map: Record<string, PersistedReturnRecord> = JSON.parse(raw);
    const returnedSales: SaleItem[] = [];
    const returnVouchers: SalesReturnItem[] = [];

    Object.values(map).forEach((record) => {
      if (record?.sale) returnedSales.push(record.sale);
      if (record?.returnItem) returnVouchers.push(record.returnItem);
    });

    return { returnedSales, returnVouchers };
  } catch {
    return { returnedSales: [], returnVouchers: [] };
  }
}

/**
 * Persist a purchase return so that 100% returned purchases are never lost
 * even if backend APIs drop them from active purchase listings.
 */
export function savePersistedPurchaseReturn(purchase: PurchaseItem, returnItem: PurchaseReturnItem): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const key = getStorageKey(PURCHASE_STORAGE_PREFIX);
    const raw = localStorage.getItem(key);
    let map: Record<string, PersistedPurchaseReturnRecord> = {};

    if (raw) {
      try {
        map = JSON.parse(raw) || {};
      } catch {
        map = {};
      }
    }

    const purchaseKey = String(
      purchase.invoiceNo ||
        purchase.purchaseInvoiceNo ||
        purchase.orderNo ||
        purchase.challanNo ||
        returnItem.purchaseInvoiceNo ||
        returnItem.invoiceNo ||
        returnItem.challanNo ||
        ""
    )
      .trim()
      .toLowerCase();
    if (!purchaseKey) return;

    const enrichedPurchase: PurchaseItem = {
      ...purchase,
      hasReturn: true,
      returnNo: returnItem.returnNo || (purchase as any).returnNo,
      returnGrandTotal: returnItem.grandTotal ?? returnItem.totalAmount ?? (purchase as any).returnGrandTotal,
      returnRefundAmount: returnItem.refundAmount ?? returnItem.grandTotal ?? (purchase as any).returnRefundAmount,
      returnDetails:
        returnItem.returnDetails && returnItem.returnDetails.length > 0
          ? returnItem.returnDetails
          : (purchase as any).returnDetails,
    };

    const enrichedReturn: PurchaseReturnItem = {
      ...returnItem,
      hasReturn: true,
      purchaseInvoiceNo: returnItem.purchaseInvoiceNo || purchase.purchaseInvoiceNo || purchase.invoiceNo,
      invoiceNo: returnItem.invoiceNo || purchase.invoiceNo,
      challanNo: returnItem.challanNo || purchase.challanNo,
      orderNo: returnItem.orderNo || purchase.orderNo,
    };

    map[purchaseKey] = {
      purchase: enrichedPurchase,
      returnItem: enrichedReturn,
      timestamp: Date.now(),
    };

    const entries = Object.entries(map);
    if (entries.length > 300) {
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      map = Object.fromEntries(entries.slice(0, 300));
    }

    localStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.warn("Failed to persist purchase return to localStorage:", err);
  }
}

/**
 * Retrieve all persisted purchase returns for the active tenant/branch.
 */
export function getPersistedPurchaseReturns(): {
  returnedPurchases: PurchaseItem[];
  returnVouchers: PurchaseReturnItem[];
} {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { returnedPurchases: [], returnVouchers: [] };
    }
    const key = getStorageKey(PURCHASE_STORAGE_PREFIX);
    const raw = localStorage.getItem(key);
    if (!raw) return { returnedPurchases: [], returnVouchers: [] };

    const map: Record<string, PersistedPurchaseReturnRecord> = JSON.parse(raw);
    const returnedPurchases: PurchaseItem[] = [];
    const returnVouchers: PurchaseReturnItem[] = [];

    Object.values(map).forEach((record) => {
      if (record?.purchase) returnedPurchases.push(record.purchase);
      if (record?.returnItem) returnVouchers.push(record.returnItem);
    });

    return { returnedPurchases, returnVouchers };
  } catch {
    return { returnedPurchases: [], returnVouchers: [] };
  }
}

/**
 * Remove persisted purchase returns that match verified backend purchase invoices.
 */
export function removePersistedPurchaseReturnsByInvoices(invoiceKeys: string[]): void {
  try {
    if (
      typeof window === "undefined" ||
      !window.localStorage ||
      !Array.isArray(invoiceKeys) ||
      invoiceKeys.length === 0
    ) {
      return;
    }
    const key = getStorageKey(PURCHASE_STORAGE_PREFIX);
    const raw = localStorage.getItem(key);
    if (!raw) return;

    const map: Record<string, PersistedPurchaseReturnRecord> = JSON.parse(raw);
    const targetSet = new Set(
      invoiceKeys.map((k) => String(k || "").trim().toLowerCase()).filter(Boolean)
    );
    let changed = false;

    Object.keys(map).forEach((k) => {
      const rec = map[k];
      const purInv = String(
        rec?.purchase?.invoiceNo ||
          rec?.purchase?.purchaseInvoiceNo ||
          rec?.purchase?.orderNo ||
          rec?.returnItem?.purchaseInvoiceNo ||
          rec?.returnItem?.invoiceNo ||
          k
      )
        .trim()
        .toLowerCase();

      if (targetSet.has(k) || targetSet.has(purInv)) {
        delete map[k];
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(key, JSON.stringify(map));
    }
  } catch (err) {
    console.warn("Failed to clean up persisted purchase returns:", err);
  }
}

/**
 * Completely clear all persisted purchase returns from localStorage.
 */
export function clearAllPersistedPurchaseReturns(): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const key = getStorageKey(PURCHASE_STORAGE_PREFIX);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("Failed to clear persisted purchase returns:", err);
  }
}
