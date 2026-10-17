import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import {
  FaCheck,
  FaPrint,
  FaSearch,
  FaFileInvoice,
  FaBoxes,
  FaUndoAlt,
  FaTimes,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
} from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";
import Button from "@/components/button/Button";
import ConfirmModal from "@/components/modal/ConfirmModal";
import SalesReturnInvoiceModal from "@/pages/admin/trade/sales-return/components/SalesReturnInvoiceModal";
import apiConfig from "@/config/api.json";
import {
  salesAndReturnQueryKey,
  salesListQueryKey,
  productListQueryKey,
  productQueryKey,
  partyListQueryKey,
  dashboardQueryKey,
} from "@/config/query-key";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import { cashLeg, bankLeg, mfsLeg, type TradeTender } from "@/services/financial-ledger-service";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { SaleItem, SalesReturnItem } from "@/types";
import { RETURN_REASONS } from "@/pages/admin/trade/sales-return/constants/returnReasons";
import {
  useSalesAndReturnsQuery,
  useSalesQuery,
} from "@/pages/admin/trade/sales-return/hooks/useSalesReturnQueries";
import { useTradeRefund } from "@/hooks/useTradeRefund";
import TradeRefundSection from "@/components/trade/TradeRefundSection";

interface ReturnLineFormState {
  productId: string | number;
  productCode: string;
  productName: string;
  unit: string;
  soldQuantity: number;
  alreadyReturnedQty: number;
  availableQuantity: number;
  quantity: number;
  sellPrice: number;
  discount: number;
  vat: number;
  deliveryCharge: number;
  total: number;
  returnReason?: string;
  isSelected: boolean;
}

