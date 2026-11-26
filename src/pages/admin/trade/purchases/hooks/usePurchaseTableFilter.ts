import { useState, useMemo, useCallback } from "react";
import moment from "moment";
import type { PurchaseItem, PartyItem } from "@/types";
import { isPartyActive } from "@/utils/party-utils";
import { useDebounce } from "@/hooks/useDebounce";

export interface UsePurchaseTableFilterOptions {
  purchases: PurchaseItem[];
  rawPartyData?: any;
}

/**
 * Helper to safely extract a YYYY-MM-DD date string from various purchase date formats or invoice number.
 */
export const getPurchaseDateString = (p: any): string => {
  if (!p) return "";
  const rawDate = p.purchaseDate || p.createdAt;
  if (rawDate) {
    if (typeof rawDate === "string") {
      const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    const d = moment(rawDate);
    if (d.isValid()) return d.format("YYYY-MM-DD");
  }

  const inv = String(p.invoiceNo || "");
  const dtMatch = inv.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (dtMatch) {
    return `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
  }

  return "";
};

/**
 * Standardized supplier list extraction from party list API response and actual purchase records.
 */
export const extractSuppliersList = (rawPartyData: any, purchases: PurchaseItem[] = []): PartyItem[] => {
  let list: any[] = [];
  if (rawPartyData) {
    if (Array.isArray(rawPartyData)) {
      list = rawPartyData;
    } else if (rawPartyData && typeof rawPartyData === "object") {
      const raw = rawPartyData as any;
      if (Array.isArray(raw.partyList)) list = raw.partyList;
      else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
      else if (Array.isArray(raw.supplierList)) list = raw.supplierList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }
  }

  const filtered = list.filter((p: any) => {
    if (!isPartyActive(p)) return false;
    const type = String(p.type || p.partyType || "").toUpperCase();
    return type.includes("SUPPLIER") || type.includes("VENDOR") || type.includes("BOTH") || !type;
  });

  const supMap = new Map<string, PartyItem>();
  filtered.forEach((p: any) => {
    const key = String(p.id ?? p.name ?? "").trim();
    if (key) {
      supMap.set(key, {
        id: p.id,
        partyId: p.id,
        name: p.name || "Supplier",
        partyName: p.name || "Supplier",
        phone: p.phone || "",
        partyPhone: p.phone || "",
        address: p.address || "",
        type: "SUPPLIER",
      });
    }
  });

  // Also include any supplier from actual purchases
  purchases.forEach((pur: any) => {
    const supId = pur.supplierId;
    const supName = pur.supplierName;
    const key = String(supId ?? supName ?? "").trim();
    if (key && !supMap.has(key)) {
      supMap.set(key, {
        id: supId || supName,
        partyId: supId || supName,
        name: supName || "Supplier",
        partyName: supName || "Supplier",
        phone: pur.supplierPhone || "",
        partyPhone: pur.supplierPhone || "",
        address: pur.supplierAddress || "",
        type: "SUPPLIER",
      });
    }
  });

  return Array.from(supMap.values());
};

/**
 * Enterprise standard custom hook for Purchase Table Filtering, Sorting, Pagination, and KPI Stats.
 * Shared between Purchases page (/admin/purchases) and Purchase Return Purchases tab (/admin/purchase-return/purchases).
 */
export const usePurchaseTableFilter = ({
  purchases,
  rawPartyData,
}: UsePurchaseTableFilterOptions) => {
  // Search, Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Suppliers List derived from Parties + Purchases
  const suppliersList: PartyItem[] = useMemo(() => {
    return extractSuppliersList(rawPartyData, purchases);
  }, [rawPartyData, purchases]);

  // Filtering Logic
  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase: any) => {
      // 1. Search Query
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const ord = String(purchase.orderNo || "").toLowerCase();
        const inv = String(purchase.invoiceNo || "").toLowerCase();
        const ch = String(purchase.challanNo || "").toLowerCase();
        const sName = String(purchase.supplierName || "").toLowerCase();
        const sPhone = String(purchase.supplierPhone || "").toLowerCase();
        if (
          !ord.includes(q) &&
          !inv.includes(q) &&
          !ch.includes(q) &&
          !sName.includes(q) &&
          !sPhone.includes(q)
        ) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter && statusFilter !== "all") {
        const paidAmount = Number(purchase.paidAmount ?? 0);
        const dueAmount = Number(purchase.dueAmount ?? 0);

        if (statusFilter === "COMPLETED" || statusFilter === "PAID") {
          if (dueAmount > 0) return false;
        } else if (statusFilter === "PARTIAL") {
          if (!(dueAmount > 0 && paidAmount > 0)) return false;
        } else if (statusFilter === "PENDING" || statusFilter === "DUE") {
          if (!(dueAmount > 0 && paidAmount === 0)) return false;
        }
      }

      // 3. Payment Method
      if (paymentMethodFilter && paymentMethodFilter !== "all") {
        const pMethod = String(purchase.paymentType || "CASH").toUpperCase();
        if (!pMethod.includes(paymentMethodFilter.toUpperCase())) return false;
      }

      // 4. Supplier Filter
      if (supplierFilter && supplierFilter !== "all") {
        const sId = String(purchase.supplierId ?? "");
        const sName = String(purchase.supplierName ?? "");
        const filterVal = String(supplierFilter).trim().toLowerCase();
        if (sId.toLowerCase() !== filterVal && sName.toLowerCase() !== filterVal) {
          return false;
        }
      }

      // 5. Date Filter (Custom Start/End Date Range or Presets)
      if (customStartDate || customEndDate) {
        const purchaseDateStr = getPurchaseDateString(purchase);
        if (!purchaseDateStr) return false;
        if (customStartDate && purchaseDateStr < customStartDate) return false;
        if (customEndDate && purchaseDateStr > customEndDate) return false;
      } else if (dateFilter && dateFilter !== "all") {
        const purchaseDateStr = getPurchaseDateString(purchase);
        if (!purchaseDateStr) return false;

        const todayStr = moment().format("YYYY-MM-DD");
        const tomorrowStr = moment().add(1, "day").format("YYYY-MM-DD");
        const yesterdayStr = moment().subtract(1, "day").format("YYYY-MM-DD");

        if (dateFilter === "today") {
          if (purchaseDateStr !== todayStr) return false;
        } else if (dateFilter === "tomorrow") {
          if (purchaseDateStr !== tomorrowStr) return false;
        } else if (dateFilter === "yesterday") {
          if (purchaseDateStr !== yesterdayStr) return false;
        } else if (dateFilter === "this_week" || dateFilter === "thisWeek" || dateFilter === "last7days") {
          const startOfWeek = moment().startOf("week").format("YYYY-MM-DD");
          const endOfWeek = moment().endOf("week").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfWeek || purchaseDateStr > endOfWeek) return false;
        } else if (dateFilter === "this_month" || dateFilter === "thisMonth") {
          const startOfMonth = moment().startOf("month").format("YYYY-MM-DD");
          const endOfMonth = moment().endOf("month").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfMonth || purchaseDateStr > endOfMonth) return false;
        } else if (dateFilter === "last_month" || dateFilter === "lastMonth") {
          const startOfLastMonth = moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
          const endOfLastMonth = moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfLastMonth || purchaseDateStr > endOfLastMonth) return false;
        } else if (dateFilter === "this_year" || dateFilter === "thisYear") {
          const startOfYear = moment().startOf("year").format("YYYY-MM-DD");
          const endOfYear = moment().endOf("year").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfYear || purchaseDateStr > endOfYear) return false;
        }
      }

      return true;
    });
  }, [
    purchases,
    debouncedSearch,
    statusFilter,
    paymentMethodFilter,
    supplierFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  // Sorting
  const sortedPurchases = useMemo(() => {
    switch (sortBy) {
      case "amount_high":
      case "amount_high_to_low":
        return [...filteredPurchases].sort((a: any, b: any) => {
          const amtA = Number(a.grandTotal ?? 0);
          const amtB = Number(b.grandTotal ?? 0);
          return amtB - amtA;
        });
      case "amount_low":
      case "amount_low_to_high":
        return [...filteredPurchases].sort((a: any, b: any) => {
          const amtA = Number(a.grandTotal ?? 0);
          const amtB = Number(b.grandTotal ?? 0);
          return amtA - amtB;
        });
      case "supplier_a_to_z":
        return [...filteredPurchases].sort((a: any, b: any) => {
          const nameA = String(a.supplierName || "").toLowerCase();
          const nameB = String(b.supplierName || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case "supplier_z_to_a":
        return [...filteredPurchases].sort((a: any, b: any) => {
          const nameA = String(a.supplierName || "").toLowerCase();
          const nameB = String(b.supplierName || "").toLowerCase();
          return nameB.localeCompare(nameA);
        });
      case "oldest":
        return [...filteredPurchases].sort((a: any, b: any) => {
          const dateA = a.purchaseDate || a.createdAt || "";
          const dateB = b.purchaseDate || b.createdAt || "";
          if (dateA && dateB) {
            const diff = moment(dateA).diff(moment(dateB));
            if (!isNaN(diff) && diff !== 0) return diff;
          }
          const idA = Number(a.id ?? 0);
          const idB = Number(b.id ?? 0);
          return idA - idB;
        });
      case "latest":
      default:
        return [...filteredPurchases].sort((a: any, b: any) => {
          const dateA = a.purchaseDate || a.createdAt || "";
          const dateB = b.purchaseDate || b.createdAt || "";
          if (dateA && dateB) {
            const diff = moment(dateB).diff(moment(dateA));
            if (!isNaN(diff) && diff !== 0) return diff;
          }
          const idA = Number(a.id ?? 0);
          const idB = Number(b.id ?? 0);
          return idB - idA;
        });
    }
  }, [filteredPurchases, sortBy]);

  // Aggregate stats calculations for UI Cards
  const stats = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    sortedPurchases.forEach((purchase: any) => {
      const gTotal = Number(purchase.grandTotal ?? 0);
      const paid = Number(purchase.paidAmount ?? 0);
      const due = Number(purchase.dueAmount ?? 0);

      totalAmount += gTotal;
      totalPaid += paid;
      totalDue += due;
    });

    return {
      totalCount: sortedPurchases.length,
      totalAmount,
      totalPaid,
      totalDue,
    };
  }, [sortedPurchases]);

  // Pagination calculation
  const totalCount = sortedPurchases.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / dataLimit));
  const startIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedPurchases = sortedPurchases.slice(startIndex, startIndex + dataLimit);

  const handlePagination = useCallback((paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentMethodFilter("all");
    setSupplierFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortBy("latest");
    setCurrentPageNumber(1);
  }, []);

  return {
    // Filter & search states
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    supplierFilter,
    setSupplierFilter,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    sortBy,
    setSortBy,

    // Pagination states
    currentPageNumber,
    setCurrentPageNumber,
    dataLimit,
    setDataLimit,
    pageCount,
    totalCount,

    // Processed data
    suppliersList,
    filteredPurchases,
    sortedPurchases,
    paginatedPurchases,
    stats,

    // Handlers
    handlePagination,
    handleResetFilters,
  };
};
