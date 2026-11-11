import type { SaleItem, SalesReturnItem } from "@/types";
import { getStoredUser, getUserInfo, getActiveBranchId, getBusinessCode } from "./auth-storage";

interface PersistedReturnRecord {
  sale: SaleItem;
  returnItem: SalesReturnItem;
  timestamp: number;
}

const STORAGE_PREFIX = "trade_persisted_returns_v1";

const getStorageKey = (): string => {
  try {
    const userInfo = getUserInfo();
    const user = getStoredUser();
    const bCode = getBusinessCode() || userInfo?.businessCode || user?.businessCode || "default";
    const branchId = getActiveBranchId() || userInfo?.branchId || 0;
    return `${STORAGE_PREFIX}_${bCode}_${branchId}`;
  } catch {
    return `${STORAGE_PREFIX}_default`;
  }
};

/**
 * Persist a trade return so that 100% returned sales are never lost
 * even if backend APIs drop them from active sale listings.
 */
export function savePersistedTradeReturn(sale: SaleItem, returnItem: SalesReturnItem): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    let map: Record<string, PersistedReturnRecord> = {};

    if (raw) {
      try {
        map = JSON.parse(raw) || {};
      } catch {
        map = {};
      }
    }

    const saleKey = String(sale.invoiceNo || sale.orderNo || returnItem.salesInvoiceNo || returnItem.invoiceNo || returnItem.orderNo || "").trim().toLowerCase();
    if (!saleKey) return;

    // Ensure enriched return flags
    const enrichedSale: SaleItem = {
      ...sale,
      hasReturn: true,
      returnNo: returnItem.returnNo || sale.returnNo,
      returnGrandTotal: returnItem.grandTotal ?? returnItem.totalAmount ?? sale.returnGrandTotal,
      returnRefundAmount: returnItem.refundAmount ?? returnItem.grandTotal ?? sale.returnRefundAmount,
      returnDetails: returnItem.returnDetails && returnItem.returnDetails.length > 0 ? returnItem.returnDetails : sale.returnDetails,
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
    const key = getStorageKey();
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