export const SalesReturnForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const stateSale: SaleItem | undefined = (location.state as any)?.sale;

  // Selected Sale & Basic Return Info
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(stateSale || null);
  const [salesInvoiceNo, setSalesInvoiceNo] = useState<string>(stateSale?.invoiceNo || "");
  const [returnDate, setReturnDate] = useState<string>(() => moment().format("YYYY-MM-DD"));
  const [customerId, setCustomerId] = useState<string | number>(stateSale?.customerId || "");
  const [customerName, setCustomerName] = useState<string>(stateSale?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState<string>(stateSale?.customerPhone || "");
  const [customerAddress, setCustomerAddress] = useState<string>(stateSale?.customerAddress || "");
  const [paymentType, setPaymentType] = useState<string>("CASH");
  const status = "Return";
  const [note, setNote] = useState<string>("");

  // Return Mode: "FULL" (all items & full qty) vs "PARTIAL" (selected items / partial qty)
  const [returnMode, setReturnMode] = useState<"FULL" | "PARTIAL">("PARTIAL");

  // Product Lines
  const [lines, setLines] = useState<ReturnLineFormState[]>([]);

  // Financials
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>("");
  const [invoiceVat, setInvoiceVat] = useState<string>("");
  const [invoiceDeliveryCharge, setInvoiceDeliveryCharge] = useState<string>("");


  // Search & Dropdown
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState<boolean>(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("");
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // Submission & Modals
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [pendingPrintAfterSave, setPendingPrintAfterSave] = useState<boolean>(false);
  const [savedReturnRecord, setSavedReturnRecord] = useState<SalesReturnItem | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [hasJustSubmitted, setHasJustSubmitted] = useState<boolean>(false);

  // 1. Fetch sales and returns from shared TanStack Query cache (zero waterfall, instant cache hits)
  const { data: apiSalesAndReturnData, isLoading: isLoadingReturns } = useSalesAndReturnsQuery();
  const { data: salesData, isLoading: isLoadingSales } = useSalesQuery();
  const isLoadingInvoices = isLoadingReturns || isLoadingSales;

  // 2. Fetch registered Bank and MFS accounts for refund disbursement (Shared cache with 5-minute staleTime)
  const { registeredBankAccounts, registeredMfsAccounts } = useFinancialAccounts();
  const { recordTradeLedger } = useFinancialLedger();

  const availableInvoices: SaleItem[] = useMemo(() => {
    const combinedCandidates: any[] = [];
    const seenKeys = new Set<string>();

    const addCandidate = (item: any) => {
      if (!item) return;
      const key = String(
        item.salesInvoiceNo ||
        item.invoiceNo ||
        item.id ||
        ""
      ).trim().toLowerCase();
      if (key && seenKeys.has(key)) return;
      if (key) seenKeys.add(key);
      combinedCandidates.push(item);
    };

    if (Array.isArray(salesData)) {
      salesData.forEach(addCandidate);
    }
    if (Array.isArray(apiSalesAndReturnData)) {
      apiSalesAndReturnData.forEach(addCandidate);
    }

    return combinedCandidates.filter((item: any) => {
      const hasDetails =
        (Array.isArray(item.salesDetails) && item.salesDetails.length > 0) ||
        (Array.isArray(item.saleDetails) && item.saleDetails.length > 0) ||
        (Array.isArray(item.details) && item.details.length > 0);
      return hasDetails;
    });
  }, [salesData, apiSalesAndReturnData]);

  const cleanKey = (val: any) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  // Pre-indexed returns and returned sale lookup for O(1) checks
  const { returnedSaleKeysSet, returnsBySaleKey } = useMemo(() => {
    const keysSet = new Set<string>();
    const returnsMap = new Map<string, any[]>();
    const allRecords = Array.isArray(apiSalesAndReturnData) ? apiSalesAndReturnData : [];

    allRecords.forEach((item: any) => {
      const isReturnRecord =
        Boolean(item.hasReturn) ||
        Boolean(item.returnNo) ||
        Boolean(item.returnGrandTotal) ||
        String(item.returnType || "").toUpperCase() === "RETURN" ||
        String(item.status || "").toUpperCase() === "RETURN" ||
        (item.refNo && String(item.refNo).startsWith("SR-")) ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.salesReturnDetails) && item.salesReturnDetails.length > 0);

      const addIndex = (prefix: string, keyVal: string, record: any) => {
        if (!keyVal) return;
        const compKey = `${prefix}:${keyVal}`;
        keysSet.add(compKey);
        const list = returnsMap.get(compKey) || [];
        list.push(record);
        returnsMap.set(compKey, list);
      };

      if (isReturnRecord) {
        const itemInv = cleanKey(item.salesInvoiceNo || item.invoiceNo);
        const itemOrd = cleanKey(item.orderNo);
        // NOTE: Only use item.saleId. NEVER use item.id because item.id is the return record ID!
        const itemSaleId = cleanKey(item.saleId);

        addIndex("inv", itemInv, item);
        addIndex("ord", itemOrd, item);
        addIndex("sid", itemSaleId, item);
      } else if (
        item.hasReturn ||
        (Array.isArray(item.returns) && item.returns.length > 0) ||
        (Array.isArray(item.salesReturns) && item.salesReturns.length > 0)
      ) {
        const inv = cleanKey(item.invoiceNo || item.salesInvoiceNo);
        const ord = cleanKey(item.orderNo);
        const sid = cleanKey(item.saleId || item.id);

        if (inv) keysSet.add(`inv:${inv}`);
        if (ord) keysSet.add(`ord:${ord}`);
        if (sid) keysSet.add(`sid:${sid}`);
      }
    });

    return { returnedSaleKeysSet: keysSet, returnsBySaleKey: returnsMap };
  }, [apiSalesAndReturnData]);

  // Fast O(1) check if a sale has already been returned
  const isSaleAlreadyReturned = useCallback((sale: any): boolean => {
    if (!sale) return false;
    if (sale.hasReturn || sale.returnNo) return true;
    if (String(sale.returnType || "").toUpperCase() === "RETURN") return true;
    if (Array.isArray(sale.returnDetails) && sale.returnDetails.length > 0) return true;
    if (Array.isArray(sale.salesReturnDetails) && sale.salesReturnDetails.length > 0) return true;
    if (Array.isArray(sale.returns) && sale.returns.length > 0) return true;
    if (Array.isArray(sale.salesReturns) && sale.salesReturns.length > 0) return true;

    const inv = cleanKey(sale.invoiceNo || sale.salesInvoiceNo);
    if (inv && returnedSaleKeysSet.has(`inv:${inv}`)) return true;

    const ord = cleanKey(sale.orderNo);
    if (ord && returnedSaleKeysSet.has(`ord:${ord}`)) return true;

    const sid = cleanKey(sale.saleId || sale.id);
    if (sid && returnedSaleKeysSet.has(`sid:${sid}`)) return true;

    return false;
  }, [returnedSaleKeysSet]);

  // Helper to calculate already returned quantities using exact-match indexing
  const getReturnedQuantitiesForSale = useCallback((sale: SaleItem): Record<string, number> => {
    const invClean = cleanKey(sale.invoiceNo || sale.salesInvoiceNo);
    const ordClean = cleanKey(sale.orderNo);
    const saleIdClean = cleanKey(sale.saleId || sale.id);

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
    if (invClean && returnsBySaleKey.has(`inv:${invClean}`)) {
      returnsBySaleKey.get(`inv:${invClean}`)?.forEach((r) => matchedReturns.add(r));
    }
    if (ordClean && returnsBySaleKey.has(`ord:${ordClean}`)) {
      returnsBySaleKey.get(`ord:${ordClean}`)?.forEach((r) => matchedReturns.add(r));
    }
    if (saleIdClean && returnsBySaleKey.has(`sid:${saleIdClean}`)) {
      returnsBySaleKey.get(`sid:${saleIdClean}`)?.forEach((r) => matchedReturns.add(r));
    }

    matchedReturns.forEach((r) => {
      processDetailsList(r.returnDetails || r.salesReturnDetails || r.details);
    });

    if (Array.isArray(sale.returnDetails)) {
      processDetailsList(sale.returnDetails);
    }
    if (Array.isArray((sale as any).salesReturnDetails)) {
      processDetailsList((sale as any).salesReturnDetails);
    }
    if (Array.isArray((sale as any).returns)) {
      (sale as any).returns.forEach((r: any) => {
        processDetailsList(r.returnDetails || r.salesReturnDetails || r.details);
      });
    }
    if (Array.isArray((sale as any).salesReturns)) {
      (sale as any).salesReturns.forEach((r: any) => {
        processDetailsList(r.returnDetails || r.salesReturnDetails || r.details);
      });
    }

    return returnedQtyMap;
  }, [returnsBySaleKey]);

  const isCurrentSaleAlreadyReturned = useMemo(() => {
    if (!selectedSale) return false;
    if (hasJustSubmitted) return false;
    return isSaleAlreadyReturned(selectedSale);
  }, [selectedSale, hasJustSubmitted, isSaleAlreadyReturned]);

  // Load sale into form and configure customer payment & refund suggestion
  const loadInvoice = useCallback((sale: SaleItem) => {
    setSelectedSale(sale);
    const invNo = sale.invoiceNo || `INV-${sale.id}`;
    setSalesInvoiceNo(invNo);
    setInvoiceSearchQuery(sale.orderNo ? `${invNo} (${sale.orderNo})` : invNo);
    setCustomerId(sale.customerId || "");
    setCustomerName(sale.customerName || sale.customer_name || "");
    setCustomerPhone(sale.customerPhone || sale.customer_phone || "");
    setCustomerAddress(sale.customerAddress || sale.customer_address || "");
    // Keep note empty so only user-specified reasons/remarks appear
    setNote("");

    const details: any[] =
      Array.isArray(sale.salesDetails) && sale.salesDetails.length > 0
        ? sale.salesDetails
        : Array.isArray(sale.saleDetails) && sale.saleDetails.length > 0
        ? sale.saleDetails
        : Array.isArray(sale.details)
        ? sale.details
        : [];

    const returnedMap = getReturnedQuantitiesForSale(sale);

    if (details.length > 0) {
      const formattedLines: ReturnLineFormState[] = details.map((d: any) => {
        const soldQty = Number(d.quantity ?? d.qty ?? 1);
        const p = Number(d.sellPrice ?? d.unitPrice ?? d.price ?? 0);

        const pId = String(d.productId ?? d.id ?? "").trim();
        const pCode = String(d.productCode ?? d.pcode ?? "").trim();
        const pName = String(d.productName ?? d.name ?? "Product").trim();
        const baseName = pName.toLowerCase().split(/[(/[-]/)[0].trim();

        const directReturned = Number(
          d.returnedQuantity ??
          d.returnQuantity ??
          0
        );

        const matchedFromReturns = Math.max(
          pId ? (returnedMap[`id_${pId}`] || 0) : 0,
          pCode ? (returnedMap[`code_${pCode.toLowerCase()}`] || 0) : 0,
          pName ? (returnedMap[`name_${pName.toLowerCase()}`] || 0) : 0,
          baseName ? (returnedMap[`basename_${baseName}`] || 0) : 0
        );

        const alreadyReturned = Math.min(soldQty, Math.max(directReturned, matchedFromReturns));
        const availableQty = Math.max(0, soldQty - alreadyReturned);

        const initialReturnQty = availableQty > 0 ? (availableQty >= 1 ? 1 : availableQty) : 0;
        const initialSelected = availableQty > 0;

        return {
          productId: pId,
          productCode: pCode,
          productName: pName,
          unit: d.unit || "pcs",
          soldQuantity: soldQty,
          alreadyReturnedQty: alreadyReturned,
          availableQuantity: availableQty,
          quantity: initialReturnQty,
          sellPrice: p,
          discount: 0,
          vat: 0,
          deliveryCharge: 0,
          total: p * initialReturnQty,
          returnReason: "wrong_order",
          isSelected: initialSelected,
        };
      });
      setLines(formattedLines);
      setReturnMode("PARTIAL");
    } else {
      setLines([]);
    }
  }, [getReturnedQuantitiesForSale]);

  useEffect(() => {
    if (stateSale && !hasJustSubmitted) {
      const alreadyReturned = isSaleAlreadyReturned(stateSale);
      if (alreadyReturned) {
        showErrorToast(`Order #${stateSale.orderNo || stateSale.invoiceNo} has already been returned.`);
        navigate("/admin/sales");
        return;
      }
      loadInvoice(stateSale);
    }
  }, [stateSale, isSaleAlreadyReturned, loadInvoice, hasJustSubmitted, navigate]);

  // Keep line available quantities in sync if apiSalesAndReturnData updates in background
  useEffect(() => {
    if (selectedSale) {
      setLines((prevLines) => {
        if (prevLines.length === 0) return prevLines;
        const returnedMap = getReturnedQuantitiesForSale(selectedSale);

        return prevLines.map((line) => {
          const pId = String(line.productId).trim();
          const pCode = String(line.productCode).trim();
          const pName = String(line.productName).trim().toLowerCase();
          const baseName = pName.split(/[(/[-]/)[0].trim();

          const matchedFromReturns = Math.max(
            pId ? (returnedMap[`id_${pId}`] || 0) : 0,
            pCode ? (returnedMap[`code_${pCode.toLowerCase()}`] || 0) : 0,
            pName ? (returnedMap[`name_${pName}`] || 0) : 0,
            baseName ? (returnedMap[`basename_${baseName}`] || 0) : 0
          );

          const alreadyReturned = Math.min(
            line.soldQuantity,
            Math.max(line.alreadyReturnedQty, matchedFromReturns)
          );
          const availableQty = Math.max(0, line.soldQuantity - alreadyReturned);
          const clampedQty = Math.min(line.quantity, availableQty);

          return {
            ...line,
            alreadyReturnedQty: alreadyReturned,
            availableQuantity: availableQty,
            quantity: clampedQty,
            isSelected: availableQty > 0 && line.isSelected,
            total: clampedQty * line.sellPrice,
          };
        });
      });
    }
  }, [apiSalesAndReturnData, selectedSale, getReturnedQuantitiesForSale]);

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

  // Pre-filter unreturned sales once whenever availableInvoices or isSaleAlreadyReturned updates
  const unreturnedInvoices = useMemo(() => {
    return availableInvoices.filter((inv) => !isSaleAlreadyReturned(inv));
  }, [availableInvoices, isSaleAlreadyReturned]);

  // Instant keystroke search: O(N) single loop with zero regex or nested lookups
  const filteredInvoices = useMemo(() => {
    const q = invoiceSearchQuery.toLowerCase().trim();
    if (!q) return unreturnedInvoices;

    return unreturnedInvoices.filter((inv) => {
      const ordNo = String(inv.orderNo || "").toLowerCase();
      const invNo = String(inv.invoiceNo || "").toLowerCase();
      const cName = String(inv.customerName || "").toLowerCase();
      const cPhone = String(inv.customerPhone || "").toLowerCase();
      return (
        ordNo.includes(q) ||
        invNo.includes(q) ||
        cName.includes(q) ||
        cPhone.includes(q)
      );
    });
  }, [unreturnedInvoices, invoiceSearchQuery]);

  // Recalculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let selectedItemCount = 0;
    let totalPieces = 0;

    lines.forEach((line) => {
      if (line.isSelected && line.quantity > 0) {
        subtotal += line.quantity * line.sellPrice;
        selectedItemCount++;
        totalPieces += line.quantity;
      }
    });

    const disc = Number(invoiceDiscount) || 0;
    const vat = Number(invoiceVat) || 0;
    const delivery = Number(invoiceDeliveryCharge) || 0;
    const grandTotal = Math.max(0, subtotal - disc + vat + delivery);

    return {
      subtotal,
      discount: disc,
      vat,
      deliveryCharge: delivery,
      grandTotal,
      refundAmount: grandTotal,
      selectedItemCount,
      totalPieces,
    };
  }, [lines, invoiceDiscount, invoiceVat, invoiceDeliveryCharge]);

  // Switch between Full and Partial Return Modes
  const handleSetReturnMode = (mode: "FULL" | "PARTIAL") => {
    setReturnMode(mode);
    if (mode === "FULL") {
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          isSelected: l.availableQuantity > 0,
          quantity: l.availableQuantity,
          total: l.availableQuantity * l.sellPrice,
        }))
      );
    }
  };

  // Quick Action: Select All items with full available quantities
  const handleSelectAllFullQty = () => {
    setReturnMode("FULL");
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        isSelected: l.availableQuantity > 0,
        quantity: l.availableQuantity,
        total: l.availableQuantity * l.sellPrice,
      }))
    );
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
              total: l.availableQuantity * l.sellPrice,
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
          total: nextQty * item.sellPrice,
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
          total: bounded * item.sellPrice,
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
    selectedRecord: selectedSale,
    refundAmount: totals.refundAmount,
    returnMode,
    registeredBankAccounts,
    registeredMfsAccounts,
    priority: "cash_first",
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
    totalRefundAllocated,
    refundDifference,
    resetRefund,
  } = refund;

  const handleReset = () => {
    if (stateSale) {
      loadInvoice(stateSale);
    } else if (selectedSale) {
      loadInvoice(selectedSale);
    } else {
      setSelectedSale(null);
      setSalesInvoiceNo("");
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setLines([]);
      resetRefund();
    }
  };

  // Pre-submit validation
  const handlePreSubmit = (autoPrint: boolean) => {
    if (isCurrentSaleAlreadyReturned) {
      showErrorToast(
        "This order has already been returned. According to store policy, an order can only be returned once."
      );
      return;
    }

    if (!salesInvoiceNo.trim()) {
      showErrorToast("Please select the original sale invoice / order number");
      return;
    }

    if (totals.selectedItemCount === 0 || totals.totalPieces === 0) {
      showErrorToast("Please select at least 1 item with return quantity > 0");
      return;
    }

    const activeLines = lines.filter((l) => l.isSelected && l.quantity > 0);
    for (const l of activeLines) {
      if (l.quantity > l.availableQuantity) {
        showErrorToast(
          `Cannot return more than available quantity (${l.availableQuantity}) for ${l.productName}`
        );
        return;
      }
    }

    if (totals.refundAmount > 0) {
      if (Math.abs(refundDifference) > 0.01) {
        if (refundDifference > 0) {
          showErrorToast(
            `Refund disbursement incomplete. Remaining ৳${formatMoney(
              refundDifference
            )} unallocated!`
          );
        } else {
          showErrorToast(
            `Allocated refund exceeds required refund by ৳${formatMoney(
              Math.abs(refundDifference)
            )}!`
          );
        }
        return;
      }

      if (numRefundBank > 0 && !selectedRefundBankId) {
        showErrorToast("Please select a Bank account for bank refund");
        return;
      }

      if (numRefundMfs > 0 && !selectedRefundMfsId) {
        showErrorToast("Please select an MFS wallet for MFS refund");
        return;
      }
    }

    setPendingPrintAfterSave(autoPrint);
    setIsConfirmModalOpen(true);
  };

  // Submit to POST /insert-sales-return
  const handleSubmitReturn = async () => {
    setIsSubmitting(true);
    try {
      const activeLines = lines.filter((l) => l.isSelected && l.quantity > 0);

      const finalNote = note.trim() || (salesInvoiceNo ? `Return from invoice ${salesInvoiceNo}` : "");

      // Return details matching exact API schema
      const returnDetailsPayload = activeLines.map((l) => ({
        productId: l.productId,
        productCode: l.productCode,
        productName: l.productName,
        unit: l.unit,
        quantity: l.quantity,
        sellPrice: l.sellPrice,
        discount: l.discount || 0,
        vat: l.vat || 0,
        total: Number((l.quantity * l.sellPrice).toFixed(2)),
        returnReason: l.returnReason || "wrong_order",
      }));

      // Calculate refund payment type
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

      // Top-level payload matching exact API schema
      const payload = {
        accessUser: buildAccessUser(),
        salesInvoiceNo,
        orderNo: selectedSale?.orderNo || null,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        returnDate,
        totalAmount: Number(totals.subtotal.toFixed(2)),
        discount: Number(totals.discount.toFixed(2)),
        vat: Number(totals.vat.toFixed(2)),
        deliveryCharge: Number(totals.deliveryCharge.toFixed(2)),
        grandTotal: Number(totals.grandTotal.toFixed(2)),
        refundAmount: Number(totals.refundAmount.toFixed(2)),
        paymentType: effectivePaymentType,
        status: status || "Return",
        note: finalNote,
        refNo: `SR-${Date.now()}`,
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

      const endpoint = apiConfig.salesReturn.insertSalesReturnUrl;

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
          "Failed to save sales return. Please try again.";
        showErrorToast(errorMsg);
        setIsSubmitting(false);
        setIsConfirmModalOpen(false);
        return;
      }

      const generatedReturnNo =
        response?.returnNo ||
        response?.data?.returnNo ||
        `RET-${moment().format("YYYYMMDD")}-${Math.floor(100 + Math.random() * 900)}`;

      const createdReturnItem: SalesReturnItem = {
        id: Date.now(),
        returnNo: generatedReturnNo,
        salesInvoiceNo,
        orderNo: selectedSale?.orderNo,
        invoiceNo: salesInvoiceNo,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        returnDate,
        totalAmount: totals.subtotal,
        discount: totals.discount,
        vat: totals.vat,
        deliveryCharge: totals.deliveryCharge,
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
        itemsCount: activeLines.length,
        createdAt: new Date().toISOString(),
      };

      // Mark as submitted so invalidating query does not trigger error toast on active order
      setHasJustSubmitted(true);

      // Invalidate relevant queries (non-blocking, stale background refresh)
      queryClient.invalidateQueries({ queryKey: [salesAndReturnQueryKey] });
      queryClient.invalidateQueries({ queryKey: [salesListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [productListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [productQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [partyListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "none" });

      // Post financial transaction EXPENSE to reduce cash/bank balance for customer refund
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
              tradeType: "EXPENSE",
              tenders: refundTenders,
              invoiceNo: generatedReturnNo || salesInvoiceNo,
              partyId: customerId || "",
              head: "Sales Return",
              itemsSummary: itemSummary,
              notes: finalNote,
              date: returnDate,
              totalDue: numRefundDue,
            });
          }
        } catch (ledgerErr) {
          console.error("Sales return saved, but financial ledger posting encountered an error:", ledgerErr);
        }
      }

      showSuccessToast(
        response?.msg ||
          `Sales Return ${generatedReturnNo} created successfully! ৳${formatMoney(
            totals.refundAmount
          )} refunded.`
      );

      setIsConfirmModalOpen(false);
      setSavedReturnRecord(createdReturnItem);

      if (pendingPrintAfterSave) {
        setIsReceiptModalOpen(true);
      } else {
        navigate("/admin/sales-return");
      }
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to create sales return");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header Bar (Matching PurchaseForm Standard) */}
      <div className="sticky top-0 z-30 bg-[#F6F6F6] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 border-b border-gray-200">
        {/* Left Side: Title & Badge */}
        <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2.5 min-w-0">
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-[var(--primary-color)] flex items-center gap-1.5 shrink-0">
              <FaUndoAlt className="text-[var(--primary-color)] shrink-0" size={17} />
              <span className="truncate">Create Sales Return</span>
            </h1>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] font-normal w-fit">
              {salesInvoiceNo || "N/A"}
            </span>
          </div>

          {/* Controls visible on top right on Mobile (< lg) */}
          <div className="flex lg:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/sales-return")}
              className="px-2.5 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Action Controls for LG & Mobile */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 w-full lg:w-auto">
          {/* Controls visible inline on Desktop (lg:) */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/sales-return")}
              className="px-3 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Save & Save & Print Buttons */}
          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
            <Button
              label={
                isCurrentSaleAlreadyReturned
                  ? "Already Returned"
                  : isSubmitting
                  ? "Saving..."
                  : "Save Return"
              }
              onClick={() => handlePreSubmit(false)}
              color={isCurrentSaleAlreadyReturned ? "#9ca3af" : "var(--primary-color)"}
              disabled={isSubmitting || isCurrentSaleAlreadyReturned}
              buttonClass={`!text-xs !py-1.5 !w-full lg:!w-fit justify-center font-normal !text-white ${
                isCurrentSaleAlreadyReturned ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
            <Button
              label="Save & Print"
              onClick={() => handlePreSubmit(true)}
              color={isCurrentSaleAlreadyReturned ? "#9ca3af" : "#059669"}
              disabled={isSubmitting || isCurrentSaleAlreadyReturned}
              buttonClass={`!text-xs !py-1.5 !w-full lg:!w-fit justify-center font-normal !text-white ${
                isCurrentSaleAlreadyReturned ? "opacity-60 cursor-not-allowed" : ""
              }`}
            />
          </div>
        </div>
      </div>


      {/* Section 1: Search by Order No / Invoice No & Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* Invoice / Order No Search Input with placeholder */}
        <div className="relative" ref={invoiceDropdownRef}>
          <label className="text-[11px] font-bold text-black  tracking-wider block mb-1">
            Search Order No / Invoice <span className="text-rose-500">*</span>
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
              placeholder="Search by Order No (ORD-1001), Invoice, Customer..."
              className="w-full h-9 pl-3 pr-8 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white text-xs  text-gray-900 focus:outline-none focus:border-[var(--primary-color)]"
            />
            {invoiceSearchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setInvoiceSearchQuery("");
                  setSelectedSale(null);
                  setSalesInvoiceNo("");
                  setCustomerId("");
                  setCustomerName("");
                  setCustomerPhone("");
                  setCustomerAddress("");
                  setLines([]);
                  setIsInvoiceDropdownOpen(true);
                }}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear search"
              >
                <FaTimes className="text-xs" />
              </button>
            ) : (
              <FaSearch
                onClick={() => setIsInvoiceDropdownOpen(true)}
                className="absolute right-2.5 text-gray-400 text-xs cursor-pointer hover:text-gray-600"
              />
            )}
          </div>

          {isInvoiceDropdownOpen && (
            <div className="absolute left-0 w-[calc(100vw-32px)] sm:w-[480px] md:w-[560px] max-w-[600px] mt-1 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl z-50 text-xs divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100">
              {/* Header */}
              <div className="sticky top-0 bg-gray-50/95 backdrop-blur-xs px-3 py-1.5 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium z-10">
                <div className="flex items-center gap-1.5">
                  <FaFileInvoice className="text-[var(--primary-color)]" size={11} />
                  <span>Available Sales Orders ({filteredInvoices.length})</span>
                </div>
                <span className="text-[10px] text-gray-400">Select order to return</span>
              </div>

              {isLoadingInvoices ? (
                <div className="px-4 py-5 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading sales orders...</span>
                </div>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.invoiceNo || inv.id}
                    onClick={() => {
                      loadInvoice(inv);
                      setIsInvoiceDropdownOpen(false);
                      setInvoiceSearchQuery(inv.orderNo ? `${inv.invoiceNo} (${inv.orderNo})` : (inv.invoiceNo || ""));
                    }}
                    className="py-1.5 px-3 hover:bg-sky-50/70 cursor-pointer transition-all group flex items-center justify-between gap-2.5"
                  >
                    {/* Left Details */}
                    <div className="flex-1 min-w-0">
                      {/* Badges / IDs */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {inv.orderNo && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200 leading-tight">
                            Order #{inv.orderNo}
                          </span>
                        )}
                        <span className="font-mono text-xs font-semibold text-gray-800 truncate" title={inv.invoiceNo}>
                          {inv.invoiceNo}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200 shrink-0 leading-tight">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Eligible for Return
                        </span>
                      </div>

                      {/* Customer & Date Info */}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-600 flex-wrap leading-tight">
                        <span className="font-semibold text-gray-800">
                          {inv.customerName || "Customer"}
                        </span>
                        {inv.customerPhone && (
                          <span className="text-gray-400">
                            • {inv.customerPhone}
                          </span>
                        )}
                        {(inv.salesDate || inv.date) && (
                          <span className="text-gray-400">
                            • {moment(inv.salesDate || inv.date).format("DD MMM, YYYY")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Price & Action */}
                    <div className="text-right shrink-0 flex flex-col items-end justify-center">
                      <div className="text-xs font-bold text-gray-900 leading-tight">
                        ৳ {formatMoney(Number(inv.grandTotal || 0))}
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--primary-color)] group-hover:text-[var(--primary-color-hover)] inline-flex items-center gap-1 mt-0.5 transition-colors">
                        <span>Select</span>
                        <FiArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <FaSearch size={13} />
                  </div>
                  <p className="text-xs font-medium text-gray-700">
                    {availableInvoices.length === 0
                      ? "No invoices found in system"
                      : "No matching sales orders found"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Search by Order No, Invoice No, or Customer Phone
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Return Date */}
        <div>
          <label className="text-[11px] font-bold text-black  tracking-wider block mb-1">
            Return Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full h-9 px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white text-xs text-gray-900 focus:outline-none focus:border-[var(--primary-color)]"
          />
        </div>

        {/* Customer Details */}
        <div>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
            Customer
          </label>
          <input
            type="text"
            readOnly
            disabled
            value={
              customerName
                ? customerPhone
                  ? `${customerName} • ${customerPhone}`
                  : customerName
                : "N/A"
            }
            placeholder="N/A"
            className="w-full h-9 px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-normal text-black placeholder:text-black cursor-default truncate"
          />
        </div>

        {/* Refund / Settlement Type - Auto-determined by customer's original payment method */}
        <div>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
            Refund / Settlement Type <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            readOnly
            disabled
            value={
              selectedSale
                ? paymentType === "CASH"
                  ? "Cash Refund"
                  : paymentType === "CREDIT"
                  ? "Credit (Due Adjustment)"
                  : paymentType === "MFS"
                  ? `MFS (${selectedSale.mfsName || "bKash / Nagad"})`
                  : paymentType === "BANK"
                  ? `Bank (${selectedSale.bankName || "Transfer"})`
                  : paymentType
                : "N/A"
            }
            placeholder="N/A"
            className="w-full h-9 px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-normal text-black placeholder:text-black cursor-default truncate"
          />
        </div>
      </div>

      {/* Customer Original Payment Breakdown Banner (Compact Spacing & Padding) */}
      {selectedSale && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-2 sm:p-2.5 flex flex-col gap-1.5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-blue-100">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-[var(--primary-color-light)] text-[var(--primary-color)] shrink-0">
                <FaMoneyBillWave size={12} />
              </div>
              <span className="font-bold text-black block text-[11px] sm:text-xs leading-tight">
                Customer's Original Payment Breakdown
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-medium">Invoice Method:</span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                  origPaymentMode === "CASH"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : origPaymentMode === "CREDIT"
                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                    : origPaymentMode === "BANK"
                    ? "bg-sky-100 text-sky-800 border border-sky-300"
                    : origPaymentMode === "MFS"
                    ? "bg-purple-100 text-purple-800 border border-purple-300"
                    : "bg-blue-100 text-blue-800 border border-blue-300"
                }`}
              >
                {origPaymentMode}
              </span>
            </div>
          </div>

          {/* Cards for each channel customer paid with (Compact ERP style) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {/* Total Balance / Invoice Amount */}
            <div className="p-1.5 sm:p-2 rounded-lg border border-sky-200 bg-gradient-to-b from-sky-50/50 to-white shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-medium text-black mb-0.5">
                <span className="flex items-center gap-1 text-black">
                  <FaFileInvoice className="text-[var(--primary-color)] text-[10px]" />
                  Total Sales
                </span>
              </div>
              <div className="font-semibold text-black text-xs sm:text-[13px] leading-tight">
                ৳ {formatMoney(origGrandTotal)}
              </div>
            </div>

            {/* Cash Paid */}
            <div
              className={`p-1.5 sm:p-2 rounded-lg border bg-gradient-to-b from-emerald-50/40 to-white shadow-2xs flex flex-col justify-between ${
                origCashPaid > 0 ? "border-emerald-300" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-black mb-0.5">
                <span className="flex items-center gap-1 text-black">
                  <FaMoneyBillWave className="text-emerald-600 text-[10px]" />
                  Cash Collection
                </span>
              </div>
              <div className="font-normal text-black text-xs sm:text-[13px] leading-tight">
                {origCashPaid > 0 ? `৳ ${formatMoney(origCashPaid)}` : "N/A"}
              </div>
            </div>

            {/* Bank Paid */}
            <div
              className={`p-1.5 sm:p-2 rounded-lg border bg-gradient-to-b from-sky-50/40 to-white shadow-2xs flex flex-col justify-between ${
                origBankPaid > 0 ? "border-sky-300" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-black mb-0.5">
                <span className="flex items-center gap-1 text-black">
                  <FaCreditCard className="text-sky-600 text-[10px]" />
                  Bank Collection
                </span>
                {selectedSale.bankName && (
                  <span
                    className="text-[9.5px] text-gray-700 bg-sky-100/70 px-1 rounded font-normal truncate max-w-[85px]"
                    title={selectedSale.bankName}
                  >
                    {selectedSale.bankName}
                  </span>
                )}
              </div>
              <div className="font-normal text-black text-xs sm:text-[13px] leading-tight">
                {origBankPaid > 0 ? `৳ ${formatMoney(origBankPaid)}` : "N/A"}
              </div>
            </div>

            {/* MFS Paid */}
            <div
              className={`p-1.5 sm:p-2 rounded-lg border bg-gradient-to-b from-purple-50/40 to-white shadow-2xs flex flex-col justify-between ${
                origMfsPaid > 0 ? "border-purple-300" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-black mb-0.5">
                <span className="flex items-center gap-1 text-black">
                  <FaMobileAlt className="text-purple-600 text-[10px]" />
                  MFS Collection
                </span>
                {(selectedSale.mfsName || selectedSale.mfsPhone) && (
                  <span
                    className="text-[9.5px] text-gray-700 bg-purple-100/70 px-1 rounded font-normal truncate max-w-[85px]"
                    title={`${selectedSale.mfsName || ""} ${selectedSale.mfsPhone || ""}`}
                  >
                    {selectedSale.mfsName || selectedSale.mfsPhone}
                  </span>
                )}
              </div>
              <div className="font-normal text-black text-xs sm:text-[13px] leading-tight">
                {origMfsPaid > 0 ? `৳ ${formatMoney(origMfsPaid)}` : "N/A"}
              </div>
            </div>

            {/* Due Balance */}
            <div
              className={`p-1.5 sm:p-2 rounded-lg border bg-gradient-to-b from-rose-50/40 to-white shadow-2xs flex flex-col justify-between ${
                origDueAmount > 0 ? "border-rose-300" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-black mb-0.5">
                <span className="flex items-center gap-1 text-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                  Due Balance
                </span>
              </div>
              <div className="font-normal text-black text-xs sm:text-[13px] leading-tight">
                {origDueAmount > 0 ? `৳ ${formatMoney(origDueAmount)}` : "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Return Items Table with 2 Return Modes (Full vs Partial) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Return Mode Selection Toolbar Header */}
        <div className="p-2 sm:px-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FaBoxes className="text-[var(--primary-color)] text-xs" />
            <span className="text-xs font-normal text-black tracking-wider">
              Return Type:
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
              <button
                type="button"
                onClick={() => handleSetReturnMode("FULL")}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-normal transition-all cursor-pointer ${
                  returnMode === "FULL"
                    ? "bg-[var(--primary-color)] text-white shadow-xs"
                    : "text-gray-600 hover:text-black"
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
                    : "text-gray-600 hover:text-black"
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
                className="px-2 py-0.5 text-[11px] font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <span className="text-xs text-black pl-1.5 border-l border-gray-200">
              Selected: <span className="text-black font-normal">{totals.selectedItemCount} items ({totals.totalPieces} pcs)</span>
            </span>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            Please search and select a sale invoice / order number above to load items.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-[#41bef3] text-black border-b border-gray-200 text-[11px] font-semibold shadow-xs">
                  <th className="py-2 px-3 text-center w-10 whitespace-nowrap">Select</th>
                  <th className="py-2 px-3 min-w-[200px]">Product Description</th>
                  <th className="py-2 px-2 text-center w-16 whitespace-nowrap">Unit</th>
                  <th className="py-2 px-2 text-center w-24 whitespace-nowrap">Sold Qty</th>
                  <th className="py-2 px-2 text-center w-28 whitespace-nowrap">Available Qty</th>
                  <th className="py-2 px-2 text-center w-36 whitespace-nowrap">Return Qty</th>
                  <th className="py-2 px-2 text-left min-w-[190px] whitespace-nowrap">Return Reason</th>
                  <th className="py-2 px-2 text-right w-28 whitespace-nowrap">Sell Price (৳)</th>
                  <th className="py-2 px-3 text-right w-28 whitespace-nowrap">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => {
                  const isFullyReturned = line.availableQuantity <= 0;
                  return (
                    <tr
                      key={idx}
                      className={`${
                        isFullyReturned
                          ? "bg-gray-100/70 opacity-60"
                          : line.isSelected
                          ? "bg-white"
                          : "bg-gray-50/50 opacity-70"
                      } hover:bg-sky-50/30 transition-colors`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          disabled={isFullyReturned || isCurrentSaleAlreadyReturned || returnMode === "FULL"}
                          checked={line.isSelected}
                          onChange={() => handleToggleLine(idx)}
                          title={returnMode === "FULL" ? "All items are included in Full Return mode. Select Partial Return to modify." : undefined}
                          className="rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)] cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Product */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-normal text-black text-xs whitespace-nowrap">
                          <span className="font-normal text-black">{line.productName || "N/A"}</span>
                          <span className="text-[10px] text-black font-normal">
                            ({line.productCode || "N/A"})
                          </span>
                          {isFullyReturned && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-medium ml-1">
                              Fully Returned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className="text-black bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-normal">
                          {line.unit || "N/A"}
                        </span>
                      </td>

                      {/* Sold Qty (1-Line Compact Layout) */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <span className="text-black bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium">
                            {line.soldQuantity}
                          </span>
                          {line.alreadyReturnedQty > 0 && (
                            <span
                              title={`${line.alreadyReturnedQty} pcs previously returned`}
                              className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium"
                            >
                              ({line.alreadyReturnedQty} ret)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Available Qty (1-Line Compact Layout) */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {isFullyReturned ? (
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded text-[11px] font-bold">
                            0
                          </span>
                        ) : (
                          <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px] font-bold">
                            {line.availableQuantity}
                          </span>
                        )}
                      </td>

                      {/* Return Qty with Steppers and Quick Full Button */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {isFullyReturned || isCurrentSaleAlreadyReturned ? (
                          <span className="text-black text-xs font-normal">
                            N/A
                          </span>
                        ) : returnMode === "FULL" ? (
                          <div
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-gray-100 text-black border border-gray-200 rounded text-xs font-normal cursor-not-allowed select-none"
                            title="Full Return mode: Quantities are fixed to full available quantity. Select Partial Return to change."
                          >
                            <span>{line.quantity}</span>
                            <span className="text-[10px] text-black font-normal">({line.unit || "N/A"})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center border border-gray-300 rounded overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, line.quantity - 1)}
                              disabled={line.quantity <= 0 || isCurrentSaleAlreadyReturned}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-black font-normal text-xs disabled:opacity-40 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={line.availableQuantity}
                              value={line.quantity}
                              disabled={isCurrentSaleAlreadyReturned}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) =>
                                handleQuantityChange(idx, Number(e.target.value))
                              }
                              className="w-12 py-1 text-center text-xs font-normal text-black focus:outline-none border-x border-gray-300 disabled:bg-gray-100 disabled:text-black"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, line.quantity + 1)}
                              disabled={line.quantity >= line.availableQuantity || isCurrentSaleAlreadyReturned}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-black font-normal text-xs disabled:opacity-40 cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetLineFullQty(idx)}
                              disabled={isCurrentSaleAlreadyReturned}
                              className="px-2 py-1 bg-[var(--primary-color-light)] hover:bg-[var(--primary-color-muted)] text-[var(--primary-color)] font-bold text-[10px] border-l border-gray-300 cursor-pointer disabled:opacity-40"
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
                          disabled={isFullyReturned || !line.isSelected || isCurrentSaleAlreadyReturned}
                          value={line.returnReason || "wrong_order"}
                          onChange={(e) => handleReturnReasonChange(idx, e.target.value)}
                          className="w-full min-w-[175px] h-7 px-2 text-[11px] border border-gray-300 rounded bg-white text-black font-semibold focus:outline-none focus:border-[var(--primary-color)] disabled:bg-gray-100 disabled:text-black cursor-pointer disabled:cursor-not-allowed"
                        >
                          {RETURN_REASONS.map((r) => (
                            <option key={r.value} value={r.value} className="text-black font-semibold">
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Sell Price */}
                      <td className="py-2 px-2 text-right whitespace-nowrap font-normal text-black text-xs">
                        ৳ {formatMoney(line.sellPrice)}
                      </td>

                      {/* Total */}
                      <td className="py-2 px-3 text-right whitespace-nowrap font-normal text-black text-xs">
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
        <div className="lg:col-span-5 bg-white p-3 sm:p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
            <label className="text-[11px] font-normal text-black tracking-wider">
              Return Note & Remarks
            </label>
            <span className="text-[10px] text-black font-normal">Internal Record</span>
          </div>

          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type notes or remarks about return reason, product condition, approval..."
            className="w-full p-2.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--primary-color)] resize-none leading-relaxed text-black placeholder:text-gray-400 bg-gray-50/30 hover:bg-white focus:bg-white transition-colors font-normal"
          />

          {/* Quick preset remarks */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-black font-normal">Quick:</span>
            {[
              "Damaged on delivery",
              "Wrong item returned",
              "Full refund approved",
              "Due balance adjusted",
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
                className="px-2 py-0.5 text-[10px] rounded-md bg-gray-100 hover:bg-[var(--primary-color-light)] hover:text-[var(--primary-color)] text-black border border-gray-200 transition-colors cursor-pointer font-normal"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column (span-7): Payment Refunded Section (Exact Match to Create New Sale) */}
        <div className="lg:col-span-7 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
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
        title="Confirm Sales Return"
        message={`Are you sure you want to process return for invoice ${salesInvoiceNo}? Total refund of ৳${formatMoney(
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
      <SalesReturnInvoiceModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          navigate("/admin/sales-return");
        }}
        returnData={savedReturnRecord}
        autoPrint={true}
      />
    </div>
  );
};

export default SalesReturnForm;