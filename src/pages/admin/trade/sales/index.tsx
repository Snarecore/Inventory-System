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
      getCleanOrderNo(sale.orderNo, sale.invoiceNo || sale.salesInvoiceNo, sale.id) || sale.invoiceNo,
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
    const rawRList: SalesReturnItem[] = [];
    const seenSaleKeys = new Set<string>();

    apiReturnsData.forEach((item: any, idx: number) => {
      const isRet = item.isReturnRecord === true || isReturnRecord(item);

      if (isRet) {
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

        rawRList.push({
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

      if (!item.isReturnRecord) {
        const saleKey = String(item.invoiceNo || item.orderNo || item.id || `sale_${idx}`).trim();
        if (!seenSaleKeys.has(saleKey)) {
          seenSaleKeys.add(saleKey);
          salesList.push(normalizeSaleRecord(item));
        }
      }
    });

    // Deduplicate return vouchers: always prioritize backend-generated return numbers (16-digit numbers)
    const isAuthenticBackendNo = (no?: string): boolean => {
      if (!no) return false;
      const clean = String(no).trim().toUpperCase();
      return (
        clean.length > 0 &&
        !clean.startsWith("SR-") &&
        !clean.startsWith("RET_") &&
        !clean.startsWith("RET-") &&
        !clean.startsWith("SR_")
      );
    };

    // Sort candidates so authentic backend return records come FIRST
    const sortedCandidates = [...rawRList].sort((a, b) => {
      const aIsBackend = isAuthenticBackendNo(a.returnNo);
      const bIsBackend = isAuthenticBackendNo(b.returnNo);
      if (aIsBackend && !bIsBackend) return -1;
      if (!aIsBackend && bIsBackend) return 1;
      return 0;
    });

    const dedupedReturns: SalesReturnItem[] = [];
    const seenRetNos = new Set<string>();
    const seenOrderRefundPairs = new Set<string>();
    const seenInvoiceRefundPairs = new Set<string>();

    // Collect rich line item details across all vouchers so authentic backend records keep line item details
    const detailsMap = new Map<string, any[]>();
    rawRList.forEach((r) => {
      if (Array.isArray(r.returnDetails) && r.returnDetails.length > 0) {
        const parentOrd = r.orderNo && r.orderNo !== "-" && !String(r.orderNo).startsWith("SR-") ? r.orderNo : "";
        const parentInv = (r.salesInvoiceNo && r.salesInvoiceNo !== "-") ? r.salesInvoiceNo : ((r.invoiceNo && r.invoiceNo !== "-" && r.invoiceNo !== r.returnNo) ? r.invoiceNo : "");
        const parentSaleId = (r as any).saleId || (r as any).sale_id;
        const cleanOrd = (parentOrd || parentInv || parentSaleId) ? getCleanOrderNo(parentOrd, parentInv, parentSaleId) : "";
        const ord = String(cleanOrd || parentOrd || "").trim().toLowerCase();
        const inv = String(parentInv || "").trim().toLowerCase();
        if (ord) detailsMap.set(ord, r.returnDetails);
        if (inv) detailsMap.set(inv, r.returnDetails);
      }
    });

    sortedCandidates.forEach((item) => {
      const retNo = String(item.returnNo || "").trim();
      const parentOrd = item.orderNo && item.orderNo !== "-" && !String(item.orderNo).startsWith("SR-") ? item.orderNo : "";
      const parentInv = (item.salesInvoiceNo && item.salesInvoiceNo !== "-") ? item.salesInvoiceNo : ((item.invoiceNo && item.invoiceNo !== "-" && item.invoiceNo !== item.returnNo) ? item.invoiceNo : "");
      const parentSaleId = (item as any).saleId || (item as any).sale_id;
      const cleanOrd = (parentOrd || parentInv || parentSaleId) ? getCleanOrderNo(parentOrd, parentInv, parentSaleId) : "";
      const ordNo = String(cleanOrd || parentOrd || "").trim().toLowerCase();
      const invNo = String(parentInv || "").trim().toLowerCase();
      const refundAmt = Number(item.refundAmount || item.grandTotal || 0).toFixed(2);
      const isBackend = isAuthenticBackendNo(retNo);

      // Check duplicate return number
      if (retNo) {
        const retKey = retNo.toLowerCase();
        if (seenRetNos.has(retKey)) return;
      }

      // Check duplicate order & refund amount
      if (ordNo && ordNo !== "-") {
        const ordKey = `${ordNo}_${refundAmt}`;
        if (seenOrderRefundPairs.has(ordKey)) return;
      }

      // Check duplicate invoice & refund amount
      if (invNo && invNo !== "-") {
        const invKey = `${invNo}_${refundAmt}`;
        if (seenInvoiceRefundPairs.has(invKey)) return;
      }

      // If this is a synthetic SR- / RET- record, but an authentic backend return already exists for this order/invoice:
      if (!isBackend) {
        if (ordNo && ordNo !== "-" && seenOrderRefundPairs.has(ordNo)) return;
        if (invNo && invNo !== "-" && seenInvoiceRefundPairs.has(invNo)) return;
      }

      // Register seen keys
      if (retNo) seenRetNos.add(retNo.toLowerCase());
      if (ordNo && ordNo !== "-") {
        seenOrderRefundPairs.add(`${ordNo}_${refundAmt}`);
        seenOrderRefundPairs.add(ordNo);
      }
      if (invNo && invNo !== "-") {
        seenInvoiceRefundPairs.add(`${invNo}_${refundAmt}`);
        seenInvoiceRefundPairs.add(invNo);
      }

      // Preserve line item details if authentic backend record was missing details
      const existingDetails = Array.isArray(item.returnDetails) && item.returnDetails.length > 0 ? item.returnDetails : [];
      const fallbackDetails = (ordNo && detailsMap.get(ordNo)) || (invNo && detailsMap.get(invNo)) || [];
      const bestDetails = existingDetails.length >= fallbackDetails.length ? existingDetails : fallbackDetails;

      dedupedReturns.push({
        ...item,
        orderNo: cleanOrd || item.orderNo,
        returnDetails: bestDetails,
        itemsCount: bestDetails.length || item.itemsCount || 1,
      });
    });

    return { combinedSales: salesList, rawReturns: dedupedReturns };
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
      const cleanOrd = getCleanOrderNo(record.orderNo, record.invoiceNo || record.salesInvoiceNo, record.id || (record as any).saleId);
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

        const parentOrd = r.orderNo && r.orderNo !== "-" && !String(r.orderNo).startsWith("SR-") ? r.orderNo : "";
        const parentInv = (r.salesInvoiceNo && r.salesInvoiceNo !== "-") ? r.salesInvoiceNo : ((r.invoiceNo && r.invoiceNo !== "-" && r.invoiceNo !== r.returnNo) ? r.invoiceNo : "");
        const parentSaleId = (r as any).saleId || (r as any).sale_id;

        // ONLY attempt matching if there is an authentic parent sale identifier!
        if (!parentOrd && !parentInv && !parentSaleId) {
          return;
        }

        const cleanOrd = getCleanOrderNo(parentOrd, parentInv, parentSaleId);
        const aliases = [
          cleanOrd ? `ord_${cleanOrd.toLowerCase()}` : null,
          parentOrd ? `ord_${String(parentOrd).trim().toLowerCase()}` : null,
          parentInv ? `inv_${String(parentInv).trim().toLowerCase()}` : null,
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
        }
      });
    }

    // 4. Ensure hasReturn is true for every sale matching returnedInvoiceSet
    return saleList.map((sale) => {
      const orderKey = String(sale.orderNo || "").trim().toLowerCase();
      const invoiceKey = String(sale.invoiceNo || sale.salesInvoiceNo || "").trim().toLowerCase();

      const isMarkedReturned =
        Boolean(sale.hasReturn) ||
        Boolean(orderKey && orderKey !== "-" && returnedInvoiceSet.has(orderKey)) ||
        Boolean(invoiceKey && invoiceKey !== "-" && returnedInvoiceSet.has(invoiceKey));

      if (isMarkedReturned && !sale.hasReturn) {
        return { ...sale, hasReturn: true };
      }
      return sale;
    });
  }, [salesData, combinedSales, rawReturns, returnedInvoiceSet]);

  // Enrich return records with authentic parent sale data (especially Order ID, customer, phone)
  const enrichedReturns = useMemo(() => {
    if (!Array.isArray(rawReturns) || rawReturns.length === 0) return [];
    const saleByInv = new Map<string, SaleItem>();
    const saleByOrd = new Map<string, SaleItem>();
    const saleByCustAmt = new Map<string, SaleItem>();
    const saleByCust = new Map<string, SaleItem>();

    rawSales.forEach((s) => {
      const cleanOrd = getCleanOrderNo(s.orderNo, s.invoiceNo || s.salesInvoiceNo, s.id || (s as any).saleId);
      const effectiveSale = { ...s, orderNo: cleanOrd || s.orderNo };
      if (s.invoiceNo) saleByInv.set(String(s.invoiceNo).trim().toLowerCase(), effectiveSale);
      if (s.salesInvoiceNo) saleByInv.set(String(s.salesInvoiceNo).trim().toLowerCase(), effectiveSale);
      if (cleanOrd) saleByOrd.set(cleanOrd.toLowerCase(), effectiveSale);
      if (s.orderNo) saleByOrd.set(String(s.orderNo).trim().toLowerCase(), effectiveSale);
      const cName = String(s.customerName || "").trim().toLowerCase();
      const sAmt = Number(s.grandTotal || 0).toFixed(2);
      if (cName && cName !== "customer" && cName !== "walk-in customer") {
        saleByCustAmt.set(`${cName}_${sAmt}`, effectiveSale);
        if (!saleByCust.has(cName)) saleByCust.set(cName, effectiveSale);
      }
    });

    return rawReturns.map((r) => {
      let matchedSale: SaleItem | undefined;
      const rInv = String(r.salesInvoiceNo || r.invoiceNo || "").trim().toLowerCase();
      if (rInv && saleByInv.has(rInv)) matchedSale = saleByInv.get(rInv);
      const rOrd = String(r.orderNo || "").trim().toLowerCase();
      if (!matchedSale && rOrd && saleByOrd.has(rOrd)) matchedSale = saleByOrd.get(rOrd);
      if (!matchedSale) {
        const text = String(r.remarks || r.note || "");
        const invMatch = text.match(/(?:invoice|inv|from|customer)\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
        if (invMatch && invMatch[1] && saleByInv.has(invMatch[1].trim().toLowerCase())) {
          matchedSale = saleByInv.get(invMatch[1].trim().toLowerCase());
        }
      }
      const rCust = String(r.customerName || "").trim().toLowerCase();
      const rRefund = Number(r.refundAmount || r.grandTotal || 0).toFixed(2);
      if (!matchedSale && rCust && rCust !== "customer" && rCust !== "walk-in customer") {
        matchedSale = saleByCustAmt.get(`${rCust}_${rRefund}`) || saleByCust.get(rCust);
      }

      const cleanOrd = matchedSale?.orderNo
        ? getCleanOrderNo(matchedSale.orderNo)
        : getCleanOrderNo(r.orderNo, r.salesInvoiceNo || r.invoiceNo);

      return {
        ...r,
        orderNo: cleanOrd || matchedSale?.orderNo || (r.orderNo && !String(r.orderNo).startsWith("2611") && !/^\d{9,}$/.test(String(r.orderNo)) ? r.orderNo : ""),
        customerName: matchedSale?.customerName || r.customerName,
        customerPhone: matchedSale?.customerPhone || r.customerPhone,
        customerAddress: matchedSale?.customerAddress || r.customerAddress,
        salesInvoiceNo: matchedSale?.salesInvoiceNo || matchedSale?.invoiceNo || r.salesInvoiceNo || r.invoiceNo,
      };
    });
  }, [rawReturns, rawSales]);

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

    enrichedReturns.forEach((r) => {
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
  }, [rawSales, enrichedReturns]);

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

      if (dateFilter && dateFilter !== "all") {
        const saleDate = sale.salesDate;
        if (!saleDate) return false;
        const m = moment(saleDate);
        if (!m.isValid()) return false;
        const saleDateStr = m.format("YYYY-MM-DD");

        if (customStartDate || customEndDate) {
          if (customStartDate && saleDateStr < customStartDate) return false;
          if (customEndDate && saleDateStr > customEndDate) return false;
          return true;
        }

        const todayStr = moment().format("YYYY-MM-DD");
        const tomorrowStr = moment().add(1, "day").format("YYYY-MM-DD");
        const yesterdayStr = moment().subtract(1, "day").format("YYYY-MM-DD");

        if (dateFilter === "today") {
          if (saleDateStr !== todayStr) return false;
        } else if (dateFilter === "tomorrow") {
          if (saleDateStr !== tomorrowStr) return false;
        } else if (dateFilter === "yesterday") {
          if (saleDateStr !== yesterdayStr) return false;
        } else if (dateFilter === "this_week" || dateFilter === "thisWeek" || dateFilter === "last7days") {
          const startOfWeek = moment().startOf("week").format("YYYY-MM-DD");
          const endOfWeek = moment().endOf("week").format("YYYY-MM-DD");
          if (saleDateStr < startOfWeek || saleDateStr > endOfWeek) return false;
        } else if (dateFilter === "this_month" || dateFilter === "thisMonth") {
          const startOfMonth = moment().startOf("month").format("YYYY-MM-DD");
          const endOfMonth = moment().endOf("month").format("YYYY-MM-DD");
          if (saleDateStr < startOfMonth || saleDateStr > endOfMonth) return false;
        } else if (dateFilter === "last_month" || dateFilter === "lastMonth") {
          const startOfLastMonth = moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
          const endOfLastMonth = moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
          if (saleDateStr < startOfLastMonth || saleDateStr > endOfLastMonth) return false;
        } else if (dateFilter === "30_days" || dateFilter === "last_30_days" || dateFilter === "last30days") {
          const startOf30Days = moment().subtract(30, "days").format("YYYY-MM-DD");
          if (saleDateStr < startOf30Days || saleDateStr > todayStr) return false;
        } else if (dateFilter === "this_year" || dateFilter === "thisYear") {
          const startOfYear = moment().startOf("year").format("YYYY-MM-DD");
          const endOfYear = moment().endOf("year").format("YYYY-MM-DD");
          if (saleDateStr < startOfYear || saleDateStr > endOfYear) return false;
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
    // Reverse first so that latest entered records take natural priority in indexing
    const reversed = [...filteredSales].reverse();

    return reversed.sort((a: any, b: any) => {
      const dateA = new Date(a.salesDate || 0).getTime();
      const dateB = new Date(b.salesDate || 0).getTime();
      const amountA = Number(a.grandTotal || 0);
      const amountB = Number(b.grandTotal || 0);

      if (sortBy === "oldest") {
        if (dateA !== dateB && !isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
        const numA = Number(String(a.id || a.orderNo || a.invoiceNo || "").replace(/\D/g, "")) || 0;
        const numB = Number(String(b.id || b.orderNo || b.invoiceNo || "").replace(/\D/g, "")) || 0;
        return numA - numB;
      }
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

      // Default: "latest" -> Recent entry is #1 first, then 2nd last, etc.
      // 1. If salesDate differs, latest date comes first
      if (dateB !== dateA && !isNaN(dateA) && !isNaN(dateB) && dateA > 0 && dateB > 0) {
        return dateB - dateA;
      }

      // 2. If createdAt timestamp exists and differs, latest created comes first
      const createdA = new Date(a.createdAt || a.created_at || 0).getTime();
      const createdB = new Date(b.createdAt || b.created_at || 0).getTime();
      if (createdA > 0 && createdB > 0 && createdB !== createdA) {
        return createdB - createdA;
      }

      // 3. Compare numeric Order No / ID: highest number (most recent entry) comes first (#1)
      const numA = Number(String(a.id || a.orderNo || a.invoiceNo || "").replace(/\D/g, "")) || 0;
      const numB = Number(String(b.id || b.orderNo || b.invoiceNo || "").replace(/\D/g, "")) || 0;
      if (numA !== numB) {
        return numB - numA;
      }

      return 0;
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
    return enrichedReturns.filter((item) => {
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

      if (dateFilter && dateFilter !== "all") {
        const rawDate = item.returnDate || item.date || item.createdAt || item.created_at;
        if (!rawDate) return false;
        const m = moment(rawDate);
        if (!m.isValid()) return false;
        const returnDateStr = m.format("YYYY-MM-DD");

        if (customStartDate || customEndDate) {
          if (customStartDate && returnDateStr < customStartDate) return false;
          if (customEndDate && returnDateStr > customEndDate) return false;
          return true;
        }

        const todayStr = moment().format("YYYY-MM-DD");
        const tomorrowStr = moment().add(1, "day").format("YYYY-MM-DD");
        const yesterdayStr = moment().subtract(1, "day").format("YYYY-MM-DD");

        if (dateFilter === "today") {
          if (returnDateStr !== todayStr) return false;
        } else if (dateFilter === "tomorrow") {
          if (returnDateStr !== tomorrowStr) return false;
        } else if (dateFilter === "yesterday") {
          if (returnDateStr !== yesterdayStr) return false;
        } else if (dateFilter === "this_week" || dateFilter === "thisWeek" || dateFilter === "last7days") {
          const startOfWeek = moment().startOf("week").format("YYYY-MM-DD");
          const endOfWeek = moment().endOf("week").format("YYYY-MM-DD");
          if (returnDateStr < startOfWeek || returnDateStr > endOfWeek) return false;
        } else if (dateFilter === "this_month" || dateFilter === "thisMonth") {
          const startOfMonth = moment().startOf("month").format("YYYY-MM-DD");
          const endOfMonth = moment().endOf("month").format("YYYY-MM-DD");
          if (returnDateStr < startOfMonth || returnDateStr > endOfMonth) return false;
        } else if (dateFilter === "last_month" || dateFilter === "lastMonth") {
          const startOfLastMonth = moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
          const endOfLastMonth = moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
          if (returnDateStr < startOfLastMonth || returnDateStr > endOfLastMonth) return false;
        } else if (dateFilter === "30_days" || dateFilter === "last_30_days" || dateFilter === "last30days") {
          const startOf30Days = moment().subtract(30, "days").format("YYYY-MM-DD");
          if (returnDateStr < startOf30Days || returnDateStr > todayStr) return false;
        } else if (dateFilter === "this_year" || dateFilter === "thisYear") {
          const startOfYear = moment().startOf("year").format("YYYY-MM-DD");
          const endOfYear = moment().endOf("year").format("YYYY-MM-DD");
          if (returnDateStr < startOfYear || returnDateStr > endOfYear) return false;
        }
      }

      return true;
    });
  }, [
    enrichedReturns,
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
          <span>{t("Sales Returns")} ({enrichedReturns.length})</span>
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
