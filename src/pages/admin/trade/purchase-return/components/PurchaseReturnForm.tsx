import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import {
  FaSearch,
  FaFileInvoice,
  FaBoxes,
  FaUndoAlt,
  FaTimes,
  FaLock,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
} from "react-icons/fa";
import Button from "@/components/button/Button";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PurchaseReturnInvoiceModal from "./PurchaseReturnInvoiceModal";
import DatePicker from "@/components/common/DatePicker";
import TextInput from "@/components/form/TextInput";
import apiConfig from "@/config/api.json";
import {
  purchaseAndReturnQueryKey,
  purchaseListQueryKey,
  productListQueryKey,
  productQueryKey,
  dashboardQueryKey,
} from "@/config/query-key";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import { cashLeg, bankLeg, mfsLeg, type TradeTender } from "@/services/financial-ledger-service";
import { useTradeRefund } from "@/hooks/useTradeRefund";
import TradeRefundSection from "@/components/trade/TradeRefundSection";
import { useDebounce } from "@/hooks/useDebounce";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { PurchaseItem, PurchaseReturnItem } from "@/types";
import { PURCHASE_RETURN_REASONS } from "@/pages/admin/trade/constants/returnReasons";
import {
  usePurchasesQuery,
  usePurchaseAndReturnsQuery,
} from "@/pages/admin/trade/purchases/hooks/usePurchaseQueries";

interface ReturnLineFormState {
  productId: string | number;
  productCode: string;
  productName: string;
  unit: string;
  purchasedQuantity: number;
  alreadyReturnedQty: number;
  availableQuantity: number;
  quantity: number;
  buyPrice: number;
  discount: number;
  vat: number;
  deliveryCharge: number;
  total: number;
  returnReason?: string;
  isSelected: boolean;
}

