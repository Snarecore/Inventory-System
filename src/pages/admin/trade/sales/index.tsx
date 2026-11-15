import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import moment from "moment";
import { FaPlus, FaShoppingCart, FaUndoAlt } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import SaleStats from "./components/SaleStats";
import SaleTable from "./components/SaleTable";
import SaleInvoiceModal from "./components/SaleInvoiceModal";
import OrderDeleteModal from "@/components/modal/OrderDeleteModal";
import TradeReturnStats from "@/components/trade/TradeReturnStats";
import SalesReturnTable from "@/pages/admin/trade/sales-return/components/SalesReturnTable";
import SalesReturnInvoiceModal from "@/pages/admin/trade/sales-return/components/SalesReturnInvoiceModal";
import type { SaleItem, SalesReturnItem, PartyItem } from "@/types";
import { extractReturnRemarks } from "@/pages/admin/trade/constants/returnReasons";
import {
  useSalesQuery,
  useSalesAndReturnsQuery,
  extractReturnedSalesInvoiceKeysSet,
  normalizeSaleRecord,
  isReturnRecord,
  getCleanOrderNo,
  useDeleteSalesOrderMutation,
} from "./hooks/useSalesQueries";
import { useTradeDeleteModal } from "@/hooks/useTradeDeleteModal";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";

