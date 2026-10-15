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
  FaMoneyBillWave,
  FaUndoAlt,
  FaTimes,
  FaCreditCard,
  FaMobileAlt,
  FaWallet,
  FaLock,
} from "react-icons/fa";
import Button from "@/components/button/Button";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PurchaseReturnInvoiceModal from "./PurchaseReturnInvoiceModal";
import apiConfig from "@/config/api.json";
import {
  purchaseAndReturnQueryKey,
  purchaseListQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
  productListQueryKey,
  productQueryKey,
  partyListQueryKey,
  dashboardQueryKey,
} from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { PurchaseItem, PurchaseReturnItem } from "@/types";
import { PURCHASE_RETURN_REASONS } from "../constants/returnReasons";
import {
  usePurchasesQuery,
  usePurchaseAndReturnsQuery,
} from "../hooks/usePurchaseReturnQueries";

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

  // Refund Settlement Breakdown State (Cash, Bank, MFS, Due Adjustment)
  const [refundCashAmount, setRefundCashAmount] = useState<string>("");
  const [refundBankAmount, setRefundBankAmount] = useState<string>("");
  const [refundMfsAmount, setRefundMfsAmount] = useState<string>("");
  const [refundDueAmount, setRefundDueAmount] = useState<string>("");
  const [selectedRefundBankId, setSelectedRefundBankId] = useState<string>("");
  const [selectedRefundMfsId, setSelectedRefundMfsId] = useState<string>("");

  // Search & Dropdown
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState<boolean>(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("");
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

  // 2. Fetch registered bank accounts for refund disbursement
  const bankInfoListUrl = apiConfig.bank?.bankInfoListUrl || "get-bank-info-list";
  const { data: banksData } = useQuery({
    queryKey: [bankInfoListQueryKey],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: bankInfoListUrl,
        body: { accessUser },
      });
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const registeredBankAccounts: any[] = useMemo(() => {
    if (!banksData) return [];
    if (Array.isArray(banksData)) return banksData;
    const raw = banksData as any;
    if (Array.isArray(raw.bankAccounts)) return raw.bankAccounts;
    if (Array.isArray(raw.bankInfoList)) return raw.bankInfoList;
    if (Array.isArray(raw.bankList)) return raw.bankList;
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === "object") {
      if (Array.isArray(raw.data.bankAccounts)) return raw.data.bankAccounts;
      if (Array.isArray(raw.data.bankInfoList)) return raw.data.bankInfoList;
      if (Array.isArray(raw.data.bankList)) return raw.data.bankList;
    }
    return [];
  }, [banksData]);

  // 3. Fetch registered MFS accounts for refund disbursement
  const mfsUserListUrl = apiConfig.mfs?.mfsUserListUrl || "mfs-user-list";
  const { data: mfsData } = useQuery({
    queryKey: [mfsUserListQueryKey],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: mfsUserListUrl,
        body: { accessUser },
      });
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const registeredMfsAccounts: any[] = useMemo(() => {
    if (!mfsData) return [];
    if (Array.isArray(mfsData)) return mfsData;
    const raw = mfsData as any;
    if (Array.isArray(raw.mfsUsers)) return raw.mfsUsers;
    if (Array.isArray(raw.mfsUserList)) return raw.mfsUserList;
    if (Array.isArray(raw.mfsList)) return raw.mfsList;
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.data && typeof raw.data === "object") {
      if (Array.isArray(raw.data.mfsUsers)) return raw.data.mfsUsers;
      if (Array.isArray(raw.data.mfsUserList)) return raw.data.mfsUserList;
      if (Array.isArray(raw.data.mfsList)) return raw.data.mfsList;
    }
    return [];
  }, [mfsData]);

  const availableInvoices: PurchaseItem[] = useMemo(() => {
    const combinedCandidates: any[] = [];
    const seenKeys = new Set<string>();

    const addCandidate = (item: any) => {
      if (!item) return;
      const key = String(
        item.id ||
        item.purchaseId ||
        item.invoiceNo ||
        item.purchaseInvoiceNo ||
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
        (Array.isArray(item.purchase_details) && item.purchase_details.length > 0) ||
        (Array.isArray(item.purchaseListDetails) && item.purchaseListDetails.length > 0) ||
        (Array.isArray(item.details) && item.details.length > 0) ||
        (Array.isArray(item.items) && item.items.length > 0) ||
        (Array.isArray(item.products) && item.products.length > 0);
      return hasDetails;
    });
  }, [purchasesData, apiPurchaseAndReturnData]);

  // Pre-select fallback bank or MFS only when a refund amount is allocated to that channel
  useEffect(() => {
    if (Number(refundBankAmount) > 0 && registeredBankAccounts.length > 0 && !selectedRefundBankId) {
      setSelectedRefundBankId(
        String(registeredBankAccounts[0].id || registeredBankAccounts[0].bankId || registeredBankAccounts[0]._id || "")
      );
    }
  }, [registeredBankAccounts, selectedRefundBankId, refundBankAmount]);

  useEffect(() => {
    if (Number(refundMfsAmount) > 0 && registeredMfsAccounts.length > 0 && !selectedRefundMfsId) {
      setSelectedRefundMfsId(
        String(registeredMfsAccounts[0].id || registeredMfsAccounts[0].mfsId || registeredMfsAccounts[0]._id || "")
      );
    }
  }, [registeredMfsAccounts, selectedRefundMfsId, refundMfsAmount]);

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
        const itemInv = cleanKey(item.purchaseInvoiceNo || item.invoiceNo || item.purchase_invoice_no || item.invoice_no);
        const itemOrd = cleanKey(item.orderNo || item.order_no);
        const itemChallan = cleanKey(item.challanNo || item.challan_no);
        // NOTE: Only use item.purchaseId / item.purchase_id. NEVER use item.id because item.id is the return record ID!
        const itemPurchaseId = cleanKey(item.purchaseId || item.purchase_id);

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
        const ord = cleanKey(item.orderNo || item.order_no);
        const challan = cleanKey(item.challanNo || item.challan_no);
        const pid = cleanKey(item.id || item.purchaseId || item.purchase_id);

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

    const ord = cleanKey((purchase as any).orderNo || (purchase as any).order_no);
    if (ord && returnedPurchaseKeysSet.has(`ord:${ord}`)) return true;

    const challan = cleanKey(purchase.challanNo || (purchase as any).challan_no);
    if (challan && returnedPurchaseKeysSet.has(`challan:${challan}`)) return true;

    const pid = cleanKey(purchase.id || (purchase as any).purchaseId || (purchase as any).purchase_id);
    if (pid && returnedPurchaseKeysSet.has(`pid:${pid}`)) return true;

    return false;
  }, [returnedPurchaseKeysSet]);

  // Helper to calculate already returned quantities using exact-match indexing
  const getReturnedQuantitiesForPurchase = useCallback((purchase: PurchaseItem): Record<string, number> => {
    const invClean = cleanKey(purchase.invoiceNo || (purchase as any).purchaseInvoiceNo);
    const ordClean = cleanKey((purchase as any).orderNo || (purchase as any).order_no);
    const challanClean = cleanKey(purchase.challanNo || (purchase as any).challan_no);
    const purchaseIdClean = cleanKey(purchase.id || (purchase as any).purchaseId || (purchase as any).purchase_id);

    const returnedQtyMap: Record<string, number> = {};

    const processDetailsList = (details: any[]) => {
      if (!Array.isArray(details)) return;
      details.forEach((rd: any) => {
        const pId = String(rd.productId ?? rd.product_id ?? rd.id ?? rd.itemId ?? rd.item_id ?? "").trim();
        const pCode = String(rd.productCode ?? rd.pcode ?? rd.product_code ?? "").trim();
        const pName = String(rd.productName ?? rd.name ?? rd.product_name ?? "").trim().toLowerCase();
        const qty = Number(
          rd.quantity ??
          rd.qty ??
          rd.returnQuantity ??
          rd.returnQty ??
          rd.returnedQuantity ??
          rd.returnedQty ??
          rd.return_quantity ??
          rd.returned_qty ??
          0
        );

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

  const isCurrentPurchaseAlreadyReturned = useMemo(() => {
    if (!selectedPurchase) return false;
    if (hasJustSubmitted) return false;
    return isPurchaseAlreadyReturned(selectedPurchase);
  }, [selectedPurchase, hasJustSubmitted, isPurchaseAlreadyReturned]);

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

    // Pre-select bank or MFS if originally used in the purchase, else reset
    const purchaseBankId = purchase.bankId || (purchase as any).bank_id;
    if (purchaseBankId) {
      setSelectedRefundBankId(String(purchaseBankId));
    } else {
      setSelectedRefundBankId("");
    }

    const purchaseMfsId = purchase.mfsId || (purchase as any).mfs_id;
    if (purchaseMfsId) {
      setSelectedRefundMfsId(String(purchaseMfsId));
    } else {
      setSelectedRefundMfsId("");
    }

    const details: any[] =
      purchase.purchaseDetails ||
      purchase.purchasesDetails ||
      purchase.purchase_details ||
      purchase.purchaseListDetails ||
      purchase.details ||
      purchase.items ||
      purchase.products ||
      [];

    const returnedMap = getReturnedQuantitiesForPurchase(purchase);

    if (details.length > 0) {
      const formattedLines: ReturnLineFormState[] = details.map((d: any) => {
        const purchasedQty = Number(d.quantity ?? d.qty ?? 1);
        const buyPrice = Number(d.buyPrice ?? d.purchasePrice ?? d.unitPrice ?? d.price ?? 0);

        const pId = String(d.productId ?? d.product_id ?? "").trim();
        const pCode = String(d.productCode ?? d.pcode ?? d.code ?? "").trim();
        const pName = String(d.productName ?? d.name ?? "").trim().toLowerCase();
        const baseName = pName.split(/[(/[-]/)[0].trim();

        const directReturned = Number(
          d.alreadyReturnedQty ??
          d.alreadyReturned ??
          d.returnedQuantity ??
          d.returnedQty ??
          d.returnQuantity ??
          d.returnQty ??
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
          productId: d.productId ?? d.product_id ?? d.id ?? "",
          productCode: d.productCode ?? d.pcode ?? d.code ?? "",
          productName: d.productName ?? d.name ?? "Product",
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
    const q = invoiceSearchQuery.toLowerCase().trim();
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
  }, [unreturnedInvoices, invoiceSearchQuery]);

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

  // Original invoice payment numbers directly read from backend
  const origPaymentMode = String(
    selectedPurchase?.paymentType || (selectedPurchase as any)?.payment_type || "CASH"
  ).toUpperCase();
  const origGrandTotal = Number(
    selectedPurchase?.grandTotal ??
      (selectedPurchase as any)?.grand_total ??
      selectedPurchase?.totalAmount ??
      (selectedPurchase as any)?.total_amount ??
      0
  );
  const origPaidAmount = Number(
    selectedPurchase?.paidAmount ?? (selectedPurchase as any)?.paid_amount ?? 0
  );
  const origDueAmount = Number(
    selectedPurchase?.dueAmount ??
      (selectedPurchase as any)?.due_amount ??
      (origPaymentMode === "CREDIT"
        ? origGrandTotal
        : Math.max(0, origGrandTotal - origPaidAmount))
  );

  // Split amounts recorded on the purchase
  const rawCash = Number(
    selectedPurchase?.cashReceived ??
      (selectedPurchase as any)?.cash_amount ??
      (selectedPurchase as any)?.cashAmount ??
      0
  );
  const rawBank = Number(
    selectedPurchase?.cardReceived ??
      (selectedPurchase as any)?.bankAmount ??
      (selectedPurchase as any)?.bank_amount ??
      0
  );
  const rawMfs = Number(
    selectedPurchase?.mfsReceived ??
      (selectedPurchase as any)?.mfsAmount ??
      (selectedPurchase as any)?.mfs_amount ??
      0
  );

  const hasSplitDetails = rawCash > 0 || rawBank > 0 || rawMfs > 0;

  let origCashPaid = 0;
  let origBankPaid = 0;
  let origMfsPaid = 0;

  if (hasSplitDetails) {
    origCashPaid = rawCash;
    origBankPaid = rawBank;
    origMfsPaid = rawMfs;
  } else if (origPaidAmount > 0) {
    if (origPaymentMode === "BANK" || selectedPurchase?.bankId || (selectedPurchase as any)?.bank_id) {
      origBankPaid = origPaidAmount;
    } else if (origPaymentMode === "MFS" || selectedPurchase?.mfsId || (selectedPurchase as any)?.mfs_id) {
      origMfsPaid = origPaidAmount;
    } else {
      origCashPaid = origPaidAmount;
    }
  }

  // Auto-distribute refund when purchase is selected or return totals change
  useEffect(() => {
    if (!selectedPurchase) {
      setRefundCashAmount("");
      setRefundBankAmount("");
      setRefundMfsAmount("");
      setRefundDueAmount("");
      return;
    }

    const neededRefund = totals.refundAmount;
    if (neededRefund <= 0) {
      setRefundCashAmount("");
      setRefundBankAmount("");
      setRefundMfsAmount("");
      setRefundDueAmount("");
      return;
    }

    // Full Return (or return amount matches full purchase): exact match to payment breakdown
    if (returnMode === "FULL" || Math.abs(neededRefund - origGrandTotal) < 0.01) {
      setRefundCashAmount(origCashPaid > 0 ? String(origCashPaid) : "");
      setRefundBankAmount(origBankPaid > 0 ? String(origBankPaid) : "");
      setRefundMfsAmount(origMfsPaid > 0 ? String(origMfsPaid) : "");
      setRefundDueAmount(origDueAmount > 0 ? String(origDueAmount) : "");
      return;
    }

    // Partial Return: Prioritize due adjustment first, then cash, then bank, then mfs
    let remaining = neededRefund;

    // 1. Adjust against Due Balance first (returning goods reduces unpaid credit)
    let allocDue = 0;
    if (origDueAmount > 0) {
      allocDue = Math.min(remaining, origDueAmount);
      remaining = Number((remaining - allocDue).toFixed(2));
    }

    // 2. Next deduct from Cash up to original cash paid
    const allocCash = remaining > 0 && origCashPaid > 0 ? Math.min(remaining, origCashPaid) : 0;
    remaining = Number((remaining - allocCash).toFixed(2));

    // 3. Next deduct from Bank up to original bank paid
    const allocBank = remaining > 0 && origBankPaid > 0 ? Math.min(remaining, origBankPaid) : 0;
    remaining = Number((remaining - allocBank).toFixed(2));

    // 4. Next deduct from MFS up to original MFS paid
    const allocMfs = remaining > 0 && origMfsPaid > 0 ? Math.min(remaining, origMfsPaid) : 0;
    remaining = Number((remaining - allocMfs).toFixed(2));

    // Fallback: if all original channels were 0, put entire amount into cash
    const finalCash = allocCash + (allocCash === 0 && allocBank === 0 && allocMfs === 0 && allocDue === 0 ? remaining : 0);

    setRefundDueAmount(allocDue > 0 ? String(allocDue) : "");
    setRefundCashAmount(finalCash > 0 ? String(finalCash) : "");
    setRefundBankAmount(allocBank > 0 ? String(allocBank) : "");
    setRefundMfsAmount(allocMfs > 0 ? String(allocMfs) : "");
  }, [
    selectedPurchase,
    totals.refundAmount,
    returnMode,
    origCashPaid,
    origBankPaid,
    origMfsPaid,
    origDueAmount,
    origGrandTotal,
  ]);

  // Numeric refund channel values
  const numRefundCash = Number(refundCashAmount) || 0;
  const numRefundBank = Number(refundBankAmount) || 0;
  const numRefundMfs = Number(refundMfsAmount) || 0;
  const numRefundDue = Number(refundDueAmount) || 0;

  const totalRefundAllocated = useMemo(() => {
    return numRefundCash + numRefundBank + numRefundMfs + numRefundDue;
  }, [numRefundCash, numRefundBank, numRefundMfs, numRefundDue]);

  const refundDifference = useMemo(() => {
    return Number((totals.refundAmount - totalRefundAllocated).toFixed(2));
  }, [totals.refundAmount, totalRefundAllocated]);

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
    setRefundCashAmount("");
    setRefundBankAmount("");
    setRefundMfsAmount("");
    setRefundDueAmount("");
    setSelectedRefundBankId("");
    setSelectedRefundMfsId("");
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
        (b) => String(b.id || b.bankId || b._id) === String(selectedRefundBankId)
      );
      const matchedMfs = registeredMfsAccounts.find(
        (m) => String(m.id || m.mfsId || m._id) === String(selectedRefundMfsId)
      );

      const payload = {
        accessUser: buildAccessUser(),
        purchaseInvoiceNo,
        invoiceNo: purchaseInvoiceNo,
        challanNo: selectedPurchase?.challanNo || "",
        supplierId,
        supplierName,
        supplierPhone,
        supplierAddress,
        returnDate,
        date: returnDate,
        totalAmount: Number(totals.subtotal.toFixed(2)),
        discount: Number(totals.discount.toFixed(2)),
        vat: Number(totals.vat.toFixed(2)),
        deliveryCharge: 0,
        delivery_charge: 0,
        grandTotal: Number(totals.grandTotal.toFixed(2)),
        refundAmount: Number(totals.refundAmount.toFixed(2)),
        paymentType: effectivePaymentType,
        status: status || "Return",
        note: finalNote,
        remarks: finalNote,
        refNo: `PR-${Date.now()}`,
        osType: "WEB",
        cashReceived: numRefundCash,
        cardReceived: numRefundBank,
        mfsReceived: numRefundMfs,
        dueAmount: numRefundDue,
        bankId: numRefundBank > 0 ? selectedRefundBankId : null,
        bankName: numRefundBank > 0 ? (matchedBank?.bankName || matchedBank?.name || null) : null,
        accountNo:
          numRefundBank > 0
            ? (matchedBank?.accountNo ||
               matchedBank?.bankAccountNumber ||
               matchedBank?.bankAccountNo ||
               null)
            : null,
        mfsId: numRefundMfs > 0 ? selectedRefundMfsId : null,
        mfsName:
          numRefundMfs > 0
            ? (matchedMfs?.name || matchedMfs?.mfsName || matchedMfs?.method || null)
            : null,
        mfsPhone:
          numRefundMfs > 0
            ? (matchedMfs?.phoneNumber || matchedMfs?.mfsPhone || matchedMfs?.phone || null)
            : null,
        returnDetails: returnDetailsPayload,
        purchaseReturnDetails: returnDetailsPayload,
      };

      const endpoint =
        apiConfig.purchaseReturn?.insertPurchaseReturnUrl || "insert-purchase-return";

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
        bankName: matchedBank?.bankName || matchedBank?.name,
        accountNo:
          matchedBank?.accountNo ||
          matchedBank?.bankAccountNumber ||
          matchedBank?.bankAccountNo,
        mfsId: numRefundMfs > 0 ? selectedRefundMfsId : undefined,
        mfsName: matchedMfs?.name || matchedMfs?.mfsName || matchedMfs?.method,
        mfsPhone: matchedMfs?.phoneNumber || matchedMfs?.mfsPhone || matchedMfs?.phone,
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
      queryClient.invalidateQueries({ queryKey: [partyListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "none" });

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
      <div className="sticky top-0 z-30 bg-[#F6F6F6] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 border-b border-gray-200">
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
              className="px-2.5 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/purchase-return")}
              className="px-2.5 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
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
              className="px-3 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/purchase-return")}
              className="px-3 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
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
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 text-xs shadow-2xs">
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 shrink-0">
            <FaLock size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold block text-[12px] leading-tight text-rose-900">
              Purchase Order Already Returned
            </span>
            <span className="text-[11px] text-rose-700 block leading-tight">
              According to company policy, a purchase order or invoice can only be returned once. This invoice has already been settled and processed for return.
            </span>
          </div>
        </div>
      )}

      {/* Section 1: Search by Order No / Purchase Invoice & Supplier Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* Invoice / Order No Search Input with dropdown */}
        <div className="relative" ref={invoiceDropdownRef}>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
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
              placeholder="Search by Invoice (PUR-1001), Challan, Supplier..."
              className="w-full h-9 pl-3 pr-8 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white text-xs text-gray-900 focus:outline-none focus:border-[var(--primary-color)]"
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
              {/* Dropdown Header */}
              <div className="sticky top-0 bg-gray-50/95 backdrop-blur-xs px-3 py-1.5 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium z-10">
                <div className="flex items-center gap-1.5">
                  <FaFileInvoice className="text-[var(--primary-color)]" size={11} />
                  <span>Available Purchase Orders ({filteredInvoices.length})</span>
                </div>
                <span className="text-[10px] text-gray-400">Select order to return</span>
              </div>

              {isLoadingInvoices ? (
                <div className="px-4 py-5 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
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
                    className="px-3 py-2 hover:bg-sky-50/70 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900 text-xs truncate">
                          {inv.invoiceNo || `PUR-${inv.id}`}
                        </span>
                        {inv.challanNo && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-normal">
                            Challan: {inv.challanNo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
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
                        ৳ {formatMoney(Number(inv.grandTotal ?? inv.totalAmount ?? 0))}
                      </span>
                      {Number(inv.dueAmount || 0) > 0 && (
                        <span className="text-[10px] text-rose-600 font-semibold block">
                          Due: ৳ {formatMoney(Number(inv.dueAmount))}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-5 text-center text-gray-400 text-xs">
                  No eligible purchase orders found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Return Date */}
        <div>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
            Return Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full h-9 px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white text-xs text-gray-900 focus:outline-none focus:border-[var(--primary-color)]"
          />
        </div>

        {/* Supplier Details */}
        <div>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
            Supplier
          </label>
          <input
            type="text"
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
            className="w-full h-9 px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-normal text-black placeholder:text-black cursor-default truncate"
          />
        </div>

        {/* Refund / Settlement Type */}
        <div>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
            Refund / Settlement Type <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
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
            className="w-full h-9 px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-xs font-normal text-black placeholder:text-black cursor-default truncate"
          />
        </div>
      </div>

      {/* Supplier's Original Payment Breakdown Banner */}
      {selectedPurchase && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-2 sm:p-2.5 flex flex-col gap-1.5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-blue-100">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-[var(--primary-color-light)] text-[var(--primary-color)] shrink-0">
                <FaMoneyBillWave size={12} />
              </div>
              <span className="font-bold text-black block text-[11px] sm:text-xs leading-tight">
                Supplier's Original Payment Breakdown
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

          {/* Cards for each channel paid with */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {/* Total Purchase Amount */}
            <div className="p-1.5 sm:p-2 rounded-lg border border-sky-200 bg-gradient-to-b from-sky-50/50 to-white shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-medium text-black mb-0.5">
                <span className="flex items-center gap-1 text-black">
                  <FaFileInvoice className="text-[var(--primary-color)] text-[10px]" />
                  Total Purchase
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
                  Cash Paid
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
                  Bank Paid
                </span>
                {selectedPurchase.bankName && (
                  <span
                    className="text-[9.5px] text-gray-700 bg-sky-100/70 px-1 rounded font-normal truncate max-w-[85px]"
                    title={selectedPurchase.bankName}
                  >
                    {selectedPurchase.bankName}
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
                  MFS Paid
                </span>
                {(selectedPurchase.mfsName || selectedPurchase.mfsPhone) && (
                  <span
                    className="text-[9.5px] text-gray-700 bg-purple-100/70 px-1 rounded font-normal truncate max-w-[85px]"
                    title={`${selectedPurchase.mfsName || ""} ${selectedPurchase.mfsPhone || ""}`}
                  >
                    {selectedPurchase.mfsName || selectedPurchase.mfsPhone}
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

      {/* Section 2: Return Items Table with Full vs Partial Mode */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Return Mode Selection Toolbar */}
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
              Selected:{" "}
              <span className="text-black font-normal">
                {totals.selectedItemCount} items ({totals.totalPieces} pcs)
              </span>
            </span>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            Please search and select a purchase invoice / order number above to load items.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-[#41bef3] text-black border-b border-gray-200 text-[11px] font-semibold shadow-xs">
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

                      {/* Purchased Qty */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <span className="text-black bg-gray-100 px-2 py-0.5 rounded text-[11px] font-medium">
                            {line.purchasedQuantity}
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

                      {/* Available Qty */}
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

                      {/* Return Qty with Steppers and Full Button */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {isFullyReturned || isCurrentPurchaseAlreadyReturned ? (
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
                              disabled={line.quantity <= 0 || isCurrentPurchaseAlreadyReturned}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-black font-normal text-xs disabled:opacity-40 cursor-pointer"
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
                              className="w-12 py-1 text-center text-xs font-normal text-black focus:outline-none border-x border-gray-300 disabled:bg-gray-100 disabled:text-black"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, line.quantity + 1)}
                              disabled={line.quantity >= line.availableQuantity || isCurrentPurchaseAlreadyReturned}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-black font-normal text-xs disabled:opacity-40 cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetLineFullQty(idx)}
                              disabled={isCurrentPurchaseAlreadyReturned}
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
                          disabled={isFullyReturned || !line.isSelected || isCurrentPurchaseAlreadyReturned}
                          value={line.returnReason || "damaged_product"}
                          onChange={(e) => handleReturnReasonChange(idx, e.target.value)}
                          className="w-full min-w-[175px] h-7 px-2 text-[11px] border border-gray-300 rounded bg-white text-black font-semibold focus:outline-none focus:border-[var(--primary-color)] disabled:bg-gray-100 disabled:text-black cursor-pointer disabled:cursor-not-allowed"
                        >
                          {PURCHASE_RETURN_REASONS.map((r) => (
                            <option key={r.value} value={r.value} className="text-black font-semibold">
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Buy Price */}
                      <td className="py-2 px-2 text-right whitespace-nowrap font-normal text-black text-xs">
                        ৳ {formatMoney(line.buyPrice)}
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
            placeholder="Type notes or remarks about return reason, supplier credit agreement, condition..."
            className="w-full p-2.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--primary-color)] resize-none leading-relaxed text-black placeholder:text-gray-400 bg-gray-50/30 hover:bg-white focus:bg-white transition-colors font-normal"
          />

          {/* Quick preset remarks */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-black font-normal">Quick:</span>
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
                className="px-2 py-0.5 text-[10px] rounded-md bg-gray-100 hover:bg-[var(--primary-color-light)] hover:text-[var(--primary-color)] text-black border border-gray-200 transition-colors cursor-pointer font-normal"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column (span-7): Payment Refunded Section */}
        <div className="lg:col-span-7 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
          {/* Header & View-Only Status */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-bold text-black tracking-wider flex items-center gap-1.5">
              <FaWallet size={11} className="text-black" />
              Payment Refunded
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-black border border-gray-200 select-none">
              <FaLock size={8} className="text-black" />
              Auto-filled (View Only)
            </span>
          </div>

          {/* Payment Breakdown Cards - Display Only */}
          <div className="flex flex-col gap-1.5">
            {/* 1. Cash Card */}
            <div
              className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
                numRefundCash > 0
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-gray-200 bg-gray-50/40 opacity-70"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                    numRefundCash > 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-black"
                  }`}
                >
                  <FaMoneyBillWave size={11} />
                </div>
                <span className="font-bold text-[11px] text-black tracking-wider">CASH</span>
              </div>

              <div
                className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                  numRefundCash > 0
                    ? "border-emerald-500 bg-white"
                    : "border-gray-200 bg-gray-100/70"
                }`}
              >
                <span className="text-[11px] text-black font-normal px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
                  {numRefundCash > 0 ? "৳" : "—"}
                </span>
                <input
                  type="text"
                  readOnly
                  disabled
                  tabIndex={-1}
                  placeholder="N/A"
                  value={numRefundCash > 0 ? numRefundCash.toString() : "N/A"}
                  className="w-full text-right px-1.5 text-xs font-normal text-black outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-black"
                />
              </div>
            </div>

            {/* 2. Bank Card */}
            <div
              className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
                numRefundBank > 0
                  ? "border-sky-400 bg-sky-50/30"
                  : "border-gray-200 bg-gray-50/40 opacity-70"
              }`}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                    numRefundBank > 0
                      ? "bg-sky-100 text-sky-700"
                      : "bg-gray-100 text-black"
                  }`}
                >
                  <FaCreditCard size={11} />
                </div>
                <span className="font-bold text-[11px] text-black tracking-wider shrink-0">BANK</span>
                <select
                  disabled
                  value={selectedRefundBankId}
                  className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-200 rounded bg-gray-50 text-black font-normal cursor-not-allowed truncate select-none"
                >
                  <option value="" className="text-black font-normal">
                    {numRefundBank > 0 ? "Bank Account" : "N/A"}
                  </option>
                  {registeredBankAccounts.map((b) => (
                    <option key={b.id || b.bankId || b._id} value={b.id || b.bankId || b._id} className="text-black">
                      {b.bankName || b.name}
                      {b.accountNo || b.bankAccountNumber || b.bankAccountNo
                        ? ` – ${b.accountNo || b.bankAccountNumber || b.bankAccountNo}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                  numRefundBank > 0
                    ? "border-sky-500 bg-white"
                    : "border-gray-200 bg-gray-100/70"
                }`}
              >
                <span className="text-[11px] text-black font-normal px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
                  {numRefundBank > 0 ? "৳" : "—"}
                </span>
                <input
                  type="text"
                  readOnly
                  disabled
                  tabIndex={-1}
                  placeholder="N/A"
                  value={numRefundBank > 0 ? numRefundBank.toString() : "N/A"}
                  className="w-full text-right px-1.5 text-xs font-normal text-black outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-black"
                />
              </div>
            </div>

            {/* 3. MFS Card */}
            <div
              className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
                numRefundMfs > 0
                  ? "border-purple-400 bg-purple-50/30"
                  : "border-gray-200 bg-gray-50/40 opacity-70"
              }`}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                    numRefundMfs > 0
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-black"
                  }`}
                >
                  <FaMobileAlt size={11} />
                </div>
                <span className="font-bold text-[11px] text-black tracking-wider shrink-0">MFS</span>
                <select
                  disabled
                  value={selectedRefundMfsId}
                  className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-200 rounded bg-gray-50 text-black font-normal cursor-not-allowed truncate select-none"
                >
                  <option value="" className="text-black font-normal">
                    {numRefundMfs > 0 ? "MFS Account" : "N/A"}
                  </option>
                  {registeredMfsAccounts.map((m) => {
                    const nameVal = m.name || m.mfsName || m.method || "MFS";
                    const phoneVal = m.phoneNumber || m.mfsPhone || m.phone || "";
                    return (
                      <option key={m.id || m.mfsId || m._id} value={m.id || m.mfsId || m._id} className="text-black">
                        {nameVal}
                        {phoneVal ? ` – ${phoneVal}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div
                className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                  numRefundMfs > 0
                    ? "border-purple-500 bg-white"
                    : "border-gray-200 bg-gray-100/70"
                }`}
              >
                <span className="text-[11px] text-black font-normal px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
                  {numRefundMfs > 0 ? "৳" : "—"}
                </span>
                <input
                  type="text"
                  readOnly
                  disabled
                  tabIndex={-1}
                  placeholder="N/A"
                  value={numRefundMfs > 0 ? numRefundMfs.toString() : "N/A"}
                  className="w-full text-right px-1.5 text-xs font-normal text-black outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-black"
                />
              </div>
            </div>

            {/* 4. Due Adjustment Card */}
            {(origDueAmount > 0 || numRefundDue > 0) && (
              <div
                className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs select-none ${
                  numRefundDue > 0
                    ? "border-rose-400 bg-rose-50/30"
                    : "border-gray-200 bg-gray-50/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center shrink-0 font-bold text-[11px] ${
                      numRefundDue > 0
                        ? "bg-rose-100 text-rose-700"
                        : "bg-gray-100 text-black"
                    }`}
                  >
                    ৳
                  </div>
                  <div>
                    <span className="font-bold text-[11px] text-black tracking-wider block leading-tight">
                      DUE ADJUST
                    </span>
                    <span className="text-[9.5px] text-black font-normal block leading-none">
                      Max: ৳{formatMoney(origDueAmount)}
                    </span>
                  </div>
                </div>

                <div
                  className={`flex items-center h-6.5 rounded border overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                    numRefundDue > 0
                      ? "border-rose-500 bg-white"
                      : "border-gray-200 bg-gray-100/70"
                  }`}
                >
                  <span className="text-[11px] text-black font-normal px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
                    {numRefundDue > 0 ? "৳" : "—"}
                  </span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    tabIndex={-1}
                    placeholder="N/A"
                    value={numRefundDue > 0 ? numRefundDue.toString() : "N/A"}
                    className="w-full text-right px-1.5 text-xs font-normal text-black outline-none bg-transparent cursor-not-allowed select-none h-full placeholder:text-black"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Financial Settlement Summary Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-gray-200/90 pt-1.5 items-center">
            {/* Total Refunded Card */}
            <div className="bg-emerald-50/90 px-2.5 py-1 rounded-md border border-emerald-200/90 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                <span className="text-[10.5px] font-bold text-emerald-950 tracking-wide">
                  Total Refunded
                </span>
                <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  {totalRefundAllocated >= totals.refundAmount && totals.refundAmount > 0
                    ? "SETTLED"
                    : totalRefundAllocated > 0
                    ? "PARTIAL"
                    : "UNALLOCATED"}
                </span>
              </div>
              <span className="text-xs sm:text-[13px] font-extrabold text-emerald-800">
                ৳ {formatMoney(totalRefundAllocated)}
              </span>
            </div>

            {/* Remaining / Due Balance Card */}
            <div
              className={`px-2.5 py-1 rounded-md border flex items-center justify-between transition-colors shadow-2xs ${
                refundDifference > 0.01
                  ? "bg-rose-50/90 border-rose-200/90"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block ${
                    refundDifference > 0.01 ? "bg-rose-600" : "bg-gray-400"
                  }`}
                />
                <span
                  className={`text-[10.5px] font-bold tracking-wide ${
                    refundDifference > 0.01 ? "text-rose-950" : "text-gray-700"
                  }`}
                >
                  {refundDifference > 0.01 ? "Unallocated Balance" : "Due Balance"}
                </span>
                {refundDifference > 0.01 && (
                  <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-rose-100 text-rose-800">
                    PENDING
                  </span>
                )}
              </div>
              <span
                className={`text-xs sm:text-[13px] font-extrabold ${
                  refundDifference > 0.01 ? "text-rose-600" : "text-black"
                }`}
              >
                ৳ {formatMoney(refundDifference > 0.01 ? refundDifference : 0)}
              </span>
            </div>
          </div>
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