export const PurchaseReturnForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const statePurchase: PurchaseItem | undefined = (location.state as any)?.purchase;

  // Selected Purchase & Basic Return Info
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseItem | null>(statePurchase || null);
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState<string>(statePurchase?.invoiceNo || "");
  const [returnDate, setReturnDate] = useState<string>(() => moment().format("YYYY-MM-DD"));
  const [supplierId, setSupplierId] = useState<string | number>(statePurchase?.supplierId || "");
  const [supplierName, setSupplierName] = useState<string>(statePurchase?.supplierName || "");
  const [supplierPhone, setSupplierPhone] = useState<string>(statePurchase?.supplierPhone || "");
  const [supplierAddress, setSupplierAddress] = useState<string>(statePurchase?.supplierAddress || "");
  const status = "Return";
  const [note, setNote] = useState<string>("");

  // Return Mode: "FULL" (all items & full qty) vs "PARTIAL" (selected items / partial qty)
  const [returnMode, setReturnMode] = useState<"FULL" | "PARTIAL">("PARTIAL");

  // Product Lines
  const [lines, setLines] = useState<ReturnLineFormState[]>([]);

  // Financials
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>("");
  const [invoiceVat, setInvoiceVat] = useState<string>("");



  // Search & Dropdown
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState<boolean>(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("");
  const debouncedInvoiceSearch = useDebounce(invoiceSearchQuery, 250);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // Submission & Modals
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [pendingPrintAfterSave, setPendingPrintAfterSave] = useState<boolean>(false);
  const [savedReturnRecord, setSavedReturnRecord] = useState<PurchaseReturnItem | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [hasJustSubmitted, setHasJustSubmitted] = useState<boolean>(false);

  // 1. Fetch purchases and returns from shared TanStack Query cache (zero waterfall, instant cache hits)
  const { data: apiPurchaseAndReturnData, isLoading: isLoadingReturns } = usePurchaseAndReturnsQuery();
  const { data: purchasesData, isLoading: isLoadingPurchases } = usePurchasesQuery();
  const isLoadingInvoices = isLoadingReturns || isLoadingPurchases;

  // 2. Fetch registered Bank and MFS accounts for refund disbursement (Shared cache with 5-minute staleTime)
  const { registeredBankAccounts, registeredMfsAccounts } = useFinancialAccounts();
  const { recordTradeLedger } = useFinancialLedger();

  const availableInvoices: PurchaseItem[] = useMemo(() => {
    const combinedCandidates: any[] = [];
    const seenKeys = new Set<string>();

    const addCandidate = (item: any) => {
      if (!item) return;
      const key = String(
        item.purchaseInvoiceNo ||
        item.invoiceNo ||
        item.id ||
        ""
      ).trim().toLowerCase();
      if (key && seenKeys.has(key)) return;
      if (key) seenKeys.add(key);
      combinedCandidates.push(item);
    };

    if (Array.isArray(purchasesData)) {
      purchasesData.forEach(addCandidate);
    }
    if (Array.isArray(apiPurchaseAndReturnData)) {
      apiPurchaseAndReturnData.forEach(addCandidate);
    }

    return combinedCandidates.filter((item: any) => {
      const hasDetails =
        (Array.isArray(item.purchaseDetails) && item.purchaseDetails.length > 0) ||
        (Array.isArray(item.purchasesDetails) && item.purchasesDetails.length > 0) ||
        (Array.isArray(item.details) && item.details.length > 0);
      return hasDetails;
    });
  }, [purchasesData, apiPurchaseAndReturnData]);

  const cleanKey = (val: any) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  // Pre-indexed returns and returned purchase lookup for O(1) checks
  const { returnedPurchaseKeysSet, returnsByPurchaseKey } = useMemo(() => {
    const keysSet = new Set<string>();
    const returnsMap = new Map<string, any[]>();
    const allRecords = Array.isArray(apiPurchaseAndReturnData) ? apiPurchaseAndReturnData : [];

    allRecords.forEach((item: any) => {
      const isReturnRecord =
        Boolean(item.hasReturn) ||
        Boolean(item.returnNo) ||
        Boolean(item.returnGrandTotal) ||
        String(item.returnType || "").toUpperCase() === "RETURN" ||
        String(item.status || "").toUpperCase() === "RETURN" ||
        (item.refNo && String(item.refNo).startsWith("PR-")) ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

      const addIndex = (prefix: string, keyVal: string, record: any) => {
        if (!keyVal) return;
        const compKey = `${prefix}:${keyVal}`;
        keysSet.add(compKey);
        const list = returnsMap.get(compKey) || [];
        list.push(record);
        returnsMap.set(compKey, list);
      };

      if (isReturnRecord) {
        const itemInv = cleanKey(item.purchaseInvoiceNo || item.invoiceNo);
        const itemOrd = cleanKey(item.orderNo);
        const itemChallan = cleanKey(item.challanNo);
        // NOTE: Only use item.purchaseId. NEVER use item.id because item.id is the return record ID!
        const itemPurchaseId = cleanKey(item.purchaseId);

        addIndex("inv", itemInv, item);
        addIndex("ord", itemOrd, item);
        addIndex("challan", itemChallan, item);
        addIndex("pid", itemPurchaseId, item);
      } else if (
        item.hasReturn ||
        (Array.isArray(item.returns) && item.returns.length > 0) ||
        (Array.isArray(item.purchaseReturns) && item.purchaseReturns.length > 0)
      ) {
        const inv = cleanKey(item.invoiceNo || item.purchaseInvoiceNo);
        const ord = cleanKey(item.orderNo);
        const challan = cleanKey(item.challanNo);
        const pid = cleanKey(item.purchaseId || item.id);

        if (inv) keysSet.add(`inv:${inv}`);
        if (ord) keysSet.add(`ord:${ord}`);
        if (challan) keysSet.add(`challan:${challan}`);
        if (pid) keysSet.add(`pid:${pid}`);
      }
    });

    return { returnedPurchaseKeysSet: keysSet, returnsByPurchaseKey: returnsMap };
  }, [apiPurchaseAndReturnData]);

  // Fast O(1) check if a purchase has already been returned
  const isPurchaseAlreadyReturned = useCallback((purchase: any): boolean => {
    if (!purchase) return false;
    if (purchase.hasReturn || purchase.returnNo) return true;
    if (String(purchase.returnType || "").toUpperCase() === "RETURN") return true;
    if (Array.isArray(purchase.returnDetails) && purchase.returnDetails.length > 0) return true;
    if (Array.isArray(purchase.purchaseReturnDetails) && purchase.purchaseReturnDetails.length > 0) return true;
    if (Array.isArray(purchase.returns) && purchase.returns.length > 0) return true;
    if (Array.isArray(purchase.purchaseReturns) && purchase.purchaseReturns.length > 0) return true;

    const inv = cleanKey(purchase.invoiceNo || (purchase as any).purchaseInvoiceNo);
    if (inv && returnedPurchaseKeysSet.has(`inv:${inv}`)) return true;

    const ord = cleanKey(purchase.orderNo);
    if (ord && returnedPurchaseKeysSet.has(`ord:${ord}`)) return true;

    const challan = cleanKey(purchase.challanNo);
    if (challan && returnedPurchaseKeysSet.has(`challan:${challan}`)) return true;

    const pid = cleanKey(purchase.purchaseId || purchase.id);
    if (pid && returnedPurchaseKeysSet.has(`pid:${pid}`)) return true;

    return false;
  }, [returnedPurchaseKeysSet]);

  // Helper to calculate already returned quantities using exact-match indexing
  const getReturnedQuantitiesForPurchase = useCallback((purchase: PurchaseItem): Record<string, number> => {
    const invClean = cleanKey(purchase.invoiceNo || (purchase as any).purchaseInvoiceNo);
    const ordClean = cleanKey((purchase as any).orderNo);
    const challanClean = cleanKey(purchase.challanNo);
    const purchaseIdClean = cleanKey(purchase.purchaseId || purchase.id);

    const returnedQtyMap: Record<string, number> = {};

    const processDetailsList = (details: any[]) => {
      if (!Array.isArray(details)) return;
      details.forEach((rd: any) => {
        const pId = String(rd.productId ?? rd.id ?? "").trim();
        const pCode = String(rd.productCode ?? rd.pcode ?? "").trim();
        const pName = String(rd.productName ?? rd.name ?? "").trim().toLowerCase();
        const qty = Number(rd.quantity ?? rd.returnQuantity ?? 0);

        if (qty > 0) {
          if (pId) returnedQtyMap[`id_${pId}`] = (returnedQtyMap[`id_${pId}`] || 0) + qty;
          if (pCode) {
            returnedQtyMap[`code_${pCode.toLowerCase()}`] = (returnedQtyMap[`code_${pCode.toLowerCase()}`] || 0) + qty;
          }
          if (pName) {
            returnedQtyMap[`name_${pName}`] = (returnedQtyMap[`name_${pName}`] || 0) + qty;
            const baseName = pName.split(/[(/[-]/)[0].trim();
            if (baseName && baseName !== pName) {
              returnedQtyMap[`basename_${baseName}`] = (returnedQtyMap[`basename_${baseName}`] || 0) + qty;
            }
          }
        }
      });
    };

    const matchedReturns = new Set<any>();
    if (invClean && returnsByPurchaseKey.has(`inv:${invClean}`)) {
      returnsByPurchaseKey.get(`inv:${invClean}`)?.forEach((r) => matchedReturns.add(r));
    }
    if (ordClean && returnsByPurchaseKey.has(`ord:${ordClean}`)) {
      returnsByPurchaseKey.get(`ord:${ordClean}`)?.forEach((r) => matchedReturns.add(r));
    }
    if (challanClean && returnsByPurchaseKey.has(`challan:${challanClean}`)) {
      returnsByPurchaseKey.get(`challan:${challanClean}`)?.forEach((r) => matchedReturns.add(r));
    }
    if (purchaseIdClean && returnsByPurchaseKey.has(`pid:${purchaseIdClean}`)) {
      returnsByPurchaseKey.get(`pid:${purchaseIdClean}`)?.forEach((r) => matchedReturns.add(r));
    }

    matchedReturns.forEach((r) => {
      processDetailsList(r.returnDetails || r.purchaseReturnDetails || r.details);
    });

    if (Array.isArray((purchase as any).returnDetails)) {
      processDetailsList((purchase as any).returnDetails);
    }
    if (Array.isArray((purchase as any).purchaseReturnDetails)) {
      processDetailsList((purchase as any).purchaseReturnDetails);
    }
    if (Array.isArray((purchase as any).returns)) {
      (purchase as any).returns.forEach((r: any) => {
        processDetailsList(r.returnDetails || r.purchaseReturnDetails || r.details);
      });
    }
    if (Array.isArray((purchase as any).purchaseReturns)) {
      (purchase as any).purchaseReturns.forEach((r: any) => {
        processDetailsList(r.returnDetails || r.purchaseReturnDetails || r.details);
      });
    }

    return returnedQtyMap;
  }, [returnsByPurchaseKey]);

  const isCurrentPurchaseAlreadyReturned =
    Boolean(selectedPurchase && !hasJustSubmitted && isPurchaseAlreadyReturned(selectedPurchase));

  // Load purchase into form and configure supplier payment breakdown
  const loadInvoice = useCallback((purchase: PurchaseItem) => {
    setSelectedPurchase(purchase);
    const invNo = purchase.invoiceNo || `PUR-${purchase.id}`;
    setPurchaseInvoiceNo(invNo);
    setInvoiceSearchQuery(purchase.challanNo ? `${invNo} (Challan: ${purchase.challanNo})` : invNo);
    setSupplierId(purchase.supplierId || "");
    setSupplierName(purchase.supplierName || (purchase as any).supplier_name || "");
    setSupplierPhone(purchase.supplierPhone || (purchase as any).supplier_phone || "");
    setSupplierAddress(purchase.supplierAddress || (purchase as any).supplier_address || "");
    setNote("");

    const details: any[] =
      Array.isArray(purchase.purchaseDetails) && purchase.purchaseDetails.length > 0
        ? purchase.purchaseDetails
        : Array.isArray(purchase.purchasesDetails) && purchase.purchasesDetails.length > 0
        ? purchase.purchasesDetails
        : Array.isArray(purchase.details)
        ? purchase.details
        : [];

    const returnedMap = getReturnedQuantitiesForPurchase(purchase);

    if (details.length > 0) {
      const formattedLines: ReturnLineFormState[] = details.map((d: any) => {
        const purchasedQty = Number(d.quantity ?? 1);
        const buyPrice = Number(d.buyPrice ?? 0);

        const pId = String(d.productId ?? d.id ?? "").trim();
        const pCode = String(d.productCode ?? d.pcode ?? "").trim();
        const pName = String(d.productName ?? d.name ?? "Product").trim();
        const baseName = pName.toLowerCase().split(/[(/[-]/)[0].trim();

        const directReturned = Number(
          d.alreadyReturnedQty ??
          d.returnQuantity ??
          0
        );

        const matchedFromReturns = Math.max(
          pId ? (returnedMap[`id_${pId}`] || 0) : 0,
          pCode ? (returnedMap[`code_${pCode.toLowerCase()}`] || 0) : 0,
          pName ? (returnedMap[`name_${pName}`] || 0) : 0,
          baseName ? (returnedMap[`basename_${baseName}`] || 0) : 0
        );

        const alreadyReturned = Math.min(purchasedQty, Math.max(directReturned, matchedFromReturns));
        const availableQty = Math.max(0, purchasedQty - alreadyReturned);

        const initialReturnQty = availableQty > 0 ? (availableQty >= 1 ? 1 : availableQty) : 0;
        const initialSelected = availableQty > 0;

        return {
          productId: pId,
          productCode: pCode,
          productName: pName,
          unit: d.unit || "pcs",
          purchasedQuantity: purchasedQty,
          alreadyReturnedQty: alreadyReturned,
          availableQuantity: availableQty,
          quantity: initialReturnQty,
          buyPrice,
          discount: Number(d.discount ?? 0),
          vat: Number(d.vat ?? 0),
          deliveryCharge: Number(d.deliveryCharge ?? 0),
          total: Number((initialReturnQty * buyPrice).toFixed(2)),
          returnReason: d.returnReason || "damaged_product",
          isSelected: initialSelected,
        };
      });

      setLines(formattedLines);
      const allAvail = formattedLines.filter((l) => l.availableQuantity > 0);
      const allSelectedAndFull =
        allAvail.length > 0 &&
        allAvail.every((l) => l.isSelected && l.quantity === l.availableQuantity);
      setReturnMode(allSelectedAndFull ? "FULL" : "PARTIAL");
    } else {
      setLines([]);
    }
  }, [getReturnedQuantitiesForPurchase]);

  // Populate from route navigation state if available
  useEffect(() => {
    if (statePurchase) {
      loadInvoice(statePurchase);
    }
  }, [statePurchase, loadInvoice]);

  // Sync available quantities when returns data updates
  useEffect(() => {
    if (selectedPurchase && Array.isArray(apiPurchaseAndReturnData) && apiPurchaseAndReturnData.length > 0) {
      const returnedMap = getReturnedQuantitiesForPurchase(selectedPurchase);
      setLines((prevLines) => {
        if (!prevLines || prevLines.length === 0) return prevLines;
        return prevLines.map((line) => {
          const pId = String(line.productId || "").trim();
          const pCode = String(line.productCode || "").trim();
          const pName = String(line.productName || "").trim().toLowerCase();
          const baseName = pName.split(/[(/[-]/)[0].trim();

          const matchedFromReturns = Math.max(
            pId ? (returnedMap[`id_${pId}`] || 0) : 0,
            pCode ? (returnedMap[`code_${pCode.toLowerCase()}`] || 0) : 0,
            pName ? (returnedMap[`name_${pName}`] || 0) : 0,
            baseName ? (returnedMap[`basename_${baseName}`] || 0) : 0
          );

          const alreadyReturned = Math.min(line.purchasedQuantity, matchedFromReturns);
          const availableQty = Math.max(0, line.purchasedQuantity - alreadyReturned);
          const clampedQty = Math.min(line.quantity, availableQty);

          return {
            ...line,
            alreadyReturnedQty: alreadyReturned,
            availableQuantity: availableQty,
            quantity: clampedQty,
            isSelected: availableQty > 0 && line.isSelected,
            total: clampedQty * line.buyPrice,
          };
        });
      });
    }
  }, [apiPurchaseAndReturnData, selectedPurchase, getReturnedQuantitiesForPurchase]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        invoiceDropdownRef.current &&
        !invoiceDropdownRef.current.contains(e.target as Node)
      ) {
        setIsInvoiceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pre-filter unreturned purchases once whenever availableInvoices or isPurchaseAlreadyReturned updates
  const unreturnedInvoices = useMemo(() => {
    return availableInvoices.filter((inv) => !isPurchaseAlreadyReturned(inv));
  }, [availableInvoices, isPurchaseAlreadyReturned]);

  // Instant keystroke search: O(N) single loop with zero regex or nested lookups
  const filteredInvoices = useMemo(() => {
    const q = debouncedInvoiceSearch.toLowerCase().trim();
    if (!q) return unreturnedInvoices;

    return unreturnedInvoices.filter((inv) => {
      const invNo = String(inv.invoiceNo || (inv as any).purchaseInvoiceNo || "").toLowerCase();
      const challanNo = String(inv.challanNo || (inv as any).challan_no || "").toLowerCase();
      const sName = String(inv.supplierName || (inv as any).supplier_name || "").toLowerCase();
      const sPhone = String(inv.supplierPhone || (inv as any).supplier_phone || "").toLowerCase();
      return (
        invNo.includes(q) ||
        challanNo.includes(q) ||
        sName.includes(q) ||
        sPhone.includes(q)
      );
    });
  }, [unreturnedInvoices, debouncedInvoiceSearch]);

  // Recalculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let selectedItemCount = 0;
    let totalPieces = 0;

    lines.forEach((line) => {
      if (line.isSelected && line.quantity > 0) {
        subtotal += line.quantity * line.buyPrice;
        selectedItemCount++;
        totalPieces += line.quantity;
      }
    });

    const disc = Number(invoiceDiscount) || 0;
    const vat = Number(invoiceVat) || 0;
    const grandTotal = Math.max(0, subtotal - disc + vat);

    return {
      subtotal,
      discount: disc,
      vat,
      grandTotal,
      refundAmount: grandTotal,
      selectedItemCount,
      totalPieces,
    };
  }, [lines, invoiceDiscount, invoiceVat]);

  // Switch between Full and Partial Return Modes
  const handleSetReturnMode = (mode: "FULL" | "PARTIAL") => {
    setReturnMode(mode);
    if (mode === "FULL") {
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          isSelected: l.availableQuantity > 0,
          quantity: l.availableQuantity,
          total: l.availableQuantity * l.buyPrice,
        }))
      );
    }
  };

  // Quick Action: Clear all return quantities
  const handleClearAllQty = () => {
    setReturnMode("PARTIAL");
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        quantity: 0,
        total: 0,
        isSelected: false,
      }))
    );
  };

  // Quick Action: Set single line to 100% full available quantity
  const handleSetLineFullQty = (idx: number) => {
    if (returnMode === "FULL") return;
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              isSelected: l.availableQuantity > 0,
              quantity: l.availableQuantity,
              total: l.availableQuantity * l.buyPrice,
            }
          : l
      )
    );
  };

  // Line item handlers
  const handleToggleLine = (idx: number) => {
    if (returnMode === "FULL") return;
    setLines((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== idx) return item;
        if (item.availableQuantity <= 0) return item;
        const nextSelected = !item.isSelected;
        const nextQty = nextSelected
          ? item.quantity > 0
            ? item.quantity
            : Math.min(1, item.availableQuantity)
          : 0;
        return {
          ...item,
          isSelected: nextSelected,
          quantity: nextQty,
          total: nextQty * item.buyPrice,
        };
      });
      const anyAvail = updated.some((l) => l.availableQuantity > 0);
      const allFull =
        anyAvail &&
        updated
          .filter((l) => l.availableQuantity > 0)
          .every((l) => l.isSelected && l.quantity === l.availableQuantity);
      setReturnMode(allFull ? "FULL" : "PARTIAL");
      return updated;
    });
  };

  const handleQuantityChange = (idx: number, qty: number) => {
    if (returnMode === "FULL") return;
    setLines((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== idx) return item;
        const bounded = Math.max(0, Math.min(item.availableQuantity, qty));
        return {
          ...item,
          quantity: bounded,
          isSelected: bounded > 0,
          total: bounded * item.buyPrice,
        };
      });
      const anyAvail = updated.some((l) => l.availableQuantity > 0);
      const allFull =
        anyAvail &&
        updated
          .filter((l) => l.availableQuantity > 0)
          .every((l) => l.isSelected && l.quantity === l.availableQuantity);
      setReturnMode(allFull ? "FULL" : "PARTIAL");
      return updated;
    });
  };

  const handleReturnReasonChange = (idx: number, reason: string) => {
    setLines((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, returnReason: reason } : item
      )
    );
  };

  const refund = useTradeRefund({
    selectedRecord: selectedPurchase,
    refundAmount: totals.refundAmount,
    returnMode,
    registeredBankAccounts,
    registeredMfsAccounts,
    priority: "due_first",
  });

  const {
    origPaymentMode,
    origGrandTotal,
    origCashPaid,
    origBankPaid,
    origMfsPaid,
    origDueAmount,
    numRefundCash,
    numRefundBank,
    numRefundMfs,
    numRefundDue,
    selectedRefundBankId,
    selectedRefundMfsId,
    refundDifference,
    resetRefund,
  } = refund;

  // Reset form handler
  const handleReset = () => {
    setSelectedPurchase(null);
    setPurchaseInvoiceNo("");
    setInvoiceSearchQuery("");
    setSupplierId("");
    setSupplierName("");
    setSupplierPhone("");
    setSupplierAddress("");
    setLines([]);
    setInvoiceDiscount("");
    setInvoiceVat("");
    resetRefund();
    setNote("");
  };

  // Pre-validate before opening confirm modal
  const handlePreSubmit = (autoPrint: boolean) => {
    if (isCurrentPurchaseAlreadyReturned) {
      showErrorToast("This purchase order has already been returned. Cannot return again.");
      return;
    }

    if (!selectedPurchase) {
      showErrorToast("Please select a purchase invoice to return items from");
      return;
    }

    const activeLines = lines.filter((l) => l.isSelected && l.quantity > 0);
    if (activeLines.length === 0) {
      showErrorToast("Please select at least one item with return quantity greater than 0");
      return;
    }

    if (totals.refundAmount <= 0) {
      showErrorToast("Total return amount must be greater than 0");
      return;
    }

    if (Math.abs(refundDifference) > 0.01) {
      showErrorToast(
        `Settlement amount must match total return amount. Difference: ৳ ${formatMoney(Math.abs(refundDifference))}`
      );
      return;
    }

    if (numRefundBank > 0 && !selectedRefundBankId) {
      showErrorToast("Please select a bank account for the bank refund");
      return;
    }

    if (numRefundMfs > 0 && !selectedRefundMfsId) {
      showErrorToast("Please select an MFS account for the MFS refund");
      return;
    }

    setPendingPrintAfterSave(autoPrint);
    setIsConfirmModalOpen(true);
  };

  // Submit to POST /insert-purchase-return
  const handleSubmitReturn = async () => {
    setIsSubmitting(true);
    try {
      const activeLines = lines.filter((l) => l.isSelected && l.quantity > 0);
      const finalNote = note.trim() || (purchaseInvoiceNo ? `Purchase return from invoice ${purchaseInvoiceNo}` : "");

      const returnDetailsPayload = activeLines.map((l) => ({
        productId: l.productId,
        productCode: l.productCode,
        productName: l.productName,
        unit: l.unit,
        quantity: l.quantity,
        buyPrice: l.buyPrice,
        discount: l.discount || 0,
        vat: l.vat || 0,
        total: Number((l.quantity * l.buyPrice).toFixed(2)),
        returnReason: l.returnReason || "damaged_product",
      }));

      // Effective payment type
      const refundMethodsUsed =
        (numRefundCash > 0 ? 1 : 0) +
        (numRefundBank > 0 ? 1 : 0) +
        (numRefundMfs > 0 ? 1 : 0) +
        (numRefundDue > 0 ? 1 : 0);

      const effectivePaymentType =
        refundMethodsUsed > 1
          ? "MULTI"
          : numRefundDue > 0
          ? "CREDIT"
          : numRefundBank > 0
          ? "BANK"
          : numRefundMfs > 0
          ? "MFS"
          : "CASH";

      const matchedBank = registeredBankAccounts.find(
        (b) => String(b.id) === String(selectedRefundBankId)
      );
      const matchedMfs = registeredMfsAccounts.find(
        (m) => String(m.id) === String(selectedRefundMfsId)
      );

      const payload = {
        accessUser: buildAccessUser(),
        purchaseInvoiceNo,
        challanNo: selectedPurchase?.challanNo || "",
        supplierId,
        supplierName,
        supplierPhone,
        supplierAddress,
        returnDate,
        totalAmount: Number(totals.subtotal.toFixed(2)),
        discount: Number(totals.discount.toFixed(2)),
        vat: Number(totals.vat.toFixed(2)),
        deliveryCharge: 0,
        grandTotal: Number(totals.grandTotal.toFixed(2)),
        refundAmount: Number(totals.refundAmount.toFixed(2)),
        paymentType: effectivePaymentType,
        status: status || "Return",
        note: finalNote,
        refNo: `PR-${Date.now()}`,
        osType: "WEB",
        cashReceived: numRefundCash,
        cardReceived: numRefundBank,
        mfsReceived: numRefundMfs,
        dueAmount: numRefundDue,
        bankId: numRefundBank > 0 ? selectedRefundBankId : null,
        bankName: numRefundBank > 0 ? (matchedBank?.bankName || null) : null,
        accountNo: numRefundBank > 0 ? (matchedBank?.accountNo || null) : null,
        mfsId: numRefundMfs > 0 ? selectedRefundMfsId : null,
        mfsName: numRefundMfs > 0 ? (matchedMfs?.mfsName || null) : null,
        mfsPhone: numRefundMfs > 0 ? (matchedMfs?.mfsPhone || null) : null,
        returnDetails: returnDetailsPayload,
      };

      const endpoint = apiConfig.purchaseReturn.insertPurchaseReturnUrl;

      const response: any = await postData({
        url: endpoint,
        body: payload,
      });

      if (
        !response ||
        response?.error ||
        response?.status === "Error" ||
        response?.status === "Failed" ||
        (typeof response?.code === "number" && response.code >= 400)
      ) {
        const errorMsg =
          response?.msg ||
          response?.message ||
          "Failed to save purchase return. Please try again.";
        showErrorToast(errorMsg);
        setIsSubmitting(false);
        setIsConfirmModalOpen(false);
        return;
      }

      const generatedReturnNo =
        response?.returnNo ||
        response?.data?.returnNo ||
        `PR-${moment().format("YYYYMMDD")}-${Math.floor(100 + Math.random() * 900)}`;

      const createdReturnItem: PurchaseReturnItem = {
        id: Date.now(),
        returnNo: generatedReturnNo,
        purchaseInvoiceNo,
        invoiceNo: purchaseInvoiceNo,
        challanNo: selectedPurchase?.challanNo,
        supplierId,
        supplierName,
        supplierPhone,
        supplierAddress,
        returnDate,
        totalAmount: totals.subtotal,
        discount: totals.discount,
        vat: totals.vat,
        deliveryCharge: 0,
        grandTotal: totals.grandTotal,
        refundAmount: totals.refundAmount,
        paymentType: effectivePaymentType,
        cashReceived: numRefundCash,
        cardReceived: numRefundBank,
        mfsReceived: numRefundMfs,
        dueAmount: numRefundDue,
        bankId: numRefundBank > 0 ? selectedRefundBankId : undefined,
        bankName: matchedBank?.bankName,
        accountNo: matchedBank?.accountNo,
        mfsId: numRefundMfs > 0 ? selectedRefundMfsId : undefined,
        mfsName: matchedMfs?.mfsName,
        mfsPhone: matchedMfs?.mfsPhone,
        status: status || "Return",
        note: finalNote,
        remarks: finalNote,
        refNo: payload.refNo,
        osType: "WEB",
        returnDetails: returnDetailsPayload as any,
        purchaseReturnDetails: returnDetailsPayload as any,
        itemsCount: activeLines.length,
        createdAt: new Date().toISOString(),
      };

      setHasJustSubmitted(true);

      // Invalidate relevant queries (non-blocking, stale background refresh)
      queryClient.invalidateQueries({ queryKey: [purchaseAndReturnQueryKey] });
      queryClient.invalidateQueries({ queryKey: [purchaseListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [productListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [productQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "none" });

      // Post financial transaction INCOME to increase cash/bank balance for supplier refund
      if (totals.refundAmount > 0) {
        try {
          const refundTenders: TradeTender[] = [
            { amount: numRefundCash, leg: cashLeg() },
            { amount: numRefundBank, leg: bankLeg(matchedBank) },
            { amount: numRefundMfs, leg: mfsLeg(matchedMfs) },
          ].filter((t) => t.amount > 0);

          if (refundTenders.length > 0) {
            const itemSummary = activeLines.map((l) => l.productName).filter(Boolean).join(", ");
            await recordTradeLedger({
              tradeType: "INCOME",
              tenders: refundTenders,
              invoiceNo: generatedReturnNo || purchaseInvoiceNo,
              partyId: supplierId || "",
              head: "Purchase Return",
              itemsSummary: itemSummary,
              notes: finalNote,
              date: returnDate,
              totalDue: numRefundDue,
            });
          }
        } catch (ledgerErr) {
          console.error("Purchase return saved, but financial ledger posting encountered an error:", ledgerErr);
        }
      }

      showSuccessToast(
        response?.msg ||
          `Purchase Return ${generatedReturnNo} created successfully! ৳${formatMoney(
            totals.refundAmount
          )} settled.`
      );

      setIsConfirmModalOpen(false);
      setSavedReturnRecord(createdReturnItem);

      if (pendingPrintAfterSave) {
        setIsReceiptModalOpen(true);
      } else {
        navigate("/admin/purchase-return");
      }
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to process purchase return");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header Bar (Matching SalesReturn Standard) */}
      <div className="sticky top-0 z-30 bg-[var(--ui-surface-muted)] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 border-b border-[var(--ui-border)]">
        {/* Left Side: Title & Badge */}
        <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2.5 min-w-0">
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-[var(--primary-color)] flex items-center gap-1.5 shrink-0">
              <FaUndoAlt className="text-[var(--primary-color)] shrink-0" size={17} />
              <span className="truncate">Create Purchase Return</span>
            </h1>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] font-normal w-fit">
              {purchaseInvoiceNo || "N/A"}
            </span>
          </div>

          {/* Controls visible on Mobile (< lg) */}
          <div className="flex lg:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 text-xs font-normal text-[var(--ui-text-muted)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/purchase-return")}
              className="px-2.5 py-1.5 text-xs font-normal text-[var(--ui-text-muted)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Action Controls for Desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 w-full lg:w-auto">
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-normal text-[var(--ui-text-muted)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/purchase-return")}
              className="px-3 py-1.5 text-xs font-normal text-[var(--ui-text-muted)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Save & Save & Print Buttons */}
          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
            <Button
              label={
                isCurrentPurchaseAlreadyReturned
                  ? "Already Returned"
                  : isSubmitting
                  ? "Saving..."
                  : "Save Return"
              }
              onClick={() => handlePreSubmit(false)}
              color={isCurrentPurchaseAlreadyReturned ? "#9ca3af" : "var(--primary-color)"}
              disabled={isSubmitting || isCurrentPurchaseAlreadyReturned}
              buttonClass={`!text-xs !py-1.5 !w-full lg:!w-fit justify-center font-normal !text-white ${
                isCurrentPurchaseAlreadyReturned ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
            <Button
              label={
                isCurrentPurchaseAlreadyReturned
                  ? "Already Returned"
                  : isSubmitting
                  ? "Saving..."
                  : "Save & Print"
              }
              onClick={() => handlePreSubmit(true)}
              color={isCurrentPurchaseAlreadyReturned ? "#9ca3af" : "#059669"}
              disabled={isSubmitting || isCurrentPurchaseAlreadyReturned}
              buttonClass={`!text-xs !py-1.5 !w-full lg:!w-fit justify-center font-normal !text-white ${
                isCurrentPurchaseAlreadyReturned ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </div>
      </div>

      {/* Warning Banner: If already returned */}
      {isCurrentPurchaseAlreadyReturned && (
        <div className="bg-[var(--ui-danger-light)] border border-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 text-xs shadow-2xs">
          <div className="p-1.5 rounded-lg bg-[var(--ui-danger-border)] text-[var(--ui-danger)] shrink-0">
            <FaLock size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold block text-[12px] leading-tight text-[var(--ui-danger-dark)]">
              Purchase Order Already Returned
            </span>
            <span className="text-[11px] text-[var(--ui-danger-dark)] block leading-tight">
              According to company policy, a purchase order or invoice can only be returned once. This invoice has already been settled and processed for return.
            </span>
          </div>
        </div>
      )}

      {/* Section 1: Search by Order No / Purchase Invoice & Supplier Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-[var(--ui-surface)] p-2.5 sm:p-3 rounded-xl border border-[var(--ui-border)] shadow-xs">
        {/* Invoice / Order No Search Input with dropdown */}
        <div className="relative" ref={invoiceDropdownRef}>
          <label className="text-[11px] font-bold text-[var(--ui-text)] tracking-wider block mb-1">
            Search Order No / Invoice <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={invoiceSearchQuery}
              onChange={(e) => {
                setInvoiceSearchQuery(e.target.value);
                setIsInvoiceDropdownOpen(true);
              }}
              onFocus={() => setIsInvoiceDropdownOpen(true)}
              onClick={() => setIsInvoiceDropdownOpen(true)}
              placeholder="Search by Invoice (PUR-1001), Challan, Supplier..."
              className="w-full h-9 pl-3 pr-8 border border-[var(--ui-border-strong)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] focus:bg-[var(--ui-surface)] text-xs text-[var(--ui-text)] focus:outline-none focus:border-[var(--primary-color)]"
            />
            {invoiceSearchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setInvoiceSearchQuery("");
                  setSelectedPurchase(null);
                  setPurchaseInvoiceNo("");
                  setSupplierId("");
                  setSupplierName("");
                  setSupplierPhone("");
                  setSupplierAddress("");
                  setLines([]);
                  setIsInvoiceDropdownOpen(true);
                }}
                className="absolute right-2.5 text-[var(--ui-text-subtle)] hover:text-[var(--ui-text-muted)] cursor-pointer"
                title="Clear search"
              >
                <FaTimes className="text-xs" />
              </button>
            ) : (
              <FaSearch
                onClick={() => setIsInvoiceDropdownOpen(true)}
                className="absolute right-2.5 text-[var(--ui-text-subtle)] text-xs cursor-pointer hover:text-[var(--ui-text-muted)]"
              />
            )}
          </div>

          {isInvoiceDropdownOpen && (
            <div className="absolute left-0 w-[calc(100vw-32px)] sm:w-[480px] md:w-[560px] max-w-[600px] mt-1 max-h-72 overflow-y-auto bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl shadow-2xl z-50 text-xs divide-y divide-[var(--ui-border)] animate-in fade-in zoom-in-95 duration-100">
              {/* Dropdown Header */}
              <div className="sticky top-0 bg-[var(--ui-surface-muted)]/95 backdrop-blur-xs px-3 py-1.5 border-b border-[var(--ui-border)] flex items-center justify-between text-[11px] text-[var(--ui-text-muted)] font-medium z-10">
                <div className="flex items-center gap-1.5">
                  <FaFileInvoice className="text-[var(--primary-color)]" size={11} />
                  <span>Available Purchase Orders ({filteredInvoices.length})</span>
                </div>
                <span className="text-[10px] text-[var(--ui-text-subtle)]">Select order to return</span>
              </div>

              {isLoadingInvoices ? (
                <div className="px-4 py-5 text-center text-[var(--ui-text-muted)] text-xs flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading purchase orders...</span>
                </div>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.invoiceNo || inv.id}
                    onClick={() => {
                      loadInvoice(inv);
                      setIsInvoiceDropdownOpen(false);
                    }}
                    className="px-3 py-2 hover:bg-[var(--primary-color-light)]/70 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-[var(--ui-text)] text-xs truncate">
                          {inv.invoiceNo || `PUR-${inv.id}`}
                        </span>
                        {inv.challanNo && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--ui-surface-sunken)] text-[var(--ui-text-muted)] font-normal">
                            Challan: {inv.challanNo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--ui-text-muted)]">
                        <span className="truncate">
                          Supplier: {inv.supplierName || (inv as any).supplier_name || "N/A"}
                        </span>
                        {(inv.supplierPhone || (inv as any).supplier_phone) && (
                          <span>• {inv.supplierPhone || (inv as any).supplier_phone}</span>
                        )}
                        <span>
                          •{" "}
                          {inv.purchaseDate
                            ? moment(inv.purchaseDate).format("DD MMM, YYYY")
                            : moment().format("DD MMM, YYYY")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-[var(--primary-color)] text-xs block">
                        ৳ {formatMoney(Number(inv.grandTotal ?? 0))}
                      </span>
                      {Number(inv.dueAmount || 0) > 0 && (
                        <span className="text-[10px] text-[var(--ui-danger)] font-semibold block">
                          Due: ৳ {formatMoney(Number(inv.dueAmount))}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-5 text-center text-[var(--ui-text-subtle)] text-xs">
                  No eligible purchase orders found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Return Date */}
        <div>
          <label className="text-[11px] font-bold text-[var(--ui-text)] tracking-wider block mb-1">
            Return Date <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <DatePicker
            value={returnDate}
            onChange={(dateStr) => setReturnDate(dateStr || moment().format("YYYY-MM-DD"))}
            size="md"
            isClearable={false}
            displayFormat="DD MMM, YYYY"
            placeholder="Select return date"
          />
        </div>

        {/* Supplier Details */}
        <TextInput
          label="Supplier"
          readOnly
          disabled
          value={
            supplierName
              ? supplierPhone
                ? `${supplierName} • ${supplierPhone}`
                : supplierName
              : "N/A"
          }
          placeholder="N/A"
          wrapperClass="!h-9 bg-[var(--ui-surface-muted)] !border-[var(--ui-border)]"
          inputClass="font-normal text-[var(--ui-text)] cursor-default truncate"
        />

        {/* Refund / Settlement Type */}
        <TextInput
          label="Refund / Settlement Type"
          required
          readOnly
          disabled
          value={
            selectedPurchase
              ? origPaymentMode === "CASH"
                ? "Cash Refund"
                : origPaymentMode === "CREDIT"
                ? "Credit (Due Adjustment)"
                : origPaymentMode === "MFS"
                ? `MFS (${selectedPurchase.mfsName || "bKash / Nagad"})`
                : origPaymentMode === "BANK"
                ? `Bank (${selectedPurchase.bankName || "Transfer"})`
                : origPaymentMode
              : "N/A"
          }
          placeholder="N/A"
          wrapperClass="!h-9 bg-[var(--ui-surface-muted)] !border-[var(--ui-border)]"
          inputClass="font-normal text-[var(--ui-text)] cursor-default truncate"
        />
      </div>

      {/* Supplier's Original Payment Breakdown Banner */}
      {selectedPurchase && (
        <div className="bg-[var(--primary-color-light)]/50 border border-[var(--primary-color-muted)] rounded-xl p-2 sm:p-2.5 flex flex-col gap-1.5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-[var(--primary-color-muted)]">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-[var(--primary-color-light)] text-[var(--primary-color)] shrink-0">
                <FaMoneyBillWave size={12} />
              </div>
              <span className="font-bold text-[var(--ui-text)] block text-[11px] sm:text-xs leading-tight">
                Supplier's Original Payment Breakdown
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--ui-text-muted)] font-medium">Invoice Method:</span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                  origPaymentMode === "CASH"
                    ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border border-[var(--ui-success-border)]"
                    : origPaymentMode === "CREDIT"
                    ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border border-[var(--ui-danger-border)]"
                    : origPaymentMode === "BANK"
                    ? "bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border border-[var(--primary-color-muted)]"
                    : origPaymentMode === "MFS"
                    ? "bg-[var(--ui-info-border)] text-[var(--ui-info-dark)] border border-[var(--ui-info-border)]"
                    : "bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border border-[var(--primary-color-muted)]"
                }`}
              >
                {origPaymentMode}
              </span>
            </div>
          </div>

          {/* Cards for each channel paid with */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {/* Total Purchase Amount */}
            <div className="p-1.5 sm:p-2 rounded-lg border border-[var(--primary-color-muted)] bg-gradient-to-b from-[var(--primary-color-light)]/50 to-[var(--ui-surface)] shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--ui-text)] mb-0.5">
                <span className="flex items-center gap-1 text-[var(--ui-text)]">
                  <FaFileInvoice className="text-[var(--primary-color)] text-[10px]" />
                  Total Purchase
                </span>
              </div>
              <div className="font-semibold text-[var(--ui-text)] text-xs sm:text-[13px] leading-tight">
                ৳ {formatMoney(origGrandTotal)}
              </div>
            </div>

            {/* Cash Paid */}
            <div
              className={`p-1.5 sm:p-2 rounded-lg border bg-gradient-to-b from-[var(--ui-success-light)]/40 to-[var(--ui-surface)] shadow-2xs flex flex-col justify-between ${
                origCashPaid > 0 ? "border-[var(--ui-success-border)]" : "border-[var(--ui-border)] opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--ui-text)] mb-0.5">
                <span className="flex items-center gap-1 text-[var(--ui-text)]">
                  <FaMoneyBillWave className="text-[var(--ui-success)] text-[10px]" />
                  Cash Paid
                </span>
              </div>
              <div className="font-normal text-[var(--ui-text)] text-xs sm:text-[13px] leading-tight">
                {origCashPaid > 0 ? `৳ ${formatMoney(origCashPaid)}` : "N/A"}
              </div>
            </div>

            {/* Bank Paid */}
            <div
              className={`p-1.5 sm:p-2 rounded-lg border bg-gradient-to-b from-[var(--primary-color-light)]/40 to-[var(--ui-surface)] shadow-2xs flex flex-col justify-between ${
                origBankPaid > 0 ? "border-[var(--primary-color-muted)]" : "border-[var(--ui-border)] opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--ui-text)] mb-0.5">
                <span className="flex items-center gap-1 text-[var(--ui-text)]">
                  <FaCreditCard className="text-[var(--primary-color)] text-[10px]" />
                  Bank Paid
                </span>
                {selectedPurchase.bankName && (
                  <span
                    className="text-[9.5px] text-[var(--ui-text)] bg-[var(--primary-color-muted)]/70 px-1 rounded font-normal truncate max-w-[85px]"
                    title={selectedPurchase.bankName}
                  >
                    {selectedPurchase.bankName}
                  </span>
                )}
              </div>
              <div className="font-normal text-[var(--ui-text)] text-xs sm:text-[13px] leading-tight">
                {origBankPaid > 0 ? `৳ ${formatMoney(origBankPaid)}` : "N/A"}
              </div>
            </div>

            {/* MFS Paid */}
            <div
              className={`p-1.5 sm:p-2 rounded-lg border bg-gradient-to-b from-[var(--ui-info-light)]/40 to-[var(--ui-surface)] shadow-2xs flex flex-col justify-between ${
                origMfsPaid > 0 ? "border-[var(--ui-info-border)]" : "border-[var(--ui-border)] opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--ui-text)] mb-0.5">
                <span className="flex items-center gap-1 text-[var(--ui-text)]">
                  <FaMobileAlt className="text-[var(--ui-info)] text-[10px]" />
                  MFS Paid
                </span>
                {(selectedPurchase.mfsName || selectedPurchase.mfsPhone) && (
                  <span
                    className="text-[9.5px] text-[var(--ui-text)] bg-[var(--ui-info-border)]/70 px-1 rounded font-normal truncate max-w-[85px]"
                    title={`${selectedPurchase.mfsName || ""} ${selectedPurchase.mfsPhone || ""}`}
                  >
                    {selectedPurchase.mfsName || selectedPurchase.mfsPhone}
                  </span>
                )}
              </div>
              <div className="font-normal text-[var(--ui-text)] text-xs sm:text-[13px] leading-tight">
                {origMfsPaid > 0 ? `৳ ${formatMoney(origMfsPaid)}` : "N/A"}
              </div>
            </div>

            {/* Due Balance */}
            <div
              className={`p-1.5 sm:p-2 rounded-lg border bg-gradient-to-b from-[var(--ui-danger-light)]/40 to-[var(--ui-surface)] shadow-2xs flex flex-col justify-between ${
                origDueAmount > 0 ? "border-[var(--ui-danger-border)]" : "border-[var(--ui-border)] opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--ui-text)] mb-0.5">
                <span className="flex items-center gap-1 text-[var(--ui-text)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-danger)] inline-block" />
                  Due Balance
                </span>
              </div>
              <div className="font-normal text-[var(--ui-text)] text-xs sm:text-[13px] leading-tight">
                {origDueAmount > 0 ? `৳ ${formatMoney(origDueAmount)}` : "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Return Items Table with Full vs Partial Mode */}
      <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-xs overflow-hidden">
        {/* Return Mode Selection Toolbar */}
        <div className="p-2 sm:px-3 border-b border-[var(--ui-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FaBoxes className="text-[var(--primary-color)] text-xs" />
            <span className="text-xs font-normal text-[var(--ui-text)] tracking-wider">
              Return Type:
            </span>
            <div className="inline-flex rounded-lg border border-[var(--ui-border)] p-0.5 bg-[var(--ui-surface-muted)] text-xs">
              <button
                type="button"
                onClick={() => handleSetReturnMode("FULL")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-normal transition-all cursor-pointer ${
                  returnMode === "FULL"
                    ? "bg-[var(--primary-color)] text-white shadow-xs"
                    : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                }`}
              >
                Full Return
              </button>
              <button
                type="button"
                onClick={() => handleSetReturnMode("PARTIAL")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-normal transition-all cursor-pointer ${
                  returnMode === "PARTIAL"
                    ? "bg-[var(--primary-color)] text-white shadow-xs"
                    : "text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                }`}
              >
                Partial Return
              </button>
            </div>
          </div>

          {/* Quick Buttons: Clear All & Selected Summary */}
          <div className="flex items-center gap-1.5">
            {returnMode === "PARTIAL" && (
              <button
                type="button"
                onClick={handleClearAllQty}
                className="px-2 py-0.5 text-[11px] font-normal text-[var(--ui-text-muted)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] rounded transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <span className="text-xs text-[var(--ui-text)] pl-1.5 border-l border-[var(--ui-border)]">
              Selected:{" "}
              <span className="text-[var(--ui-text)] font-normal">
                {totals.selectedItemCount} items ({totals.totalPieces} pcs)
              </span>
            </span>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="py-8 text-center text-[var(--ui-text-subtle)] text-xs">
            Please search and select a purchase invoice / order number above to load items.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-[var(--ui-accent-2)] text-[var(--ui-text)] border-b border-[var(--ui-border)] text-[11px] font-semibold shadow-xs">
                  <th className="py-2 px-3 text-center w-10 whitespace-nowrap">Select</th>
                  <th className="py-2 px-3 min-w-[200px]">Product Description</th>
                  <th className="py-2 px-2 text-center w-16 whitespace-nowrap">Unit</th>
                  <th className="py-2 px-2 text-center w-24 whitespace-nowrap">Purchased Qty</th>
                  <th className="py-2 px-2 text-center w-28 whitespace-nowrap">Available Qty</th>
                  <th className="py-2 px-2 text-center w-36 whitespace-nowrap">Return Qty</th>
                  <th className="py-2 px-2 text-left min-w-[190px] whitespace-nowrap">Return Reason</th>
                  <th className="py-2 px-2 text-right w-28 whitespace-nowrap">Buy Price (৳)</th>
                  <th className="py-2 px-3 text-right w-28 whitespace-nowrap">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ui-border)]">
                {lines.map((line, idx) => {
                  const isFullyReturned = line.availableQuantity <= 0;
                  return (
                    <tr
                      key={idx}
                      className={`${
                        isFullyReturned
                          ? "bg-[var(--ui-surface-sunken)]/70 opacity-60"
                          : line.isSelected
                          ? "bg-[var(--ui-surface)]"
                          : "bg-[var(--ui-surface-muted)]/50 opacity-70"
                      } hover:bg-[var(--primary-color-light)]/30 transition-colors`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          disabled={isFullyReturned || isCurrentPurchaseAlreadyReturned || returnMode === "FULL"}
                          checked={line.isSelected}
                          onChange={() => handleToggleLine(idx)}
                          title={
                            returnMode === "FULL"
                              ? "All items are included in Full Return mode. Select Partial Return to modify."
                              : undefined
                          }
                          className="rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)] cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Product */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-normal text-[var(--ui-text)] text-xs whitespace-nowrap">
                          <span className="font-normal text-[var(--ui-text)]">{line.productName || "N/A"}</span>
                          <span className="text-[10px] text-[var(--ui-text)] font-normal">
                            ({line.productCode || "N/A"})
                          </span>
                          {isFullyReturned && (
                            <span className="text-[10px] bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border border-[var(--ui-danger-border)] px-1.5 py-0.5 rounded font-medium ml-1">
                              Fully Returned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className="text-[var(--ui-text)] bg-[var(--ui-surface-sunken)] px-1.5 py-0.5 rounded text-[11px] font-normal">
                          {line.unit || "N/A"}
                        </span>
                      </td>

                      {/* Purchased Qty */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <span className="text-[var(--ui-text)] bg-[var(--ui-surface-sunken)] px-2 py-0.5 rounded text-[11px] font-medium">
                            {line.purchasedQuantity}
                          </span>
                          {line.alreadyReturnedQty > 0 && (
                            <span
                              title={`${line.alreadyReturnedQty} pcs previously returned`}
                              className="text-[10px] text-[var(--ui-warning-dark)] bg-[var(--ui-warning-light)] border border-[var(--ui-warning-border)] px-1.5 py-0.5 rounded font-medium"
                            >
                              ({line.alreadyReturnedQty} ret)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Available Qty */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {isFullyReturned ? (
                          <span className="text-[var(--ui-danger-dark)] bg-[var(--ui-danger-light)] border border-[var(--ui-danger-border)] px-2.5 py-0.5 rounded text-[11px] font-bold">
                            0
                          </span>
                        ) : (
                          <span className="text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] border border-[var(--ui-success-border)] px-2.5 py-0.5 rounded text-[11px] font-bold">
                            {line.availableQuantity}
                          </span>
                        )}
                      </td>

                      {/* Return Qty with Steppers and Full Button */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {isFullyReturned || isCurrentPurchaseAlreadyReturned ? (
                          <span className="text-[var(--ui-text)] text-xs font-normal">
                            N/A
                          </span>
                        ) : returnMode === "FULL" ? (
                          <div
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] border border-[var(--ui-border)] rounded text-xs font-normal cursor-not-allowed select-none"
                            title="Full Return mode: Quantities are fixed to full available quantity. Select Partial Return to change."
                          >
                            <span>{line.quantity}</span>
                            <span className="text-[10px] text-[var(--ui-text)] font-normal">({line.unit || "N/A"})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center border border-[var(--ui-border-strong)] rounded overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, line.quantity - 1)}
                              disabled={line.quantity <= 0 || isCurrentPurchaseAlreadyReturned}
                              className="px-2 py-1 bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text)] font-normal text-xs disabled:opacity-40 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={line.availableQuantity}
                              value={line.quantity}
                              disabled={isCurrentPurchaseAlreadyReturned}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) =>
                                handleQuantityChange(idx, Number(e.target.value))
                              }
                              className="w-12 py-1 text-center text-xs font-normal text-[var(--ui-text)] focus:outline-none border-x border-[var(--ui-border-strong)] disabled:bg-[var(--ui-surface-sunken)] disabled:text-[var(--ui-text)]"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, line.quantity + 1)}
                              disabled={line.quantity >= line.availableQuantity || isCurrentPurchaseAlreadyReturned}
                              className="px-2 py-1 bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text)] font-normal text-xs disabled:opacity-40 cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetLineFullQty(idx)}
                              disabled={isCurrentPurchaseAlreadyReturned}
                              className="px-2 py-1 bg-[var(--primary-color-light)] hover:bg-[var(--primary-color-muted)] text-[var(--primary-color)] font-bold text-[10px] border-l border-[var(--ui-border-strong)] cursor-pointer disabled:opacity-40"
                              title="Return all available quantity"
                            >
                              Full
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Return Reason */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <select
                          disabled={isFullyReturned || !line.isSelected || isCurrentPurchaseAlreadyReturned}
                          value={line.returnReason || "damaged_product"}
                          onChange={(e) => handleReturnReasonChange(idx, e.target.value)}
                          className="w-full min-w-[175px] h-7 px-2 text-[11px] border border-[var(--ui-border-strong)] rounded bg-[var(--ui-surface)] text-[var(--ui-text)] font-semibold focus:outline-none focus:border-[var(--primary-color)] disabled:bg-[var(--ui-surface-sunken)] disabled:text-[var(--ui-text)] cursor-pointer disabled:cursor-not-allowed"
                        >
                          {PURCHASE_RETURN_REASONS.map((r) => (
                            <option key={r.value} value={r.value} className="text-[var(--ui-text)] font-semibold">
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Buy Price */}
                      <td className="py-2 px-2 text-right whitespace-nowrap font-normal text-[var(--ui-text)] text-xs">
                        ৳ {formatMoney(line.buyPrice)}
                      </td>

                      {/* Total */}
                      <td className="py-2 px-3 text-right whitespace-nowrap font-normal text-[var(--ui-text)] text-xs">
                        ৳ {formatMoney(line.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Notes & Financial Summary (Clean 2-Column ERP Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Column (span-5): Return Notes, Presets & Stock Info */}
        <div className="lg:col-span-5 bg-[var(--ui-surface)] p-3 sm:p-3.5 rounded-xl border border-[var(--ui-border)] shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--ui-border)]">
            <label className="text-[11px] font-normal text-[var(--ui-text)] tracking-wider">
              Return Note & Remarks
            </label>
            <span className="text-[10px] text-[var(--ui-text)] font-normal">Internal Record</span>
          </div>

          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type notes or remarks about return reason, supplier credit agreement, condition..."
            className="w-full p-2.5 text-xs border border-[var(--ui-border-strong)] rounded-lg focus:outline-none focus:border-[var(--primary-color)] resize-none leading-relaxed text-[var(--ui-text)] placeholder:text-[var(--ui-text-subtle)] bg-[var(--ui-surface-muted)]/30 hover:bg-[var(--ui-surface)] focus:bg-[var(--ui-surface)] transition-colors font-normal"
          />

          {/* Quick preset remarks */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[var(--ui-text)] font-normal">Quick:</span>
            {[
              "Damaged on delivery",
              "Wrong item received",
              "Defective goods",
              "Due balance adjusted",
              "Full refund received",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setNote((prev) => {
                    if (!prev.trim()) return preset;
                    if (prev.includes(preset)) return prev;
                    return `${prev}, ${preset}`;
                  });
                }}
                className="px-2 py-0.5 text-[10px] rounded-md bg-[var(--ui-surface-sunken)] hover:bg-[var(--primary-color-light)] hover:text-[var(--primary-color)] text-[var(--ui-text)] border border-[var(--ui-border)] transition-colors cursor-pointer font-normal"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column (span-7): Payment Refunded Section */}
        <div className="lg:col-span-7 bg-[var(--ui-surface)] p-2.5 sm:p-3 rounded-xl border border-[var(--ui-border)] shadow-xs flex flex-col gap-2">
          <TradeRefundSection
            refund={refund}
            refundAmount={totals.refundAmount}
            registeredBankAccounts={registeredBankAccounts}
            registeredMfsAccounts={registeredMfsAccounts}
            title="Payment Refunded"
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleSubmitReturn}
        title="Confirm Purchase Return"
        message={`Are you sure you want to process return for purchase invoice ${purchaseInvoiceNo}? Total refund of ৳${formatMoney(
          totals.refundAmount
        )} will be settled via ${
          numRefundCash > 0 && (numRefundBank > 0 || numRefundMfs > 0 || numRefundDue > 0)
            ? "Split / Multi-Channel"
            : numRefundDue > 0
            ? "Due Adjustment"
            : numRefundBank > 0
            ? "Bank"
            : numRefundMfs > 0
            ? "MFS"
            : "Cash"
        }.`}
        isLoading={isSubmitting}
      />

      {/* Printable Receipt Preview Modal */}
      <PurchaseReturnInvoiceModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          navigate("/admin/purchase-return");
        }}
        returnData={savedReturnRecord}
        autoPrint={true}
      />
    </div>
  );
};

export default PurchaseReturnForm;