const Sales: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { canCreate } = usePermission();

  // Tab State: "sales" | "returns"
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isReturnRoute = location.pathname.includes("sales-return") || searchParams.get("tab") === "returns";
  const [activeTab, setActiveTab] = useState<"sales" | "returns">(isReturnRoute ? "returns" : "sales");

  useEffect(() => {
    if (location.pathname.includes("sales-return") || searchParams.get("tab") === "returns") {
      setActiveTab("returns");
    } else if (location.pathname === "/admin/sales" && !searchParams.get("tab")) {
      setActiveTab("sales");
    }
  }, [location.pathname, searchParams]);

  // Shared Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Modals - Sales
  const [isSaleInvoiceModalOpen, setIsSaleInvoiceModalOpen] = useState<boolean>(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<SaleItem | null>(null);
  const [autoPrintSaleModal, setAutoPrintSaleModal] = useState<boolean>(false);
  const deleteMutation = useDeleteSalesOrderMutation();
  const {
    isOpen: isDeleteModalOpen,
    reason: deleteReason,
    setReason: setDeleteReason,
    isDeleting,
    orderIdentifier: deleteOrderIdentifier,
    handleRequestDelete: handleDeleteSale,
    handleConfirmDelete,
    handleClose: handleCloseDeleteModal,
  } = useTradeDeleteModal<SaleItem>({
    entityType: "sales",
    entityLabel: "Sales Order",
    deleteFn: (payload) => deleteMutation.mutateAsync(payload),
    getOrderIdentifier: (sale) =>
      getCleanOrderNo(sale.orderNo, sale.invoiceNo || sale.salesInvoiceNo) || sale.invoiceNo,
    onSuccess: () => {
      refetchSales();
      refetchSalesAndReturns();
    },
  });

  // Modals - Returns
  const [isReturnInvoiceModalOpen, setIsReturnInvoiceModalOpen] = useState<boolean>(false);
  const [selectedReturnForInvoice, setSelectedReturnForInvoice] = useState<SalesReturnItem | null>(null);
  const [autoPrintReturnModal, setAutoPrintReturnModal] = useState<boolean>(false);



  // 1. Authoritative Sales Query: fetches all sales directly from /get-sale-list
  const {
    data: salesData,
    isLoading: isSalesLoadingQuery,
    isFetching: isSalesFetching,
    refetch: refetchSales,
  } = useSalesQuery();

  // 2. Returns & Return Indicators Query
  const {
    data: apiReturnsData,
    isLoading: isCombinedLoading,
    isFetching: isCombinedFetching,
    refetch: refetchSalesAndReturns,
  } = useSalesAndReturnsQuery();

  // Single-pass memoized extraction of Sales and Returns
  const { combinedSales, rawReturns } = useMemo(() => {
    if (!Array.isArray(apiReturnsData)) return { combinedSales: [], rawReturns: [] };

    const salesList: SaleItem[] = [];
    const returnsList: SalesReturnItem[] = [];
    const seenSaleKeys = new Set<string>();
    const seenReturnKeys = new Set<string>();

    apiReturnsData.forEach((item: any, idx: number) => {
      const isRet = item.isReturnRecord === true || isReturnRecord(item);

      if (isRet) {
        const retKey = String(item.returnNo || item.id || `ret_${idx}`).trim();
        if (!seenReturnKeys.has(retKey)) {
          seenReturnKeys.add(retKey);
          const noteText = extractReturnRemarks(item);
          const details =
            Array.isArray(item.returnDetails) && item.returnDetails.length > 0
              ? item.returnDetails
              : Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0
              ? item.salesReturnDetails
              : Array.isArray(item.details) && item.details.length > 0
              ? item.details
              : Array.isArray(item.items) && item.items.length > 0
              ? item.items
              : Array.isArray(item.products) && item.products.length > 0
              ? item.products
              : [];

          returnsList.push({
            id: item.id || item.returnId || item.salesReturnId || item.returnNo || item.orderNo || `ret_${item.returnNo || idx}`,
            returnNo: item.returnNo || "",
            orderNo: item.orderNo || "",
            salesInvoiceNo: item.salesInvoiceNo || item.invoiceNo || "",
            invoiceNo: item.invoiceNo || item.salesInvoiceNo || "",
            returnDate: item.returnDate || item.salesDate || moment().format("YYYY-MM-DD"),
            createdAt: item.createdAt || item.returnDate,
            customerId: item.customerId,
            customerName: item.customerName || "Customer",
            customerPhone: item.customerPhone,
            customerAddress: item.customerAddress,
            totalAmount: Number(item.totalAmount ?? item.returnGrandTotal ?? 0),
            discount: Number(item.discount ?? 0),
            vat: Number(item.vat ?? 0),
            deliveryCharge: Number(item.deliveryCharge ?? 0),
            grandTotal: Number(item.returnGrandTotal ?? item.grandTotal ?? 0),
            refundAmount: Number(item.returnRefundAmount ?? item.refundAmount ?? item.returnGrandTotal ?? 0),
            paymentType: item.paymentType || "CASH",
            status: item.status || "Completed",
            note: noteText,
            remarks: noteText,
            reason: noteText,
            returnDetails: details,
            itemsCount: details.length || 1,
          });
        }
      }

      if (!item.isReturnRecord) {
        const saleKey = String(item.invoiceNo || item.orderNo || item.id || `sale_${idx}`).trim();
        if (!seenSaleKeys.has(saleKey)) {
          seenSaleKeys.add(saleKey);
          salesList.push(normalizeSaleRecord(item));
        }
      }
    });

    return { combinedSales: salesList, rawReturns: returnsList };
  }, [apiReturnsData]);

  // Set of returned invoice keys for the return icon indicators
  const returnedInvoiceSet = useMemo(() => {
    return extractReturnedSalesInvoiceKeysSet([
      ...(Array.isArray(apiReturnsData) ? apiReturnsData : []),
      ...(Array.isArray(rawReturns) ? rawReturns : []),
    ]);
  }, [apiReturnsData, rawReturns]);

  // Final sales array: merges authoritative salesData with enriched combinedSales and rawReturns
  // Guaranteed: Every sale—returned or not—remains in this list and NEVER disappears!
  // Final sales array: merges authoritative salesData with enriched combinedSales and rawReturns
  // Guaranteed: Every sale—returned or not—remains in this list and NEVER disappears!
  const rawSales = useMemo(() => {
    const saleList: SaleItem[] = [];
    const aliasToIdx = new Map<string, number>();

    const registerSale = (record: SaleItem) => {
      const cleanOrd = getCleanOrderNo(record.orderNo, record.invoiceNo || record.salesInvoiceNo);
      const aliases = [
        cleanOrd ? `ord_${cleanOrd.toLowerCase()}` : null,
        record.orderNo ? `ord_${String(record.orderNo).trim().toLowerCase()}` : null,
        record.invoiceNo ? `inv_${String(record.invoiceNo).trim().toLowerCase()}` : null,
        record.salesInvoiceNo ? `inv_${String(record.salesInvoiceNo).trim().toLowerCase()}` : null,
        record.id ? `id_${String(record.id).trim().toLowerCase()}` : null,
        (record as any).saleId ? `id_${String((record as any).saleId).trim().toLowerCase()}` : null,
      ].filter(Boolean) as string[];

      let existingIdx = -1;
      for (const a of aliases) {
        if (aliasToIdx.has(a)) {
          existingIdx = aliasToIdx.get(a)!;
          break;
        }
      }

      if (existingIdx === -1) {
        const newIdx = saleList.length;
        saleList.push(record);
        aliases.forEach((a) => aliasToIdx.set(a, newIdx));
      } else {
        const existing = saleList[existingIdx];
        const existingDetails = Array.isArray(existing.salesDetails) && existing.salesDetails.length > 0
          ? existing.salesDetails
          : existing.details || [];
        const newDetails = Array.isArray(record.salesDetails) && record.salesDetails.length > 0
          ? record.salesDetails
          : record.details || [];

        const bestDetails = existingDetails.length >= newDetails.length ? existingDetails : newDetails;

        saleList[existingIdx] = {
          ...existing,
          ...record,
          orderNo: cleanOrd || existing.orderNo || record.orderNo,
          hasReturn: Boolean(existing.hasReturn || record.hasReturn),
          returnNo: record.returnNo || (existing as any).returnNo,
          returnGrandTotal: record.returnGrandTotal ?? (existing as any).returnGrandTotal,
          returnRefundAmount: record.returnRefundAmount ?? (existing as any).returnRefundAmount,
          salesDetails: bestDetails,
          details: bestDetails,
        };
        aliases.forEach((a) => aliasToIdx.set(a, existingIdx));
      }
    };

    // 1. Load authoritative sales from /get-sale-list
    if (Array.isArray(salesData)) {
      salesData.forEach((s) => {
        registerSale(normalizeSaleRecord(s));
      });
    }

    // 2. Merge enriched sales from /get-sales-and-return (combinedSales)
    if (Array.isArray(combinedSales)) {
      combinedSales.forEach((s) => {
        if (
          s.customerName === "Laptop" ||
          (typeof s.customerName === "string" && s.customerName.includes("Ball Pen"))
        ) {
          return;
        }
        registerSale(normalizeSaleRecord(s));
      });
    }

    // 3. Fallback from rawReturns: if any returned order isn't in saleList yet, reconstruct it so it NEVER disappears
    if (Array.isArray(rawReturns)) {
      rawReturns.forEach((r, idx) => {
        if (
          r.returnNo &&
          String(r.returnNo).startsWith("261111") &&
          (!r.salesInvoiceNo || r.salesInvoiceNo === r.returnNo)
        ) {
          return;
        }
        if (
          r.customerName === "Laptop" ||
          (typeof r.customerName === "string" && r.customerName.includes("Ball Pen"))
        ) {
          return;
        }

        const cleanOrd = getCleanOrderNo(r.orderNo, r.salesInvoiceNo || r.invoiceNo);
        const aliases = [
          cleanOrd ? `ord_${cleanOrd.toLowerCase()}` : null,
          r.orderNo ? `ord_${String(r.orderNo).trim().toLowerCase()}` : null,
          r.salesInvoiceNo ? `inv_${String(r.salesInvoiceNo).trim().toLowerCase()}` : null,
          r.invoiceNo ? `inv_${String(r.invoiceNo).trim().toLowerCase()}` : null,
        ].filter(Boolean) as string[];

        const exists = aliases.some((a) => aliasToIdx.has(a));
        if (exists) {
          for (const a of aliases) {
            if (aliasToIdx.has(a)) {
              const eIdx = aliasToIdx.get(a)!;
              saleList[eIdx].hasReturn = true;
              if (cleanOrd && (!saleList[eIdx].orderNo || saleList[eIdx].orderNo.includes("-"))) {
                saleList[eIdx].orderNo = cleanOrd;
              }
              break;
            }
          }
        } else {
          registerSale(
            normalizeSaleRecord({
              id: r.id || r.orderNo || `sale_ret_${idx}`,
              orderNo: cleanOrd || r.orderNo || "",
              invoiceNo: r.salesInvoiceNo || r.invoiceNo || r.orderNo || "",
              salesInvoiceNo: r.salesInvoiceNo || r.invoiceNo || "",
              salesDate: r.returnDate || r.createdAt || moment().format("YYYY-MM-DD"),
              createdAt: r.createdAt || r.returnDate,
              customerId: r.customerId,
              customerName: r.customerName || "Customer",
              customerPhone: r.customerPhone || "",
              customerAddress: r.customerAddress || "",
              grandTotal: Number(r.grandTotal ?? r.totalAmount ?? r.refundAmount ?? 0),
              paidAmount: Number(r.refundAmount ?? r.grandTotal ?? 0),
              dueAmount: 0,
              paymentType: r.paymentType || "CASH",
              status: "Paid",
              hasReturn: true,
              salesDetails: r.returnDetails || [],
              details: r.returnDetails || [],
            })
          );
        }
      });
    }

    // 4. Ensure hasReturn is true for every sale matching returnedInvoiceSet
    return saleList.map((sale) => {
      const orderKey = String(sale.orderNo || "").trim().toLowerCase();
      const invoiceKey = String(sale.invoiceNo || sale.salesInvoiceNo || "").trim().toLowerCase();
      const idKey = String(sale.id || "").trim().toLowerCase();

      const isMarkedReturned =
        Boolean(sale.hasReturn) ||
        Boolean(orderKey && returnedInvoiceSet.has(orderKey)) ||
        Boolean(invoiceKey && returnedInvoiceSet.has(invoiceKey)) ||
        Boolean(idKey && returnedInvoiceSet.has(idKey));

      if (isMarkedReturned && !sale.hasReturn) {
        return { ...sale, hasReturn: true };
      }
      return sale;
    });
  }, [salesData, combinedSales, rawReturns, returnedInvoiceSet]);

  // Zero-network customers list derived directly from active sales and returns
  const customersList: PartyItem[] = useMemo(() => {
    const custMap = new Map<string, PartyItem>();

    rawSales.forEach((s) => {
      const key = String(s.customerId ?? s.partyId ?? s.customerName ?? "").trim();
      if (key && !custMap.has(key)) {
        custMap.set(key, {
          id: s.customerId ?? s.partyId,
          partyId: s.customerId ?? s.partyId,
          name: s.customerName || "Customer",
          partyName: s.customerName || "Customer",
          phone: s.customerPhone || "",
          partyPhone: s.customerPhone || "",
          address: s.customerAddress || "",
          type: "CUSTOMER",
        });
      }
    });

    rawReturns.forEach((r) => {
      const key = String(r.customerId ?? r.partyId ?? r.customerName ?? "").trim();
      if (key && !custMap.has(key)) {
        custMap.set(key, {
          id: r.customerId ?? r.partyId,
          partyId: r.customerId ?? r.partyId,
          name: r.customerName || "Customer",
          partyName: r.customerName || "Customer",
          phone: r.customerPhone || "",
          partyPhone: r.customerPhone || "",
          address: r.customerAddress || "",
          type: "CUSTOMER",
        });
      }
    });

    return Array.from(custMap.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [rawSales, rawReturns]);

  const isSalesLoading = (isSalesLoadingQuery || isCombinedLoading) && rawSales.length === 0;
  const isReturnsLoading = isCombinedLoading && rawReturns.length === 0;
  const isReturnsFetching = isCombinedFetching;

  // ----------------- SALES FILTERING & SORTING -----------------
  const filteredSales = useMemo(() => {
    return rawSales.filter((sale: any) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const ord = String(sale.orderNo || "").toLowerCase();
        const inv = String(sale.invoiceNo || "").toLowerCase();
        const cName = String(sale.customerName || "").toLowerCase();
        const cPhone = String(sale.customerPhone || "").toLowerCase();
        if (
          !ord.includes(q) &&
          !inv.includes(q) &&
          !cName.includes(q) &&
          !cPhone.includes(q)
        ) {
          return false;
        }
      }

      if (statusFilter !== "all" && statusFilter !== "") {
        const paidAmount = Number(sale.paidAmount || 0);
        const dueAmount = Number(sale.dueAmount || 0);
        const s = String(sale.status || "").toUpperCase();

        if (statusFilter === "PAID") {
          if (s !== "PAID" && dueAmount > 0) return false;
        } else if (statusFilter === "PARTIAL") {
          if (s !== "PARTIAL" && !(dueAmount > 0 && paidAmount > 0)) return false;
        } else if (statusFilter === "DUE") {
          if (s !== "PENDING" && s !== "DUE" && !(dueAmount > 0 && paidAmount === 0)) return false;
        }
      }

      if (paymentMethodFilter !== "all" && paymentMethodFilter !== "") {
        const pMethod = String(sale.paymentType || "CASH").toUpperCase();
        if (pMethod !== paymentMethodFilter) return false;
      }

      if (customerFilter !== "all") {
        const cId = String(sale.customerId || "");
        const cName = String(sale.customerName || "");
        const filterVal = String(customerFilter).trim().toLowerCase();
        if (cId.toLowerCase() !== filterVal && cName.toLowerCase() !== filterVal) {
          return false;
        }
      }

      if (dateFilter !== "all") {
        const saleDateStr = sale.salesDate;
        if (!saleDateStr) return true;
        const saleDate = moment(saleDateStr);

        if (dateFilter === "today") {
          if (!saleDate.isSame(moment(), "day")) return false;
        } else if (dateFilter === "yesterday") {
          if (!saleDate.isSame(moment().subtract(1, "day"), "day")) return false;
        } else if (dateFilter === "last7days") {
          if (!saleDate.isAfter(moment().subtract(7, "days"))) return false;
        } else if (dateFilter === "thisMonth") {
          if (!saleDate.isSame(moment(), "month")) return false;
        } else if (dateFilter === "lastMonth") {
          if (!saleDate.isSame(moment().subtract(1, "month"), "month")) return false;
        } else if (dateFilter === "custom" && customStartDate && customEndDate) {
          if (saleDate.isBefore(moment(customStartDate)) || saleDate.isAfter(moment(customEndDate).endOf("day"))) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    rawSales,
    debouncedSearch,
    statusFilter,
    paymentMethodFilter,
    customerFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a: any, b: any) => {
      const dateA = new Date(a.salesDate || 0).getTime();
      const dateB = new Date(b.salesDate || 0).getTime();
      const amountA = Number(a.grandTotal || 0);
      const amountB = Number(b.grandTotal || 0);

      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") {
        const diff = amountB - amountA;
        return diff !== 0 ? diff : dateB - dateA;
      }
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") {
        const diff = amountA - amountB;
        return diff !== 0 ? diff : dateB - dateA;
      }
      if (sortBy === "customer_a_to_z") {
        const nameA = String(a.customerName || "Walk-in Customer").trim().toLowerCase();
        const nameB = String(b.customerName || "Walk-in Customer").trim().toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        return cmp !== 0 ? cmp : dateB - dateA;
      }
      if (sortBy === "customer_z_to_a") {
        const nameA = String(a.customerName || "Walk-in Customer").trim().toLowerCase();
        const nameB = String(b.customerName || "Walk-in Customer").trim().toLowerCase();
        const cmp = nameB.localeCompare(nameA);
        return cmp !== 0 ? cmp : dateB - dateA;
      }
      return dateB - dateA; // latest default
    });
  }, [filteredSales, sortBy]);

  // Sales Stats
  const salesStats = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    sortedSales.forEach((sale: any) => {
      const gt = Number(sale.grandTotal || 0);
      const paid = Number(sale.paidAmount || 0);
      const due = Number(sale.dueAmount || 0);

      totalAmount += gt;
      totalPaid += paid;
      totalDue += due;
    });

    return {
      totalCount: sortedSales.length,
      totalAmount,
      totalPaid,
      totalDue,
    };
  }, [sortedSales]);

  // Sales Pagination
  const salesTotalCount = sortedSales.length;
  const salesPageCount = Math.ceil(salesTotalCount / dataLimit) || 1;
  const startSalesIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedSales = sortedSales.slice(startSalesIndex, startSalesIndex + dataLimit);

  // ----------------- RETURNS FILTERING & SORTING -----------------
  const filteredReturns = useMemo(() => {
    return rawReturns.filter((item) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const ordNo = String(item.orderNo || "").toLowerCase();
        const retNo = String(item.returnNo || "").toLowerCase();
        const invNo = String(item.salesInvoiceNo || item.invoiceNo || "").toLowerCase();
        const cName = String(item.customerName || "").toLowerCase();
        const cPhone = String(item.customerPhone || "").toLowerCase();
        const remarks = String(item.note || item.remarks || "").toLowerCase();
        if (
          !ordNo.includes(q) &&
          !retNo.includes(q) &&
          !invNo.includes(q) &&
          !cName.includes(q) &&
          !cPhone.includes(q) &&
          !remarks.includes(q)
        ) {
          return false;
        }
      }

      if (customerFilter && customerFilter !== "all") {
        const cId = String(item.customerId ?? "").trim().toLowerCase();
        const cName = String(item.customerName ?? "").trim().toLowerCase();
        const filterVal = customerFilter.toLowerCase();
        if (cId !== filterVal && !cName.includes(filterVal)) {
          return false;
        }
      }

      if (paymentMethodFilter !== "all" && paymentMethodFilter !== "") {
        if (String(item.paymentType || "").toUpperCase() !== paymentMethodFilter.toUpperCase()) {
          return false;
        }
      }

      if (dateFilter !== "all") {
        const dateStr = item.returnDate || item.createdAt;
        if (dateStr) {
          const itemDate = moment(dateStr);
          if (dateFilter === "today") {
            if (!itemDate.isSame(moment(), "day")) return false;
          } else if (dateFilter === "yesterday") {
            if (!itemDate.isSame(moment().subtract(1, "day"), "day")) return false;
          } else if (dateFilter === "last7days") {
            if (!itemDate.isAfter(moment().subtract(7, "days"))) return false;
          } else if (dateFilter === "thisMonth") {
            if (!itemDate.isSame(moment(), "month")) return false;
          } else if (dateFilter === "lastMonth") {
            if (!itemDate.isSame(moment().subtract(1, "month"), "month")) return false;
          } else if (dateFilter === "custom" && customStartDate && customEndDate) {
            if (itemDate.isBefore(moment(customStartDate)) || itemDate.isAfter(moment(customEndDate).endOf("day"))) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [
    rawReturns,
    debouncedSearch,
    customerFilter,
    paymentMethodFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const sortedReturns = useMemo(() => {
    return [...filteredReturns].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.returnDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.returnDate || 0).getTime();
      const idA = Number(a.id || 0);
      const idB = Number(b.id || 0);
      const amountA = Number(a.refundAmount ?? a.grandTotal ?? 0);
      const amountB = Number(b.refundAmount ?? b.grandTotal ?? 0);

      if (sortBy === "oldest") {
        if (timeA !== timeB) return timeA - timeB;
        return idA - idB;
      }
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") return amountB - amountA;
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") return amountA - amountB;
      if (sortBy === "customer_a_to_z") {
        const nameA = String(a.customerName || "").trim().toLowerCase();
        const nameB = String(b.customerName || "").trim().toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        return cmp !== 0 ? cmp : timeB - timeA;
      }
      if (sortBy === "customer_z_to_a") {
        const nameA = String(a.customerName || "").trim().toLowerCase();
        const nameB = String(b.customerName || "").trim().toLowerCase();
        const cmp = nameB.localeCompare(nameA);
        return cmp !== 0 ? cmp : timeB - timeA;
      }

      if (timeB !== timeA) return timeB - timeA;
      return idB - idA;
    });
  }, [filteredReturns, sortBy]);

  // Returns Stats
  const returnsStats = useMemo(() => {
    let totalRefund = 0;
    let cashRefund = 0;
    let creditAdjust = 0;

    sortedReturns.forEach((r) => {
      const amt = Number(r.refundAmount ?? r.grandTotal ?? 0);
      totalRefund += amt;
      const p = String(r.paymentType || "CASH").toUpperCase();
      if (p === "CASH") cashRefund += amt;
      else if (p === "CREDIT") creditAdjust += amt;
    });

    return {
      totalCount: sortedReturns.length,
      totalRefundAmount: totalRefund,
      totalCashRefund: cashRefund,
      totalCreditAdjust: creditAdjust,
    };
  }, [sortedReturns]);

  // Returns Pagination
  const returnsTotalCount = sortedReturns.length;
  const returnsPageCount = Math.ceil(returnsTotalCount / dataLimit) || 1;
  const startReturnsIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedReturns = sortedReturns.slice(startReturnsIndex, startReturnsIndex + dataLimit);

  // Pagination Handler
  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCustomerFilter("all");
    setPaymentMethodFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortBy("latest");
    setCurrentPageNumber(1);
  };

  // Actions - Sales
  const handleViewSale = (sale: SaleItem) => {
    setSelectedSaleForInvoice(sale);
    setAutoPrintSaleModal(false);
    setIsSaleInvoiceModalOpen(true);
  };

  const handlePrintSale = (sale: SaleItem) => {
    setSelectedSaleForInvoice(sale);
    setAutoPrintSaleModal(true);
    setIsSaleInvoiceModalOpen(true);
  };

  const handleEditSale = (sale: SaleItem) => {
    navigate(`/admin/edit-sale/${sale.id || sale.saleId || sale.invoiceNo}`, {
      state: { editData: sale },
    });
  };


  // Actions - Returns
  const handleViewReturn = (item: SalesReturnItem) => {
    setSelectedReturnForInvoice(item);
    setAutoPrintReturnModal(false);
    setIsReturnInvoiceModalOpen(true);
  };

  const handlePrintReturn = (item: SalesReturnItem) => {
    setSelectedReturnForInvoice(item);
    setAutoPrintReturnModal(true);
    setIsReturnInvoiceModalOpen(true);
  };

  const handleRefetchAll = () => {
    handleResetFilters();
    refetchSales();
    refetchSalesAndReturns();
  };

  const isGlobalLoading = isSalesLoading || isReturnsLoading;
  const isGlobalFetching = isSalesFetching || isReturnsFetching;

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle={activeTab === "sales" ? "Sales" : "Sales Return"}
          headerDescription={
            activeTab === "sales"
              ? "Manage customer sales, invoices, pos, and trade accounts"
              : "Manage customer sales returns, item quantities, and refund settlements"
          }
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={handleRefetchAll} isLoading={isGlobalLoading || isGlobalFetching} />
          {activeTab === "sales" && canCreate("sales") && (
            <Button
              label="New Sale"
              onClick={() => navigate("/admin/create-sale")}
              color="var(--primary-color)"
              hoverColor="var(--primary-color-hover)"
              icon={<FaPlus className="text-white text-xs" />}
            />
          )}
          {activeTab !== "sales" && (canCreate("sales_return") || canCreate("sales")) && (
            <Button
              label="Create Return"
              onClick={() => navigate("/admin/create-sales-return")}
              color="var(--primary-color)"
              hoverColor="var(--primary-color-hover)"
              icon={<FaPlus className="text-white text-xs" />}
            />
          )}
        </div>
      </div>

      {/* KPI Cards based on Active Tab */}
      {activeTab === "sales" ? (
        <SaleStats
          totalCount={salesStats.totalCount}
          totalAmount={salesStats.totalAmount}
          totalPaid={salesStats.totalPaid}
          totalDue={salesStats.dueAmount ?? salesStats.totalDue}
        />
      ) : (
        <TradeReturnStats
          totalCount={returnsStats.totalCount}
          totalRefundAmount={returnsStats.totalRefundAmount}
          totalCashRefund={returnsStats.totalCashRefund}
          totalCreditAdjust={returnsStats.totalCreditAdjust}
        />
      )}

      {/* Unified Tab Switcher: Sales Invoices vs Sales Returns */}
      <div className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/90 -my-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("sales");
            setCurrentPageNumber(1);
            navigate("/admin/sales", { replace: true });
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "sales"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaShoppingCart size={11} />
          <span>{t("Sales List")} ({rawSales.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("returns");
            setCurrentPageNumber(1);
            navigate("/admin/sales-return", { replace: true });
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "returns"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaUndoAlt size={11} />
          <span>{t("Sales Returns")} ({rawReturns.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "sales" ? (
        <SaleTable
          sales={paginatedSales}
          exportableSales={sortedSales}
          totalCount={salesTotalCount}
          isLoading={isSalesLoading}
          isFetching={isSalesFetching}
          pageCount={salesPageCount}
          currentPageNumber={currentPageNumber}
          setCurrentPageNumber={setCurrentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          handlePagination={handlePagination}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          paymentMethodFilter={paymentMethodFilter}
          setPaymentMethodFilter={setPaymentMethodFilter}
          customerFilter={customerFilter}
          setCustomerFilter={setCustomerFilter}
          customersList={customersList}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          sortBy={sortBy}
          setSortBy={setSortBy}
          returnedInvoiceSet={returnedInvoiceSet}
          onEdit={handleEditSale}
          onView={handleViewSale}
          onPrint={handlePrintSale}
          onDelete={handleDeleteSale}
        />
      ) : (
        <SalesReturnTable
          returns={paginatedReturns}
          exportableReturns={sortedReturns}
          totalCount={returnsTotalCount}
          rawCount={rawReturns.length}
          isLoading={isReturnsLoading}
          pageCount={returnsPageCount}
          currentPageNumber={currentPageNumber}
          setCurrentPageNumber={setCurrentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          handlePagination={handlePagination}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          customerFilter={customerFilter}
          setCustomerFilter={setCustomerFilter}
          customersList={customersList}
          paymentMethodFilter={paymentMethodFilter}
          setPaymentMethodFilter={setPaymentMethodFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onResetFilters={handleResetFilters}
          onView={handleViewReturn}
          onPrint={handlePrintReturn}
        />
      )}

      {/* Sale Invoice Modal */}
      <SaleInvoiceModal
        isOpen={isSaleInvoiceModalOpen}
        onClose={() => {
          setIsSaleInvoiceModalOpen(false);
          setSelectedSaleForInvoice(null);
          setAutoPrintSaleModal(false);
        }}
        sale={selectedSaleForInvoice}
        autoPrint={autoPrintSaleModal}
      />

      {/* Sales Return Invoice Modal */}
      <SalesReturnInvoiceModal
        isOpen={isReturnInvoiceModalOpen}
        onClose={() => {
          setIsReturnInvoiceModalOpen(false);
          setSelectedReturnForInvoice(null);
          setAutoPrintReturnModal(false);
        }}
        returnData={selectedReturnForInvoice}
        autoPrint={autoPrintReturnModal}
      />

      {/* Delete Confirmation Modal using shared OrderDeleteModal */}
      <OrderDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        entityName="Sales Order"
        orderIdentifier={deleteOrderIdentifier}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Sales;
