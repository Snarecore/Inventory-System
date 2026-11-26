import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import moment from "moment";
import { FaPlus, FaShoppingBag, FaUndoAlt, FaSlidersH } from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import PurchaseStats from "./components/PurchaseStats";
import PurchaseTable from "./components/PurchaseTable";
import PurchaseInvoiceModal from "./components/PurchaseInvoiceModal";
import ChallanSettingsModal from "./components/ChallanSettingsModal";
import OrderDeleteModal from "@/components/modal/OrderDeleteModal";
import TradeReturnStats from "@/components/trade/TradeReturnStats";
import PurchaseReturnTable from "@/pages/admin/trade/purchase-return/components/PurchaseReturnTable";
import PurchaseReturnInvoiceModal from "@/pages/admin/trade/purchase-return/components/PurchaseReturnInvoiceModal";
import type { PurchaseItem, PurchaseReturnItem, PartyItem } from "@/types";
import { extractPurchaseReturnRemarks } from "@/pages/admin/trade/constants/returnReasons";
import {
  usePurchasesQuery,
  usePurchaseAndReturnsQuery,
  extractReturnedPurchaseKeysSet,
  normalizePurchaseRecord,
  isPurchaseReturnRecord,
  useDeletePurchaseOrderMutation,
} from "./hooks/usePurchaseQueries";
import { useTradeDeleteModal } from "@/hooks/useTradeDeleteModal";
import {
  getCleanOrderNo,
  getReturnSortTimestamp,
} from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { showErrorToast } from "@/utils/toast-utils";

const Purchases: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canCreate } = usePermission();

  // Tab State: "purchases" | "returns"
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isReturnRoute = location.pathname.includes("purchase-return") || searchParams.get("tab") === "returns";
  const [activeTab, setActiveTab] = useState<"purchases" | "returns">(isReturnRoute ? "returns" : "purchases");

  useEffect(() => {
    if (location.pathname.includes("purchase-return") || searchParams.get("tab") === "returns") {
      setActiveTab("returns");
    } else if (location.pathname === "/admin/purchases" && !searchParams.get("tab")) {
      setActiveTab("purchases");
    }
  }, [location.pathname, searchParams]);

  // Shared Search & Filters
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

  // Modals - Purchases
  const [isPurchaseInvoiceModalOpen, setIsPurchaseInvoiceModalOpen] = useState<boolean>(false);
  const [selectedPurchaseForInvoice, setSelectedPurchaseForInvoice] = useState<PurchaseItem | null>(null);
  const [isChallanSettingsOpen, setIsChallanSettingsOpen] = useState<boolean>(false);
  const deleteMutation = useDeletePurchaseOrderMutation();
  const {
    isOpen: isDeleteModalOpen,
    reason: deleteReason,
    setReason: setDeleteReason,
    isDeleting,
    orderIdentifier: deleteOrderIdentifier,
    handleRequestDelete: handleDeletePurchase,
    handleConfirmDelete,
    handleClose: handleCloseDeleteModal,
  } = useTradeDeleteModal<PurchaseItem>({
    entityType: "purchase",
    entityLabel: "Purchase Order",
    deleteFn: (payload) => deleteMutation.mutateAsync(payload),
    getOrderIdentifier: (purchase) =>
      getCleanOrderNo(purchase.orderNo, purchase.invoiceNo || purchase.purchaseInvoiceNo, purchase.id) || purchase.invoiceNo,
    onSuccess: () => {
      refetchPurchases();
      refetchCombined();
    },
  });

  // Modals - Returns
  const [isReturnInvoiceModalOpen, setIsReturnInvoiceModalOpen] = useState<boolean>(false);
  const [selectedReturnForInvoice, setSelectedReturnForInvoice] = useState<PurchaseReturnItem | null>(null);
  const [autoPrintReturnModal, setAutoPrintReturnModal] = useState<boolean>(false);


  // 1. Authoritative Purchases Query
  const {
    data: purchasesData,
    isLoading: isPurchasesLoadingQuery,
    isFetching: isPurchasesFetching,
    refetch: refetchPurchases,
  } = usePurchasesQuery();

  // 2. Returns & Return Indicators Query
  const {
    data: combinedData,
    isLoading: isCombinedLoading,
    isFetching: isCombinedFetching,
    refetch: refetchCombined,
  } = usePurchaseAndReturnsQuery();

  // Single-pass memoized extraction of Purchases and Returns
  const { combinedPurchases, rawReturns } = useMemo(() => {
    const pList: PurchaseItem[] = [];
    const rawRList: PurchaseReturnItem[] = [];

    if (Array.isArray(combinedData)) {
      combinedData.forEach((item: any, idx: number) => {
        const isRet = Boolean(item.isReturnRecord) || isPurchaseReturnRecord(item);

        if (isRet) {
          const noteText = extractPurchaseReturnRemarks(item);
          const details =
            Array.isArray(item.returnDetails) && item.returnDetails.length > 0
              ? item.returnDetails
              : Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0
              ? item.purchaseReturnDetails
              : Array.isArray(item.details) && item.details.length > 0
              ? item.details
              : Array.isArray(item.items) && item.items.length > 0
              ? item.items
              : Array.isArray(item.products) && item.products.length > 0
              ? item.products
              : [];

          rawRList.push({
            id: item.id || item.returnId || item.purchaseReturnId || item.returnNo || item.orderNo || `ret_${item.returnNo || idx}`,
            returnNo: item.returnNo || "",
            orderNo: item.orderNo || "",
            purchaseInvoiceNo: item.purchaseInvoiceNo || item.invoiceNo || "",
            invoiceNo: item.invoiceNo || item.purchaseInvoiceNo || "",
            challanNo: item.challanNo || "",
            returnDate: item.returnDate || item.purchaseDate || moment().format("YYYY-MM-DD"),
            createdAt: item.createdAt || item.returnDate,
            supplierId: item.supplierId || item.partyId,
            supplierName: item.supplierName || item.partyName || "Supplier",
            supplierPhone: item.supplierPhone || item.phone,
            supplierAddress: item.supplierAddress || item.address,
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
            cashReceived: Number(item.cashReceived ?? 0),
            cardReceived: Number(item.cardReceived ?? 0),
            mfsReceived: Number(item.mfsReceived ?? 0),
            dueAmount: Number(item.dueAmount ?? 0),
            bankName: item.bankName,
            mfsName: item.mfsName,
            returnDetails: details,
            itemsCount: details.length || 1,
          });
        }

        // Purchases must NEVER be excluded, even if a return was made against them
        const isPur = Boolean(item.invoiceNo) || Boolean(item.purchaseInvoiceNo) || (item.orderNo && !item.returnNo);
        if (isPur && !item.isReturnRecord) {
          pList.push(normalizePurchaseRecord(item));
        }
      });
    }

    // Deduplicate return vouchers: always prioritize backend-generated return numbers (16-digit numbers)
    const isAuthenticBackendNo = (no?: string): boolean => {
      if (!no) return false;
      const clean = String(no).trim().toUpperCase();
      return (
        clean.length > 0 &&
        !clean.startsWith("PR-") &&
        !clean.startsWith("RET_") &&
        !clean.startsWith("RET-") &&
        !clean.startsWith("PR_")
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

    const dedupedReturns: PurchaseReturnItem[] = [];
    const seenRetNos = new Set<string>();
    const seenOrderRefundPairs = new Set<string>();
    const seenInvoiceRefundPairs = new Set<string>();

    // Collect rich line item details across all vouchers so authentic backend records keep line item details
    const detailsMap = new Map<string, any[]>();
    rawRList.forEach((r) => {
      if (Array.isArray(r.returnDetails) && r.returnDetails.length > 0) {
        const parentOrd = r.orderNo && r.orderNo !== "-" && !String(r.orderNo).startsWith("PR-") ? r.orderNo : "";
        const parentInv = (r.purchaseInvoiceNo && r.purchaseInvoiceNo !== "-") ? r.purchaseInvoiceNo : ((r.invoiceNo && r.invoiceNo !== "-" && r.invoiceNo !== r.returnNo) ? r.invoiceNo : "");
        const parentPurId = (r as any).purchaseId || (r as any).purchase_id;
        const cleanOrd = (parentOrd || parentInv || parentPurId) ? getCleanOrderNo(parentOrd, parentInv, parentPurId) : "";
        const ord = String(cleanOrd || parentOrd || "").trim().toLowerCase();
        const inv = String(parentInv || "").trim().toLowerCase();
        if (ord) detailsMap.set(ord, r.returnDetails);
        if (inv) detailsMap.set(inv, r.returnDetails);
      }
    });

    sortedCandidates.forEach((item) => {
      const retNo = String(item.returnNo || "").trim();
      const parentOrd = item.orderNo && item.orderNo !== "-" && !String(item.orderNo).startsWith("PR-") ? item.orderNo : "";
      const parentInv = (item.purchaseInvoiceNo && item.purchaseInvoiceNo !== "-") ? item.purchaseInvoiceNo : ((item.invoiceNo && item.invoiceNo !== "-" && item.invoiceNo !== item.returnNo) ? item.invoiceNo : "");
      const parentPurId = (item as any).purchaseId || (item as any).purchase_id;
      const cleanOrd = (parentOrd || parentInv || parentPurId) ? getCleanOrderNo(parentOrd, parentInv, parentPurId) : "";
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

      // If this is a synthetic PR- record, but an authentic backend return already exists for this order/invoice:
      if (!isBackend) {
        if (ordNo && ordNo !== "-" && seenOrderRefundPairs.has(ordNo)) return;
        if (invNo && invNo !== "-" && seenInvoiceRefundPairs.has(invNo)) return;
      }

      // Register seen keys
      if (retNo) seenRetNos.add(retNo.toLowerCase());
      if (ordNo && ordNo !== "-") {
        seenOrderRefundPairs.add(`${ordNo}_${refundAmt}`);
        if (isBackend) seenOrderRefundPairs.add(ordNo);
      }
      if (invNo && invNo !== "-") {
        seenInvoiceRefundPairs.add(`${invNo}_${refundAmt}`);
        if (isBackend) seenInvoiceRefundPairs.add(invNo);
      }

      // Ensure line details are retained
      if (!Array.isArray(item.returnDetails) || item.returnDetails.length === 0) {
        const matched = detailsMap.get(ordNo) || detailsMap.get(invNo);
        if (matched && matched.length > 0) {
          item.returnDetails = matched;
          item.itemsCount = matched.length;
        }
      }

      dedupedReturns.push(item);
    });

    return { combinedPurchases: pList, rawReturns: dedupedReturns };
  }, [combinedData]);

  // Set of returned invoice keys for the return icon indicators
  const returnedInvoiceSet = useMemo(() => {
    return extractReturnedPurchaseKeysSet(combinedData || []);
  }, [combinedData]);

  // Unified single-array deduplication for Purchases guaranteeing zero duplicates
  const rawPurchases = useMemo(() => {
    const purchaseList: PurchaseItem[] = [];
    const aliasToIdx = new Map<string, number>();

    const registerPurchase = (p: PurchaseItem) => {
      if (!p) return;
      const cleanOrd = getCleanOrderNo(p.orderNo, p.invoiceNo || (p as any).purchaseInvoiceNo, p.id || (p as any).purchaseId);
      const isBusinessCode = String(p.id).trim() === "28488" || String(p.orderNo).trim() === "28488";
      const cleanKey = (val: unknown): string =>
        String(val || "")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();

      const aliases = [
        cleanOrd ? `ord_${cleanOrd.toLowerCase()}` : null,
        p.orderNo && !isBusinessCode ? `ord_${String(p.orderNo).trim().toLowerCase()}` : null,
        p.invoiceNo ? `inv_${String(p.invoiceNo).trim().toLowerCase()}` : null,
        (p as any).purchaseInvoiceNo ? `inv_${String((p as any).purchaseInvoiceNo).trim().toLowerCase()}` : null,
        p.challanNo ? `chn_${String(p.challanNo).trim().toLowerCase()}` : null,
        p.id && !isBusinessCode ? `id_${String(p.id).trim().toLowerCase()}` : null,
      ].filter(Boolean) as string[];

      let existingIdx = -1;
      for (const a of aliases) {
        if (aliasToIdx.has(a)) {
          const candidateIdx = aliasToIdx.get(a)!;
          const candidate = purchaseList[candidateIdx];
          const candInv = candidate?.purchaseInvoiceNo || candidate?.invoiceNo;
          const itemInv = p?.purchaseInvoiceNo || p?.invoiceNo;
          if (candInv && itemInv && cleanKey(candInv) !== cleanKey(itemInv)) {
            // Distinct invoices must NEVER overwrite each other
            continue;
          }
          existingIdx = candidateIdx;
          break;
        }
      }

      if (existingIdx === -1) {
        const newIdx = purchaseList.length;
        purchaseList.push(p);
        aliases.forEach((a) => aliasToIdx.set(a, newIdx));
      } else {
        const existing = purchaseList[existingIdx];
        const existingDetails = Array.isArray(existing.purchaseDetails) && existing.purchaseDetails.length > 0
          ? existing.purchaseDetails
          : existing.details || [];
        const newDetails = Array.isArray(p.purchaseDetails) && p.purchaseDetails.length > 0
          ? p.purchaseDetails
          : p.details || [];

        const bestDetails = existingDetails.length >= newDetails.length ? existingDetails : newDetails;

        purchaseList[existingIdx] = {
          ...existing,
          ...p,
          orderNo: cleanOrd || existing.orderNo || p.orderNo,
          hasReturn: Boolean(existing.hasReturn || p.hasReturn),
          grandTotal: existing.grandTotal || p.grandTotal,
          paidAmount: existing.paidAmount || p.paidAmount,
          purchaseDetails: bestDetails,
          details: bestDetails,
        };
        aliases.forEach((a) => aliasToIdx.set(a, existingIdx));
      }
    };

    if (Array.isArray(purchasesData)) purchasesData.forEach(registerPurchase);
    if (Array.isArray(combinedPurchases)) combinedPurchases.forEach(registerPurchase);

    // If any purchase was returned, ensure its hasReturn flag is properly updated
    if (Array.isArray(rawReturns)) {
      rawReturns.forEach((r) => {
        const parentOrd = r.orderNo && r.orderNo !== "-" && !String(r.orderNo).startsWith("PR-") ? r.orderNo : "";
        const parentInv = (r.purchaseInvoiceNo && r.purchaseInvoiceNo !== "-") ? r.purchaseInvoiceNo : ((r.invoiceNo && r.invoiceNo !== "-" && r.invoiceNo !== r.returnNo) ? r.invoiceNo : "");
        const parentPurId = (r as any).purchaseId || (r as any).purchase_id;

        if (!parentOrd && !parentInv && !parentPurId) {
          return;
        }

        const cleanOrd = getCleanOrderNo(parentOrd, parentInv, parentPurId);
        const aliases = [
          cleanOrd ? `ord_${cleanOrd.toLowerCase()}` : null,
          parentOrd ? `ord_${String(parentOrd).trim().toLowerCase()}` : null,
          parentInv ? `inv_${String(parentInv).trim().toLowerCase()}` : null,
          r.challanNo ? `chn_${String(r.challanNo).trim().toLowerCase()}` : null,
        ].filter(Boolean) as string[];

        const exists = aliases.some((a) => aliasToIdx.has(a));
        if (exists) {
          for (const a of aliases) {
            if (aliasToIdx.has(a)) {
              const eIdx = aliasToIdx.get(a)!;
              purchaseList[eIdx].hasReturn = true;
              break;
            }
          }
        }
      });
    }

    // Ensure hasReturn is true for every purchase matching returnedInvoiceSet (sales er moto ek bar er beshi return kora jabe na)
    return purchaseList.map((p) => {
      const orderKey = String(p.orderNo || "").trim().toLowerCase();
      const invoiceKey = String(p.invoiceNo || (p as any).purchaseInvoiceNo || "").trim().toLowerCase();
      const challanKey = String(p.challanNo || "").trim().toLowerCase();

      const isMarkedReturned =
        Boolean(p.hasReturn) ||
        Boolean(orderKey && orderKey !== "-" && returnedInvoiceSet.has(orderKey)) ||
        Boolean(invoiceKey && invoiceKey !== "-" && returnedInvoiceSet.has(invoiceKey)) ||
        Boolean(challanKey && challanKey !== "-" && returnedInvoiceSet.has(challanKey));

      if (isMarkedReturned && !p.hasReturn) {
        return { ...p, hasReturn: true };
      }
      return p;
    });
  }, [purchasesData, combinedPurchases, rawReturns, returnedInvoiceSet]);

  // Enrich return records with authentic parent purchase data (Order ID, supplier name/phone/address)
  const enrichedReturns = useMemo(() => {
    if (!Array.isArray(rawReturns) || rawReturns.length === 0) return [];
    const purByInv = new Map<string, PurchaseItem>();
    const purByOrd = new Map<string, PurchaseItem>();
    const purByChn = new Map<string, PurchaseItem>();
    const purBySupAmt = new Map<string, PurchaseItem>();
    const purBySup = new Map<string, PurchaseItem>();

    rawPurchases.forEach((p) => {
      const cleanOrd = getCleanOrderNo(p.orderNo, p.invoiceNo || (p as any).purchaseInvoiceNo, p.id || (p as any).purchaseId);
      const effectivePur = { ...p, orderNo: cleanOrd || p.orderNo };
      if (p.invoiceNo) purByInv.set(String(p.invoiceNo).trim().toLowerCase(), effectivePur);
      if ((p as any).purchaseInvoiceNo) purByInv.set(String((p as any).purchaseInvoiceNo).trim().toLowerCase(), effectivePur);
      if (cleanOrd) purByOrd.set(cleanOrd.toLowerCase(), effectivePur);
      if (p.orderNo) purByOrd.set(String(p.orderNo).trim().toLowerCase(), effectivePur);
      if (p.challanNo) purByChn.set(String(p.challanNo).trim().toLowerCase(), effectivePur);
      const sName = String(p.supplierName || "").trim().toLowerCase();
      const pAmt = Number(p.grandTotal || 0).toFixed(2);
      if (sName && sName !== "supplier" && sName !== "direct supplier") {
        purBySupAmt.set(`${sName}_${pAmt}`, effectivePur);
        if (!purBySup.has(sName)) purBySup.set(sName, effectivePur);
      }
    });

    return rawReturns.map((r) => {
      let matchedPur: PurchaseItem | undefined;
      const rInv = String(r.purchaseInvoiceNo || r.invoiceNo || "").trim().toLowerCase();
      if (rInv && purByInv.has(rInv)) matchedPur = purByInv.get(rInv);
      const rOrd = String(r.orderNo || "").trim().toLowerCase();
      if (!matchedPur && rOrd && purByOrd.has(rOrd)) matchedPur = purByOrd.get(rOrd);
      if (!matchedPur) {
        const text = String(r.remarks || r.note || "");
        const invMatch = text.match(/(?:invoice|inv|from|supplier)\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
        if (invMatch && invMatch[1] && purByInv.has(invMatch[1].trim().toLowerCase())) {
          matchedPur = purByInv.get(invMatch[1].trim().toLowerCase());
        }
      }
      const rChn = String(r.challanNo || "").trim().toLowerCase();
      if (!matchedPur && rChn && purByChn.has(rChn)) matchedPur = purByChn.get(rChn);
      const rSup = String(r.supplierName || "").trim().toLowerCase();
      const rRefund = Number(r.refundAmount || r.grandTotal || 0).toFixed(2);
      if (!matchedPur && rSup && rSup !== "supplier" && rSup !== "direct supplier") {
        matchedPur = purBySupAmt.get(`${rSup}_${rRefund}`) || purBySup.get(rSup);
      }

      const cleanOrd = matchedPur?.orderNo
        ? getCleanOrderNo(matchedPur.orderNo)
        : getCleanOrderNo(r.orderNo, r.purchaseInvoiceNo || r.invoiceNo);

      return {
        ...r,
        orderNo: cleanOrd || matchedPur?.orderNo || (r.orderNo && !String(r.orderNo).startsWith("2611") && !/^\d{9,}$/.test(String(r.orderNo)) ? r.orderNo : ""),
        supplierName: matchedPur?.supplierName || r.supplierName,
        supplierPhone: matchedPur?.supplierPhone || r.supplierPhone,
        supplierAddress: matchedPur?.supplierAddress || r.supplierAddress,
        purchaseInvoiceNo: matchedPur?.purchaseInvoiceNo || matchedPur?.invoiceNo || r.purchaseInvoiceNo || r.invoiceNo,
      };
    });
  }, [rawReturns, rawPurchases]);

  // Zero-network suppliers list derived directly from active purchases and returns
  const suppliersList: PartyItem[] = useMemo(() => {
    const supMap = new Map<string, PartyItem>();

    rawPurchases.forEach((p) => {
      const key = String(p.supplierId ?? p.partyId ?? p.supplierName ?? "").trim();
      if (key && !supMap.has(key)) {
        supMap.set(key, {
          id: p.supplierId ?? p.partyId,
          partyId: p.supplierId ?? p.partyId,
          name: p.supplierName || "Supplier",
          partyName: p.supplierName || "Supplier",
          phone: p.supplierPhone || "",
          partyPhone: p.supplierPhone || "",
          address: p.supplierAddress || "",
          type: "SUPPLIER",
        });
      }
    });

    enrichedReturns.forEach((r) => {
      const key = String(r.supplierId ?? r.supplierName ?? "").trim();
      if (key && !supMap.has(key)) {
        supMap.set(key, {
          id: r.supplierId,
          partyId: r.supplierId,
          name: r.supplierName || "Supplier",
          partyName: r.supplierName || "Supplier",
          phone: r.supplierPhone || "",
          partyPhone: r.supplierPhone || "",
          address: r.supplierAddress || "",
          type: "SUPPLIER",
        });
      }
    });

    return Array.from(supMap.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [rawPurchases, enrichedReturns]);

  const isPurchasesLoading = isPurchasesLoadingQuery && rawPurchases.length === 0;
  const isReturnsLoading = isCombinedLoading;
  const isReturnsFetching = isCombinedFetching;

  // ----------------- PURCHASES FILTERING & SORTING -----------------
  const filteredPurchases = useMemo(() => {
    return rawPurchases.filter((purchase: any) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const inv = String(purchase.invoiceNo || "").toLowerCase();
        const ord = String(purchase.orderNo || "").toLowerCase();
        const chn = String(purchase.challanNo || "").toLowerCase();
        const sName = String(purchase.supplierName || "").toLowerCase();
        const sPhone = String(purchase.supplierPhone || "").toLowerCase();
        if (!inv.includes(q) && !ord.includes(q) && !chn.includes(q) && !sName.includes(q) && !sPhone.includes(q)) {
          return false;
        }
      }

      if (statusFilter !== "all" && statusFilter !== "") {
        const paidAmount = Number(purchase.paidAmount || 0);
        const dueAmount = Number(purchase.dueAmount || 0);

        if (statusFilter === "COMPLETED" || statusFilter === "PAID") {
          if (dueAmount > 0) return false;
        } else if (statusFilter === "PARTIAL") {
          if (!(dueAmount > 0 && paidAmount > 0)) return false;
        } else if (statusFilter === "PENDING" || statusFilter === "DUE") {
          if (!(dueAmount > 0 && paidAmount === 0)) return false;
        }
      }

      if (paymentMethodFilter !== "all" && paymentMethodFilter !== "") {
        const method = String(purchase.paymentType || "").toUpperCase();
        if (method !== paymentMethodFilter.toUpperCase()) {
          return false;
        }
      }

      if (supplierFilter && supplierFilter !== "all") {
        const supId = String(purchase.supplierId ?? purchase.partyId ?? "").trim().toLowerCase();
        const supName = String(purchase.supplierName ?? "").trim().toLowerCase();
        const filterVal = supplierFilter.toLowerCase();
        if (supId !== filterVal && !supName.includes(filterVal)) {
          return false;
        }
      }

      if (dateFilter && dateFilter !== "all") {
        const rawDate = purchase.purchaseDate || purchase.date || purchase.createdAt || purchase.created_at;
        if (!rawDate) return false;
        const m = moment(rawDate);
        if (!m.isValid()) return false;
        const purchaseDateStr = m.format("YYYY-MM-DD");

        if (customStartDate || customEndDate) {
          if (customStartDate && purchaseDateStr < customStartDate) return false;
          if (customEndDate && purchaseDateStr > customEndDate) return false;
          return true;
        }

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
        } else if (dateFilter === "30_days" || dateFilter === "last_30_days" || dateFilter === "last30days") {
          const startOf30Days = moment().subtract(30, "days").format("YYYY-MM-DD");
          if (purchaseDateStr < startOf30Days || purchaseDateStr > todayStr) return false;
        } else if (dateFilter === "this_year" || dateFilter === "thisYear") {
          const startOfYear = moment().startOf("year").format("YYYY-MM-DD");
          const endOfYear = moment().endOf("year").format("YYYY-MM-DD");
          if (purchaseDateStr < startOfYear || purchaseDateStr > endOfYear) return false;
        }
      }

      return true;
    });
  }, [
    rawPurchases,
    debouncedSearch,
    statusFilter,
    paymentMethodFilter,
    supplierFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const sortedPurchases = useMemo(() => {
    return [...filteredPurchases].sort((a: any, b: any) => {
      const dateA = new Date(a.purchaseDate || a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.purchaseDate || b.date || b.createdAt || 0).getTime();
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
      if (sortBy === "supplier_a_to_z") {
        const nameA = String(a.supplierName || "Direct Supplier").trim().toLowerCase();
        const nameB = String(b.supplierName || "Direct Supplier").trim().toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        return cmp !== 0 ? cmp : dateB - dateA;
      }
      if (sortBy === "supplier_z_to_a") {
        const nameA = String(a.supplierName || "Direct Supplier").trim().toLowerCase();
        const nameB = String(b.supplierName || "Direct Supplier").trim().toLowerCase();
        const cmp = nameB.localeCompare(nameA);
        return cmp !== 0 ? cmp : dateB - dateA;
      }
      return dateB - dateA; // latest default
    });
  }, [filteredPurchases, sortBy]);

  // Purchases Stats
  const purchasesStats = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    sortedPurchases.forEach((p: any) => {
      totalAmount += Number(p.grandTotal || 0);
      totalPaid += Number(p.paidAmount || 0);
      totalDue += Number(p.dueAmount || 0);
    });

    return {
      totalCount: sortedPurchases.length,
      totalAmount,
      totalPaid,
      totalDue,
    };
  }, [sortedPurchases]);

  // Purchases Pagination
  const purchasesTotalCount = sortedPurchases.length;
  const purchasesPageCount = Math.ceil(purchasesTotalCount / dataLimit) || 1;
  const startPurchasesIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedPurchases = sortedPurchases.slice(startPurchasesIndex, startPurchasesIndex + dataLimit);

  // ----------------- RETURNS FILTERING & SORTING -----------------
  const filteredReturns = useMemo(() => {
    return enrichedReturns.filter((item) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const ordNo = String(item.orderNo || "").toLowerCase();
        const retNo = String(item.returnNo || "").toLowerCase();
        const invNo = String(item.purchaseInvoiceNo || item.invoiceNo || "").toLowerCase();
        const chnNo = String(item.challanNo || "").toLowerCase();
        const sName = String(item.supplierName || "").toLowerCase();
        const sPhone = String(item.supplierPhone || "").toLowerCase();
        const remarks = String(item.note || item.remarks || "").toLowerCase();
        if (
          !ordNo.includes(q) &&
          !retNo.includes(q) &&
          !invNo.includes(q) &&
          !chnNo.includes(q) &&
          !sName.includes(q) &&
          !sPhone.includes(q) &&
          !remarks.includes(q)
        ) {
          return false;
        }
      }

      if (supplierFilter && supplierFilter !== "all") {
        const sId = String(item.supplierId ?? "").trim().toLowerCase();
        const sName = String(item.supplierName ?? "").trim().toLowerCase();
        const filterVal = supplierFilter.toLowerCase();
        if (sId !== filterVal && !sName.includes(filterVal)) {
          return false;
        }
      }

      if (paymentMethodFilter !== "all") {
        if (String(item.paymentType || "").toUpperCase() !== paymentMethodFilter.toUpperCase()) {
          return false;
        }
      }

      if (dateFilter && dateFilter !== "all") {
        const rawDate = item.returnDate || item.createdAt || (item as any).purchaseDate || (item as any).date;
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
    supplierFilter,
    paymentMethodFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  const sortedReturns = useMemo(() => {
    return [...filteredReturns].sort((a, b) => {
      const timeA = getReturnSortTimestamp(a);
      const timeB = getReturnSortTimestamp(b);
      const numA = Number(String(a.returnNo || a.purchaseReturnNo || a.id || "").replace(/\D/g, "")) || 0;
      const numB = Number(String(b.returnNo || b.purchaseReturnNo || b.id || "").replace(/\D/g, "")) || 0;
      const amountA = Number(a.refundAmount || a.grandTotal || 0);
      const amountB = Number(b.refundAmount || b.grandTotal || 0);

      if (sortBy === "oldest") {
        if (timeA !== timeB && timeA > 0 && timeB > 0) return timeA - timeB;
        if (numA !== numB) return numA - numB;
        return 0;
      }
      if (sortBy === "amount_high" || sortBy === "amount_high_to_low") {
        const diff = amountB - amountA;
        return diff !== 0 ? diff : (timeB - timeA || numB - numA);
      }
      if (sortBy === "amount_low" || sortBy === "amount_low_to_high") {
        const diff = amountA - amountB;
        return diff !== 0 ? diff : (timeB - timeA || numB - numA);
      }
      // Latest default: most recent timestamp is #1, then 2nd recent
      if (timeB !== timeA && timeA > 0 && timeB > 0) return timeB - timeA;
      if (numB !== numA) return numB - numA;
      return 0;
    });
  }, [filteredReturns, sortBy]);

  // Returns Stats
  const returnsStats = useMemo(() => {
    let totalRefund = 0;
    let cashRefund = 0;
    let creditAdjust = 0;

    sortedReturns.forEach((r) => {
      const refund = Number(r.refundAmount || r.grandTotal || 0);
      totalRefund += refund;

      const pType = String(r.paymentType || "").toUpperCase();
      if (pType === "CASH") {
        cashRefund += Number(r.cashReceived || refund);
      } else {
        creditAdjust += Number(r.dueAmount || refund);
      }
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
    setSupplierFilter("all");
    setPaymentMethodFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSortBy("latest");
    setCurrentPageNumber(1);
  };

  // Actions - Purchases
  const handlePrintPurchase = (purchase: PurchaseItem) => {
    setSelectedPurchaseForInvoice(purchase);
    setIsPurchaseInvoiceModalOpen(true);
  };

  const handleEditPurchase = (purchase: PurchaseItem) => {
    const invKey = String(purchase.invoiceNo || (purchase as any).purchaseInvoiceNo || "").trim().toLowerCase();
    const ordKey = String(purchase.orderNo || "").trim().toLowerCase();
    const chnKey = String(purchase.challanNo || "").trim().toLowerCase();
    const purIdKey = purchase.id ? String(purchase.id).trim().toLowerCase() : "";

    const pStatusUpper = String(purchase.status || "").trim().toUpperCase();
    const pReturnTypeUpper = String((purchase as any).returnType || (purchase as any).return_type || "").trim().toUpperCase();
    const isStatusReturn =
      pStatusUpper === "RETURN" ||
      pStatusUpper === "RETURNED" ||
      pStatusUpper === "FULL_RETURN" ||
      pStatusUpper === "FULL RETURN" ||
      pStatusUpper === "PARTIAL_RETURN" ||
      pStatusUpper === "PARTIAL RETURN" ||
      pReturnTypeUpper === "FULL" ||
      pReturnTypeUpper === "RETURN";

    const isReturned = Boolean(
      purchase.hasReturn ||
      isStatusReturn ||
      (returnedInvoiceSet && (
        (invKey && invKey !== "-" && returnedInvoiceSet.has(invKey)) ||
        (ordKey && ordKey !== "-" && returnedInvoiceSet.has(ordKey)) ||
        (chnKey && chnKey !== "-" && returnedInvoiceSet.has(chnKey)) ||
        (purIdKey && purIdKey !== "-" && returnedInvoiceSet.has(purIdKey))
      ))
    );

    if (isReturned) {
      showErrorToast("Returned purchases cannot be edited / ফেরত হওয়া পারচেজ এডিট করা যাবে না");
      return;
    }

    const id = purchase.id || purchase.purchaseId || purchase.invoiceNo;
    navigate(`/admin/edit-purchase/${id}`, {
      state: { editData: purchase },
    });
  };


  // Actions - Returns
  const handlePrintReturn = (item: PurchaseReturnItem) => {
    setSelectedReturnForInvoice(item);
    setAutoPrintReturnModal(true);
    setIsReturnInvoiceModalOpen(true);
  };

  const handleRefetchAll = () => {
    handleResetFilters();
    refetchPurchases();
    refetchCombined();
  };

  const isGlobalLoading = isPurchasesLoading || isReturnsLoading;
  const isGlobalFetching = isPurchasesFetching || isReturnsFetching;

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle={activeTab === "purchases" ? "Purchases" : "Purchase Return"}
          headerDescription={
            activeTab === "purchases"
              ? "Manage supplier purchases, invoices, stock receive, and trade accounts"
              : "Manage supplier purchase returns, item quantities, and refund settlements"
          }
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <RefreshButton onClick={handleRefetchAll} isLoading={isGlobalLoading || isGlobalFetching} />
          {activeTab === "purchases" ? (
            <>
              <button
                type="button"
                onClick={() => setIsChallanSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--ui-text)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <FaSlidersH className="text-[var(--ui-text-muted)]" size={13} />
                <span className="hidden sm:inline">Challan Settings</span>
              </button>
              {canCreate("purchase") && (
                <Button
                  label="New Purchase"
                  onClick={() => navigate("/admin/create-purchase")}
                  color="var(--primary-color)"
                  hoverColor="var(--primary-color-hover)"
                  icon={<FaPlus className="text-white text-xs" />}
                />
              )}
            </>
          ) : (
            (canCreate("purchase_return") || canCreate("purchase")) && (
              <Button
                label="Create Return"
                onClick={() => navigate("/admin/create-purchase-return")}
                color="var(--primary-color)"
                hoverColor="var(--primary-color-hover)"
                icon={<FaPlus className="text-white text-xs" />}
              />
            )
          )}
        </div>
      </div>

      {/* KPI Cards based on Active Tab */}
      {activeTab === "purchases" ? (
        <PurchaseStats
          totalCount={purchasesStats.totalCount}
          totalAmount={purchasesStats.totalAmount}
          totalPaid={purchasesStats.totalPaid}
          totalDue={purchasesStats.totalDue}
        />
      ) : (
        <TradeReturnStats
          totalCount={returnsStats.totalCount}
          totalRefundAmount={returnsStats.totalRefundAmount}
          totalCashRefund={returnsStats.totalCashRefund}
          totalCreditAdjust={returnsStats.totalCreditAdjust}
        />
      )}

      {/* Unified Tab Switcher: Purchases List vs Purchase Returns List */}
      <div className="flex items-center gap-1.5 border-b border-[var(--ui-border)]/90 -my-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab("purchases");
            setCurrentPageNumber(1);
            navigate("/admin/purchases", { replace: true });
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "purchases"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaShoppingBag size={11} />
          <span>Purchases List ({rawPurchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("returns");
            setCurrentPageNumber(1);
            navigate("/admin/purchase-return", { replace: true });
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === "returns"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--primary-color-light)]/50 rounded-t-md"
              : "border-transparent text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)] rounded-t-md"
          }`}
        >
          <FaUndoAlt size={11} />
          <span>Purchase Returns List ({enrichedReturns.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "purchases" ? (
        <PurchaseTable
          purchases={paginatedPurchases}
          exportablePurchases={sortedPurchases}
          totalCount={purchasesTotalCount}
          isLoading={isPurchasesLoading}
          isFetching={isPurchasesFetching}
          pageCount={purchasesPageCount}
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
          supplierFilter={supplierFilter}
          setSupplierFilter={setSupplierFilter}
          suppliersList={suppliersList}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          sortBy={sortBy}
          setSortBy={setSortBy}
          returnedInvoiceSet={returnedInvoiceSet}
          onEdit={handleEditPurchase}
          onPrint={handlePrintPurchase}
          onDelete={handleDeletePurchase}
        />
      ) : (
        <PurchaseReturnTable
          returns={paginatedReturns}
          exportableReturns={sortedReturns}
          totalCount={returnsTotalCount}
          isLoading={isReturnsLoading}
          pageCount={returnsPageCount}
          currentPageNumber={currentPageNumber}
          setCurrentPageNumber={setCurrentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          handlePagination={handlePagination}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          supplierFilter={supplierFilter}
          setSupplierFilter={setSupplierFilter}
          suppliersList={suppliersList}
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
          onPrint={handlePrintReturn}
        />
      )}

      {/* View / Print Purchase Invoice Modal */}
      <PurchaseInvoiceModal
        isOpen={isPurchaseInvoiceModalOpen}
        onClose={() => {
          setIsPurchaseInvoiceModalOpen(false);
          setSelectedPurchaseForInvoice(null);
        }}
        purchase={selectedPurchaseForInvoice}
        autoPrint
      />

      {/* View / Print Return Invoice Modal */}
      <PurchaseReturnInvoiceModal
        isOpen={isReturnInvoiceModalOpen}
        onClose={() => {
          setIsReturnInvoiceModalOpen(false);
          setSelectedReturnForInvoice(null);
          setAutoPrintReturnModal(false);
        }}
        returnData={selectedReturnForInvoice}
        autoPrint={autoPrintReturnModal}
      />

      {/* Challan Settings Modal */}
      <ChallanSettingsModal
        isOpen={isChallanSettingsOpen}
        onClose={() => setIsChallanSettingsOpen(false)}
      />

      {/* Delete Confirmation Modal using shared OrderDeleteModal */}
      <OrderDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        entityName="Purchase Order"
        orderIdentifier={deleteOrderIdentifier}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Purchases;
