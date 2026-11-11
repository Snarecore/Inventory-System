import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import {
  FaUndoAlt,
  FaSearch,
  FaTimes,
  FaFileInvoice,
  FaCalendarAlt,
  FaUser,
  FaTruck,
  FaBoxOpen,
  FaCheckCircle,
  FaPrint,
  FaExclamationTriangle,
  FaArrowLeft,
} from "react-icons/fa";
import Button from "@/components/button/Button";
import ConfirmModal from "@/components/modal/ConfirmModal";
import DatePicker from "@/components/common/DatePicker";
import TextInput from "@/components/form/TextInput";
import apiConfig from "@/config/api.json";
import {
  salesAndReturnQueryKey,
  salesListQueryKey,
  purchaseAndReturnQueryKey,
  purchaseListQueryKey,
  productListQueryKey,
  productQueryKey,
  dashboardQueryKey,
  customersDueQueryKey,
  customerInvoicesDueQueryKey,
} from "@/config/query-key";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import { cashLeg, bankLeg, mfsLeg, type TradeTender } from "@/services/financial-ledger-service";
import { buildAccessUser, withBranchScope } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { useDebounce } from "@/hooks/useDebounce";
import { RETURN_REASONS, PURCHASE_RETURN_REASONS } from "@/pages/admin/trade/constants/returnReasons";
import { useTradeRefund } from "@/hooks/useTradeRefund";
import TradeRefundSection from "@/components/trade/TradeRefundSection";
import TradeInvoiceModal from "@/components/invoice/TradeInvoiceModal";
import { normalizeSalesReturnInvoice, normalizePurchaseReturnInvoice } from "@/components/invoice/trade-invoice-adapters";
import { usePermission } from "@/hooks/usePermission";
import { savePersistedTradeReturn } from "@/utils/trade-return-storage";

export interface TradeReturnLineItem {
  id: string | number;
  productId: string | number;
  productCode: string;
  productName: string;
  unit: string;
  originalQuantity: number;
  alreadyReturnedQuantity: number;
  availableQuantity: number;
  quantity: number;
  sellPrice: number;
  discount?: number;
  vat?: number;
  lineTotal: number;
  returnReason: string;
  isSelected: boolean;
}

export interface TradeReturnFormProps {
  mode: "sale" | "purchase";
}

export const TradeReturnForm: React.FC<TradeReturnFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { recordTradeLedger } = useFinancialLedger();

  const isSale = mode === "sale";
  const { canCreate } = usePermission();
  const canCreateReturn = canCreate(isSale ? "sales_return" : "purchase_return") || canCreate(isSale ? "sales" : "purchase");
  const partyLabel = isSale ? "Customer" : "Supplier";
  const invoiceLabel = isSale ? "Sales Invoice" : "Purchase Invoice";
  const reasonsList = isSale ? RETURN_REASONS : PURCHASE_RETURN_REASONS;

  // Selected Order / Invoice
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const debouncedInvoiceQuery = useDebounce(invoiceQuery, 250);
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState(false);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // Return Header Fields
  const [returnDate, setReturnDate] = useState(moment().format("YYYY-MM-DD"));
  const [status] = useState("Return");
  const [note, setNote] = useState("");

  // Customer / Supplier Info
  const [partyId, setPartyId] = useState<string | number | undefined>(undefined);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [refOrderOrChallan, setRefOrderOrChallan] = useState("");

  // Line items
  const [lines, setLines] = useState<TradeReturnLineItem[]>([]);
  const [hasJustSubmitted, setHasJustSubmitted] = useState(false);
  const hasInitializedStateOrderRef = useRef(false);

  // Modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [createdReturnItem, setCreatedReturnItem] = useState<any | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial Accounts
  const { registeredBankAccounts, registeredMfsAccounts } = useFinancialAccounts();

  // Load candidate orders list
  const [apiOrdersAndReturnData, setApiOrdersAndReturnData] = useState<any[]>([]);

  const fetchOrdersAndReturnList = useCallback(async () => {
    try {
      const endpoint = isSale
        ? apiConfig.salesReturn?.getSalesAndReturnUrl || apiConfig.sales?.salesAndReturnUrl || "get-sales-and-return"
        : apiConfig.purchaseReturn?.getPurchaseAndReturnListUrl || "get-purchase-and-return-list";

      const fallbackEndpoint = isSale
        ? apiConfig.sales?.salesListUrl || "get-sale-list"
        : apiConfig.purchase?.purchaseListUrl || "get-purchase-list";

      const body = { accessUser: buildAccessUser() };
      let res: any = await postData({ url: endpoint, body });

      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (res && typeof res === "object") {
        list = res.salesAndReturnList || res.purchaseAndReturnList || res.purchaseList || res.salesList || res.data || [];
      }

      if (list.length === 0 && fallbackEndpoint) {
        const fallbackRes: any = await postData({ url: fallbackEndpoint, body });
        if (Array.isArray(fallbackRes)) list = fallbackRes;
        else if (fallbackRes && typeof fallbackRes === "object") {
          list = fallbackRes.salesList || fallbackRes.purchaseList || fallbackRes.data || [];
        }
      }

      setApiOrdersAndReturnData(list);
    } catch (err) {
      console.error(`Failed to load ${mode} and returns list:`, err);
    }
  }, [isSale, mode]);

  useEffect(() => {
    fetchOrdersAndReturnList();
  }, [fetchOrdersAndReturnList]);

  // Indexing candidates
  const { candidateOrders } = useMemo(() => {
    const candidateMap = new Map<string, any>();
    const idx = new Map<string, any>();

    const cleanKey = (val: any) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    const addIndex = (prefix: string, keyVal: string, item: any) => {
      const cleaned = cleanKey(keyVal);
      if (cleaned) {
        idx.set(`${prefix}:${cleaned}`, item);
        idx.set(`EXACT:${cleaned}`, item);
      }
    };

    const addCandidate = (item: any) => {
      if (!item || typeof item !== "object") return;
      const isReturnRecord =
        Boolean(item.hasReturn) ||
        Boolean(item.returnNo) ||
        Boolean(item.returnGrandTotal) ||
        (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
        (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

      if (isReturnRecord) return;

      const itemInv = isSale
        ? String(item.salesInvoiceNo || item.invoiceNo || "").trim()
        : String(item.purchaseInvoiceNo || item.invoiceNo || "").trim();

      const itemRef = isSale
        ? String(item.orderNo || "").trim()
        : String(item.challanNo || "").trim();

      const itemId = String(item.id || item.saleId || item.purchaseId || "").trim();

      const uniqueKey = itemInv || itemRef || itemId;
      if (!uniqueKey || candidateMap.has(uniqueKey)) return;

      candidateMap.set(uniqueKey, item);

      if (itemInv) addIndex("INV", itemInv, item);
      if (itemRef) addIndex("REF", itemRef, item);
      if (itemId) addIndex("ID", itemId, item);
    };

    if (Array.isArray(apiOrdersAndReturnData)) {
      apiOrdersAndReturnData.forEach((item) => addCandidate(item));
    }

    return {
      candidateOrders: Array.from(candidateMap.values()),
      orderIndex: idx,
    };
  }, [apiOrdersAndReturnData, isSale]);

  // Check if an order is already returned
  const isOrderAlreadyReturned = useCallback(
    (order: any): boolean => {
      if (!order) return false;
      const cleanKey = (val: any) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      const targetInv = cleanKey(isSale ? (order.salesInvoiceNo || order.invoiceNo) : (order.purchaseInvoiceNo || order.invoiceNo));
      const targetRef = cleanKey(isSale ? order.orderNo : order.challanNo);
      const targetId = cleanKey(order.id || (isSale ? order.saleId : order.purchaseId));

      return (apiOrdersAndReturnData || []).some((item: any) => {
        const isReturn =
          Boolean(item.hasReturn) ||
          Boolean(item.returnNo) ||
          Boolean(item.returnGrandTotal) ||
          (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
          (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

        if (!isReturn) return false;

        const retInv = cleanKey(isSale ? (item.salesInvoiceNo || item.invoiceNo) : (item.purchaseInvoiceNo || item.invoiceNo));
        const retRef = cleanKey(isSale ? item.orderNo : item.challanNo);
        const retSaleId = cleanKey(isSale ? (item.saleId || item.sale_id) : (item.purchaseId || item.purchase_id));

        if (targetInv && retInv && targetInv === retInv) return true;
        if (targetRef && retRef && targetRef === retRef) return true;
        if (targetId && retSaleId && targetId === retSaleId) return true;
        return false;
      });
    },
    [apiOrdersAndReturnData, isSale]
  );

  // Returned quantities map
  const getReturnedQuantitiesForOrder = useCallback(
    (order: any) => {
      const returnedQtyMap: Record<string, number> = {};
      if (!order) return returnedQtyMap;

      const cleanKey = (val: any) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const targetInv = cleanKey(isSale ? (order.salesInvoiceNo || order.invoiceNo) : (order.purchaseInvoiceNo || order.invoiceNo));
      const targetRef = cleanKey(isSale ? order.orderNo : order.challanNo);

      const processDetailsList = (details: any[]) => {
        if (!Array.isArray(details)) return;
        details.forEach((d: any) => {
          const pId = String(d.productId || d.id || "").trim();
          const pCode = cleanKey(d.productCode || d.pcode);
          const pName = String(d.productName || d.name || "").trim().toLowerCase();
          const qty = Number(d.quantity || d.returnedQuantity || d.returnQuantity || 0);

          if (qty > 0) {
            if (pId) returnedQtyMap[`id_${pId}`] = (returnedQtyMap[`id_${pId}`] || 0) + qty;
            if (pCode) returnedQtyMap[`code_${pCode}`] = (returnedQtyMap[`code_${pCode}`] || 0) + qty;
            if (pName) returnedQtyMap[`name_${pName}`] = (returnedQtyMap[`name_${pName}`] || 0) + qty;
          }
        });
      };

      (apiOrdersAndReturnData || []).forEach((item: any) => {
        const isReturn =
          Boolean(item.hasReturn) ||
          Boolean(item.returnNo) ||
          Boolean(item.returnGrandTotal) ||
          (Array.isArray(item.returnDetails) && item.returnDetails.length > 0) ||
          (Array.isArray(item.purchaseReturnDetails) && item.purchaseReturnDetails.length > 0);

        if (!isReturn) return false;

        const retInv = cleanKey(isSale ? (item.salesInvoiceNo || item.invoiceNo) : (item.purchaseInvoiceNo || item.invoiceNo));
        const retRef = cleanKey(isSale ? item.orderNo : item.challanNo);

        const matches = (targetInv && retInv && targetInv === retInv) || (targetRef && retRef && targetRef === retRef);
        if (matches) {
          processDetailsList(item.returnDetails || item.purchaseReturnDetails || item.details);
        }
      });

      return returnedQtyMap;
    },
    [apiOrdersAndReturnData, isSale]
  );

  // Load order into form
  const loadOrder = useCallback(
    (order: any) => {
      if (!order) return;
      setSelectedOrder(order);

      const inv = isSale
        ? String(order.salesInvoiceNo || order.invoiceNo || order.orderNo || "").trim()
        : String(order.purchaseInvoiceNo || order.invoiceNo || order.challanNo || "").trim();

      const ref = isSale
        ? String(order.orderNo || order.invoiceNo || "").trim()
        : String(order.challanNo || order.invoiceNo || "").trim();

      setInvoiceNo(inv);
      setRefOrderOrChallan(ref);
      setInvoiceQuery(inv || ref);

      if (isSale) {
        setPartyId(order.customerId || order.customer_id);
        setPartyName(order.customerName || order.customer_name || "Customer");
        setPartyPhone(order.customerPhone || order.customer_phone || "");
        setPartyAddress(order.customerAddress || order.customer_address || "");
      } else {
        setPartyId(order.supplierId || order.supplier_id);
        setPartyName(order.supplierName || order.supplier_name || "Supplier");
        setPartyPhone(order.supplierPhone || order.supplier_phone || "");
        setPartyAddress(order.supplierAddress || order.supplier_address || "");
      }

      const returnedQtyMap = getReturnedQuantitiesForOrder(order);

      let rawDetails =
        (Array.isArray(order.salesDetails) && order.salesDetails.length > 0 && order.salesDetails) ||
        (Array.isArray(order.purchaseDetails) && order.purchaseDetails.length > 0 && order.purchaseDetails) ||
        (Array.isArray(order.saleDetails) && order.saleDetails.length > 0 && order.saleDetails) ||
        (Array.isArray(order.saleDetailsList) && order.saleDetailsList.length > 0 && order.saleDetailsList) ||
        (Array.isArray(order.details) && order.details.length > 0 && order.details) ||
        (Array.isArray(order.items) && order.items.length > 0 && order.items) ||
        (Array.isArray(order.products) && order.products.length > 0 && order.products) ||
        [];

      // If line items were not present on router state order, look up in candidate orders
      if (rawDetails.length === 0 && Array.isArray(apiOrdersAndReturnData) && apiOrdersAndReturnData.length > 0) {
        const fullMatched = apiOrdersAndReturnData.find((cand: any) => {
          const matchInv = inv && String(cand.salesInvoiceNo || cand.invoiceNo || "").trim().toLowerCase() === inv.toLowerCase();
          const matchRef = ref && String(cand.orderNo || cand.challanNo || "").trim().toLowerCase() === ref.toLowerCase();
          const matchId = String(cand.id || cand.saleId || "").trim() === String(order.id || order.saleId || "").trim();
          return matchInv || matchRef || matchId;
        });
        if (fullMatched) {
          rawDetails =
            (Array.isArray(fullMatched.salesDetails) && fullMatched.salesDetails.length > 0 && fullMatched.salesDetails) ||
            (Array.isArray(fullMatched.purchaseDetails) && fullMatched.purchaseDetails.length > 0 && fullMatched.purchaseDetails) ||
            (Array.isArray(fullMatched.saleDetails) && fullMatched.saleDetails.length > 0 && fullMatched.saleDetails) ||
            (Array.isArray(fullMatched.saleDetailsList) && fullMatched.saleDetailsList.length > 0 && fullMatched.saleDetailsList) ||
            (Array.isArray(fullMatched.details) && fullMatched.details.length > 0 && fullMatched.details) ||
            (Array.isArray(fullMatched.items) && fullMatched.items.length > 0 && fullMatched.items) ||
            (Array.isArray(fullMatched.products) && fullMatched.products.length > 0 && fullMatched.products) ||
            [];
        }
      }

      // Single item fallback if order total exists but backend provided no line array
      if (rawDetails.length === 0 && Number(order.grandTotal || order.totalAmount || 0) > 0) {
        rawDetails = [{
          productId: order.productId || order.id || "1",
          productCode: order.orderNo || "ITEM-1",
          productName: `Order #${order.orderNo || order.invoiceNo || order.id || "Item"}`,
          unit: "pcs",
          quantity: 1,
          sellPrice: Number(order.grandTotal || order.totalAmount || 0),
          buyPrice: Number(order.grandTotal || order.totalAmount || 0),
          total: Number(order.grandTotal || order.totalAmount || 0),
        }];
      }

      const cleanKey = (val: any) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      const newLines: TradeReturnLineItem[] = rawDetails.map((item: any, idx: number) => {
        const pId = String(item.productId || item.id || `p_${idx}`).trim();
        const pCode = String(item.productCode || item.pcode || "").trim();
        const pName = String(item.productName || item.name || "Product").trim();
        const unit = String(item.unit || item.secondary_unit || item.secondaryUnit || "pcs");
        const price = Number(isSale ? (item.sellPrice || item.rate || 0) : (item.buyPrice || item.purchasePrice || item.rate || 0));
        const originalQty = Number(item.quantity || item.qty || 1);

        const directReturned = Number(item.returnedQuantity || item.returnQuantity || 0);
        const mapReturned =
          (pId && returnedQtyMap[`id_${pId}`]) ||
          (pCode && returnedQtyMap[`code_${cleanKey(pCode)}`]) ||
          (pName && returnedQtyMap[`name_${pName.toLowerCase()}`]) ||
          0;

        const alreadyReturned = Math.max(directReturned, mapReturned);
        const availableQty = Math.max(0, originalQty - alreadyReturned);

        return {
          id: pId,
          productId: pId,
          productCode: pCode,
          productName: pName,
          unit,
          originalQuantity: originalQty,
          alreadyReturnedQuantity: alreadyReturned,
          availableQuantity: availableQty,
          quantity: availableQty > 0 ? availableQty : 0,
          sellPrice: price,
          discount: Number(item.discount || 0),
          vat: Number(item.vat || 0),
          lineTotal: Number((availableQty * price).toFixed(2)),
          returnReason: reasonsList[0]?.value || "wrong_order",
          isSelected: availableQty > 0,
        };
      });

      setLines(newLines);
    },
    [getReturnedQuantitiesForOrder, isSale, reasonsList, apiOrdersAndReturnData]
  );

  // Check router location state on mount - initialized once to protect user input
  useEffect(() => {
    const stateOrder = isSale ? location.state?.sale : location.state?.purchase;
    if (stateOrder && !hasJustSubmitted && !hasInitializedStateOrderRef.current) {
      hasInitializedStateOrderRef.current = true;
      if (isOrderAlreadyReturned(stateOrder)) {
        showErrorToast(`Order #${stateOrder.orderNo || stateOrder.invoiceNo || stateOrder.challanNo} has already been returned.`);
        navigate(isSale ? "/admin/sales" : "/admin/purchases");
        return;
      }
      loadOrder(stateOrder);
    }
  }, [location.state, isSale, isOrderAlreadyReturned, loadOrder, hasJustSubmitted, navigate]);

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(e.target as Node)) {
        setIsInvoiceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered dropdown candidates
  const filteredCandidates = useMemo(() => {
    if (!debouncedInvoiceQuery.trim()) return candidateOrders.slice(0, 10);
    const q = debouncedInvoiceQuery.toLowerCase().trim();
    return candidateOrders
      .filter((item: any) => {
        const inv = String(isSale ? (item.salesInvoiceNo || item.invoiceNo || "") : (item.purchaseInvoiceNo || item.invoiceNo || "")).toLowerCase();
        const ref = String(isSale ? (item.orderNo || "") : (item.challanNo || "")).toLowerCase();
        const pName = String(isSale ? (item.customerName || "") : (item.supplierName || "")).toLowerCase();
        const pPhone = String(isSale ? (item.customerPhone || "") : (item.supplierPhone || "")).toLowerCase();
        return inv.includes(q) || ref.includes(q) || pName.includes(q) || pPhone.includes(q);
      })
      .slice(0, 15);
  }, [candidateOrders, debouncedInvoiceQuery, isSale]);

  // Totals
  const totals = useMemo(() => {
    let subtotal = 0;
    lines.forEach((l) => {
      if (l.isSelected && l.quantity > 0) {
        subtotal += Number(l.lineTotal || 0);
      }
    });

    const disc = 0;
    const vat = 0;
    const delivery = 0;
    const grand = Math.max(0, subtotal - disc + vat + delivery);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discount: disc,
      vat,
      deliveryCharge: delivery,
      grandTotal: Number(grand.toFixed(2)),
      refundAmount: Number(grand.toFixed(2)),
    };
  }, [lines]);

  // Refund management hook
  const tradeRefund = useTradeRefund({
    selectedRecord: selectedOrder,
    refundAmount: totals.refundAmount,
    registeredBankAccounts,
    registeredMfsAccounts,
    autoSyncCash: true,
    priority: isSale ? "cash_first" : "due_first",
  });

  const {
    refundCash,
    refundBank,
    refundMfs,
    refundDue,
    selectedRefundBankId,
    selectedRefundMfsId,
    numRefundCash,
    numRefundBank,
    numRefundMfs,
    numRefundDue,
    totalRefundAllocated,
    refundDifference,
    handleRefundCashChange,
    handleRefundBankChange,
    handleRefundMfsChange,
    handleRefundDueChange,
    handleSelectRefundBank,
    handleSelectRefundMfs,
  } = tradeRefund;

  // Toggle mode helpers
  const handleSetReturnMode = (modeType: "FULL" | "PARTIAL") => {
    setLines((prev) =>
      prev.map((l) => {
        const q = modeType === "FULL" ? l.availableQuantity : 0;
        return {
          ...l,
          quantity: q,
          isSelected: q > 0,
          lineTotal: Number((q * l.sellPrice).toFixed(2)),
        };
      })
    );
  };

  const handleClearAllQty = () => {
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        quantity: 0,
        isSelected: false,
        lineTotal: 0,
      }))
    );
  };

  // Line updates
  const handleToggleLine = (idx: number) => {
    setLines((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx] };
      target.isSelected = !target.isSelected;
      if (target.isSelected && target.quantity === 0) {
        target.quantity = target.availableQuantity;
        target.lineTotal = Number((target.quantity * target.sellPrice).toFixed(2));
      }
      copy[idx] = target;
      return copy;
    });
  };

  const handleQuantityChange = (idx: number, val: number) => {
    setLines((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx] };
      const clamped = Math.max(0, Math.min(val, target.availableQuantity));
      target.quantity = clamped;
      target.isSelected = clamped > 0;
      target.lineTotal = Number((clamped * target.sellPrice).toFixed(2));
      copy[idx] = target;
      return copy;
    });
  };

  const handleReasonChange = (idx: number, reason: string) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], returnReason: reason };
      return copy;
    });
  };

  // Submit Pre-check
  const handlePreSubmit = (autoPrint: boolean) => {
    if (!canCreateReturn) {
      showErrorToast(`You do not have permission to process ${isSale ? "sales" : "purchase"} returns.`);
      return;
    }

    if (!selectedOrder) {
      showErrorToast(`Please select a ${invoiceLabel} first.`);
      return;
    }

    const activeLines = lines.filter((l) => l.isSelected && l.quantity > 0);
    if (activeLines.length === 0) {
      showErrorToast("Please select at least one item with a valid return quantity.");
      return;
    }

    if (Math.abs(refundDifference) > 0.01) {
      showErrorToast(
        `Refund allocation mismatch! Total Grand Total is ৳${formatMoney(
          totals.refundAmount
        )}, but allocated refund is ৳${formatMoney(totalRefundAllocated)}.`
      );
      return;
    }

    setAutoPrintInvoice(autoPrint);
    setIsConfirmModalOpen(true);
  };

  // Confirm Submit
  const handleSubmitReturn = async () => {
    setIsSubmitting(true);
    try {
      const activeLines = lines.filter((l) => l.isSelected && l.quantity > 0);
      const finalNote = note.trim() || (invoiceNo ? `Return from ${invoiceNo}` : "");

      const returnDetailsPayload = activeLines.map((l) => ({
        productId: l.productId,
        productCode: l.productCode,
        productName: l.productName,
        unit: l.unit,
        quantity: l.quantity,
        returnQuantity: l.quantity,
        sellPrice: l.sellPrice,
        discount: l.discount || 0,
        vat: l.vat || 0,
        total: Number((l.quantity * l.sellPrice).toFixed(2)),
        returnReason: l.returnReason || reasonsList[0]?.value || "wrong_order",
      }));

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

      const matchedBank = registeredBankAccounts.find((b) => String(b.id) === String(selectedRefundBankId));
      const matchedMfs = registeredMfsAccounts.find((m) => String(m.id) === String(selectedRefundMfsId));

      const payload: Record<string, any> = withBranchScope({
        accessUser: buildAccessUser(),
        returnDate,
        totalAmount: Number(totals.subtotal.toFixed(2)),
        discount: Number(totals.discount.toFixed(2)),
        vat: Number(totals.vat.toFixed(2)),
        deliveryCharge: 0,
        grandTotal: Number(totals.grandTotal.toFixed(2)),
        returnGrandTotal: Number(totals.grandTotal.toFixed(2)),
        returnTotalAmount: Number(totals.grandTotal.toFixed(2)),
        refundAmount: Number(totals.refundAmount.toFixed(2)),
        paymentType: effectivePaymentType,
        status: status || "Return",
        note: finalNote,
        refNo: `${isSale ? "SR" : "PR"}-${Date.now()}`,
        osType: "WEB",
        cashReceived: numRefundCash,
        cardReceived: numRefundBank,
        mfsReceived: numRefundMfs,
        dueAmount: numRefundDue,
        bankId: numRefundBank > 0 ? selectedRefundBankId : null,
        bankName: numRefundBank > 0 ? matchedBank?.bankName || null : null,
        accountNo: numRefundBank > 0 ? matchedBank?.accountNo || null : null,
        mfsId: numRefundMfs > 0 ? selectedRefundMfsId : null,
        mfsName: numRefundMfs > 0 ? matchedMfs?.mfsName || null : null,
        mfsPhone: numRefundMfs > 0 ? matchedMfs?.mfsPhone || null : null,
        returnDetails: returnDetailsPayload,
      });

      if (isSale) {
        payload.invoiceNo = invoiceNo || selectedOrder?.orderNo || "";
        payload.salesInvoiceNo = invoiceNo || selectedOrder?.orderNo || "";
        payload.orderNo = selectedOrder?.orderNo || invoiceNo || "";
        payload.saleId = selectedOrder?.id || selectedOrder?.saleId || null;
        payload.customerId = partyId;
        payload.customerName = partyName;
        payload.customerPhone = partyPhone;
        payload.customerAddress = partyAddress;
      } else {
        payload.invoiceNo = invoiceNo || selectedOrder?.challanNo || "";
        payload.purchaseInvoiceNo = invoiceNo || selectedOrder?.challanNo || "";
        payload.challanNo = selectedOrder?.challanNo || invoiceNo || "";
        payload.purchaseId = selectedOrder?.id || selectedOrder?.purchaseId || null;
        payload.supplierId = partyId;
        payload.supplierName = partyName;
        payload.supplierPhone = partyPhone;
        payload.supplierAddress = partyAddress;
      }

      const endpoint = isSale
        ? apiConfig.salesReturn.insertSalesReturnUrl
        : apiConfig.purchaseReturn.insertPurchaseReturnUrl;

      const response: any = await postData({ url: endpoint, body: payload });

      if (
        !response ||
        response?.error ||
        response?.status === "Error" ||
        response?.status === "Failed" ||
        (typeof response?.code === "number" && response.code >= 400)
      ) {
        const errorMsg = response?.msg || response?.message || `Failed to save ${mode} return. Please try again.`;
        showErrorToast(errorMsg);
        setIsSubmitting(false);
        setIsConfirmModalOpen(false);
        return;
      }

      const generatedReturnNo =
        response?.returnNo ||
        response?.data?.returnNo ||
        `${isSale ? "RET" : "PR"}-${moment().format("YYYYMMDD")}-${Math.floor(100 + Math.random() * 900)}`;

      const createdItem: any = {
        id: Date.now(),
        returnNo: generatedReturnNo,
        invoiceNo,
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
        returnDetails: returnDetailsPayload,
        itemsCount: activeLines.length,
        createdAt: new Date().toISOString(),
      };

      if (isSale) {
        createdItem.salesInvoiceNo = invoiceNo;
        createdItem.orderNo = selectedOrder?.orderNo;
        createdItem.customerId = partyId;
        createdItem.customerName = partyName;
        createdItem.customerPhone = partyPhone;
        createdItem.customerAddress = partyAddress;
      } else {
        createdItem.purchaseInvoiceNo = invoiceNo;
        createdItem.challanNo = selectedOrder?.challanNo;
        createdItem.supplierId = partyId;
        createdItem.supplierName = partyName;
        createdItem.supplierPhone = partyPhone;
        createdItem.supplierAddress = partyAddress;
      }

      if (isSale && selectedOrder) {
        savePersistedTradeReturn(selectedOrder, createdItem);
      }

      setHasJustSubmitted(true);

      // Invalidate relevant queries
      if (isSale) {
        queryClient.invalidateQueries({ queryKey: [salesAndReturnQueryKey] });
        queryClient.invalidateQueries({ queryKey: [salesListQueryKey] });
        queryClient.invalidateQueries({ queryKey: [customersDueQueryKey] });
        queryClient.invalidateQueries({ queryKey: [customerInvoicesDueQueryKey] });
      } else {
        queryClient.invalidateQueries({ queryKey: [purchaseAndReturnQueryKey] });
        queryClient.invalidateQueries({ queryKey: [purchaseListQueryKey] });
      }
      queryClient.invalidateQueries({ queryKey: [productListQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [productQueryKey], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "none" });

      // Financial Ledger entry
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
              type: isSale ? "EXPENSE" : "INCOME",
              categoryName: isSale ? "Customer Sales Return Refund" : "Supplier Purchase Return Refund",
              partyName,
              partyType: isSale ? "CUSTOMER" : "SUPPLIER",
              tenders: refundTenders,
              notes: `Auto ${isSale ? "Sales" : "Purchase"} Return: ${generatedReturnNo} (${itemSummary})`,
              refNo: generatedReturnNo,
              date: returnDate,
            });
          }
        } catch (ledgerErr) {
          console.warn("Ledger record warning:", ledgerErr);
        }
      }

      showSuccessToast(`${isSale ? "Sales" : "Purchase"} Return #${generatedReturnNo} created successfully!`);
      setCreatedReturnItem(createdItem);
      setIsConfirmModalOpen(false);
      setIsInvoiceModalOpen(true);
    } catch (err: any) {
      showErrorToast(err?.message || `Failed to create ${mode} return.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoiceModalClose = () => {
    setIsInvoiceModalOpen(false);
    navigate(isSale ? "/admin/sales?tab=returns" : "/admin/purchases?tab=returns");
  };

  const invoiceModalData = useMemo(() => {
    if (!createdReturnItem) return null;
    return isSale
      ? normalizeSalesReturnInvoice(createdReturnItem)
      : normalizePurchaseReturnInvoice(createdReturnItem);
  }, [createdReturnItem, isSale]);

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--ui-border)] pb-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(isSale ? "/admin/sales" : "/admin/purchases")}
            className="p-1.5 text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] rounded-md transition-colors cursor-pointer"
            title="Back to List"
          >
            <FaArrowLeft size={14} />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--ui-text)] flex items-center gap-2">
              <FaUndoAlt className="text-[var(--primary-color)]" size={16} />
              Create {isSale ? "Sales" : "Purchase"} Return
            </h1>
            <p className="text-xs text-[var(--ui-text-muted)]">
              Select an invoice/order to return items and process refund
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            label="Cancel"
            variant="outline"
            size="sm"
            onClick={() => navigate(isSale ? "/admin/sales" : "/admin/purchases")}
          />
          <Button
            label="Save Return"
            size="sm"
            color="var(--primary-color)"
            onClick={() => handlePreSubmit(false)}
            disabled={!selectedOrder || lines.filter((l) => l.isSelected && l.quantity > 0).length === 0}
          />
          <Button
            label="Save & Print"
            size="sm"
            color="var(--primary-color)"
            icon={<FaPrint size={12} />}
            onClick={() => handlePreSubmit(true)}
            disabled={!selectedOrder || lines.filter((l) => l.isSelected && l.quantity > 0).length === 0}
          />
        </div>
      </div>

      {/* Invoice Search Bar */}
      <div className="bg-[var(--ui-surface)] p-3 rounded-lg border border-[var(--ui-border)] shadow-xs relative" ref={invoiceDropdownRef}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 w-full relative">
            <div className="relative">
              <TextInput
                label={`Search ${invoiceLabel} / Order # / ${partyLabel}`}
                value={invoiceQuery}
                placeholder={`Type invoice number, order #, or ${partyLabel.toLowerCase()} name...`}
                onChange={(val) => {
                  setInvoiceQuery(val);
                  setIsInvoiceDropdownOpen(true);
                }}
                onFocus={() => setIsInvoiceDropdownOpen(true)}
                icon={<FaSearch className="text-[var(--ui-text-subtle)]" />}
              />
              {invoiceQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceQuery("");
                    setSelectedOrder(null);
                    setLines([]);
                  }}
                  className="absolute right-2.5 top-8 text-[var(--ui-text-subtle)] hover:text-[var(--ui-text)]"
                >
                  <FaTimes size={13} />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {isInvoiceDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-[var(--ui-surface)] border border-[var(--ui-border-strong)] rounded-lg shadow-lg z-50 divide-y divide-[var(--ui-border)]">
                {filteredCandidates.length > 0 ? (
                  filteredCandidates.map((c: any, idx: number) => {
                    const cInv = isSale ? (c.salesInvoiceNo || c.invoiceNo) : (c.purchaseInvoiceNo || c.invoiceNo);
                    const cRef = isSale ? c.orderNo : c.challanNo;
                    const cParty = isSale ? c.customerName : c.supplierName;
                    const cPhone = isSale ? c.customerPhone : c.supplierPhone;
                    const cTotal = c.grandTotal || c.totalAmount || 0;
                    const cDate = c.salesDate || c.purchaseDate || c.createdAt;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          loadOrder(c);
                          setIsInvoiceDropdownOpen(false);
                        }}
                        className="p-2.5 hover:bg-[var(--primary-color-light)]/40 cursor-pointer flex items-center justify-between transition-colors text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--ui-text)]">#{cInv || cRef || "N/A"}</span>
                            {cRef && <span className="text-[11px] text-[var(--ui-text-muted)]">({cRef})</span>}
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--ui-surface-sunken)] font-medium">
                              {cDate ? String(cDate).substring(0, 10) : ""}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--ui-text-muted)] mt-0.5">
                            {cParty || "Party"} {cPhone ? `• ${cPhone}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[var(--primary-color)]">৳ {formatMoney(cTotal)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-[var(--ui-text-muted)]">
                    No matching {isSale ? "sales" : "purchases"} found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Order Summary Card */}
        {selectedOrder && (
          <div className="mt-3 pt-3 border-t border-[var(--ui-border)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[var(--ui-text-muted)] block text-[11px]">{invoiceLabel}:</span>
              <span className="font-bold text-[var(--ui-text)]">#{invoiceNo || "N/A"}</span>
            </div>
            <div>
              <span className="text-[var(--ui-text-muted)] block text-[11px]">{isSale ? "Order #" : "Challan #"}:</span>
              <span className="font-medium text-[var(--ui-text)]">{refOrderOrChallan || "—"}</span>
            </div>
            <div>
              <span className="text-[var(--ui-text-muted)] block text-[11px]">{partyLabel}:</span>
              <span className="font-bold text-[var(--ui-text)]">{partyName || "Walk-in"}</span>
            </div>
            <div>
              <span className="text-[var(--ui-text-muted)] block text-[11px]">Original Amount:</span>
              <span className="font-bold text-[var(--primary-color)]">
                ৳ {formatMoney(selectedOrder.grandTotal || selectedOrder.totalAmount || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Column: Return Line Items Table (7 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-2.5">
          <div className="bg-[var(--ui-surface)] p-3 rounded-lg border border-[var(--ui-border)] shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--ui-text)] flex items-center gap-1.5">
                <FaBoxOpen className="text-[var(--primary-color)]" />
                Items to Return ({lines.filter((l) => l.isSelected && l.quantity > 0).length} Selected)
              </h2>

              {selectedOrder && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetReturnMode("FULL")}
                    className="px-2 py-1 text-[11px] font-semibold bg-[var(--primary-color-light)] text-[var(--primary-color)] hover:bg-[var(--primary-color-muted)] rounded transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllQty}
                    className="px-2 py-1 text-[11px] font-semibold bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] text-[var(--ui-text-muted)] rounded transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--ui-border-strong)] bg-[var(--ui-surface-muted)] text-[var(--ui-text)]">
                    <th className="py-2 px-2 w-8 text-center">✓</th>
                    <th className="py-2 px-2">Product</th>
                    <th className="py-2 px-2 text-right">Price</th>
                    <th className="py-2 px-2 text-center">Avail.</th>
                    <th className="py-2 px-2 text-center w-28">Return Qty</th>
                    <th className="py-2 px-2">Reason</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ui-border)]">
                  {lines.length > 0 ? (
                    lines.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={`transition-colors ${
                          item.isSelected ? "bg-[var(--primary-color-light)]/20" : "hover:bg-[var(--ui-surface-muted)]"
                        }`}
                      >
                        <td className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            disabled={item.availableQuantity <= 0}
                            onChange={() => handleToggleLine(idx)}
                            className="rounded border-[var(--ui-border-strong)] text-[var(--primary-color)] focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <span className="font-semibold text-[var(--ui-text)] block">{item.productName}</span>
                          <span className="text-[10px] text-[var(--ui-text-muted)]">
                            {item.productCode} • {item.unit}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          ৳ {formatMoney(item.sellPrice)}
                        </td>
                        <td className="py-2 px-2 text-center tabular-nums font-medium">
                          {item.availableQuantity}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="inline-flex items-center border border-[var(--ui-border-strong)] rounded overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                              disabled={item.quantity <= 0}
                              className="px-2 py-0.5 bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] disabled:opacity-40"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={item.availableQuantity}
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, Number(e.target.value) || 0)}
                              className="w-12 text-center font-bold tabular-nums text-xs border-x border-[var(--ui-border-strong)] py-0.5 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                              disabled={item.quantity >= item.availableQuantity}
                              className="px-2 py-0.5 bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={item.returnReason}
                            onChange={(e) => handleReasonChange(idx, e.target.value)}
                            className="w-full text-[11px] py-1 px-1.5 border border-[var(--ui-border-strong)] rounded bg-[var(--ui-surface)] text-[var(--ui-text)]"
                          >
                            {reasonsList.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[var(--ui-text)] tabular-nums">
                          ৳ {formatMoney(item.lineTotal)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--ui-text-muted)] text-xs">
                        {selectedOrder
                          ? "No line items available in this invoice."
                          : `Please search and select a ${invoiceLabel} to view items.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Return Info, Totals & Refund (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          {/* Header Settings Card */}
          <div className="bg-[var(--ui-surface)] p-3 rounded-lg border border-[var(--ui-border)] shadow-xs flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-[var(--ui-text)] flex items-center gap-1.5 border-b border-[var(--ui-border)] pb-2">
              <FaCalendarAlt className="text-[var(--primary-color)]" />
              Return Details
            </h3>

            <div>
              <DatePicker
                label="Return Date"
                value={returnDate}
                onChange={setReturnDate}
              />
            </div>

            <div>
              <TextInput
                label="Notes / Remarks"
                value={note}
                placeholder="Reason for return..."
                onChange={setNote}
              />
            </div>
          </div>

          {/* Refund Breakdown Section */}
          <div className="bg-[var(--ui-surface)] p-3 rounded-lg border border-[var(--ui-border)] shadow-xs flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-[var(--ui-text)] flex items-center justify-between border-b border-[var(--ui-border)] pb-2">
              <span>Return Summary</span>
              <span className="text-[var(--primary-color)] text-sm">৳ {formatMoney(totals.grandTotal)}</span>
            </h3>

            {/* Line Summary */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[var(--ui-text-muted)]">
                <span>Subtotal ({lines.filter((l) => l.isSelected && l.quantity > 0).length} items):</span>
                <span className="tabular-nums font-semibold text-[var(--ui-text)]">৳ {formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-[var(--ui-border)] text-[var(--ui-text)]">
                <span>Refund Grand Total:</span>
                <span className="tabular-nums text-[var(--primary-color)]">৳ {formatMoney(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Refund Tender Component */}
            <div className="pt-2 border-t border-[var(--ui-border)]">
              <TradeRefundSection
                refund={tradeRefund}
                refundAmount={totals.refundAmount}
                refundCash={refundCash}
                refundBank={refundBank}
                refundMfs={refundMfs}
                refundDue={refundDue}
                selectedRefundBankId={selectedRefundBankId}
                selectedRefundMfsId={selectedRefundMfsId}
                registeredBankAccounts={registeredBankAccounts}
                registeredMfsAccounts={registeredMfsAccounts}
                totalRefundAllocated={totalRefundAllocated}
                refundDifference={refundDifference}
                onRefundCashChange={handleRefundCashChange}
                onRefundBankChange={handleRefundBankChange}
                onRefundMfsChange={handleRefundMfsChange}
                onRefundDueChange={handleRefundDueChange}
                onSelectRefundBank={handleSelectRefundBank}
                onSelectRefundMfs={handleSelectRefundMfs}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              label={`Confirm & Save ${isSale ? "Sales" : "Purchase"} Return`}
              color="var(--primary-color)"
              size="md"
              onClick={() => handlePreSubmit(false)}
              disabled={!canCreateReturn || !selectedOrder || lines.filter((l) => l.isSelected && l.quantity > 0).length === 0}
            />
            <Button
              label="Save & Print Receipt"
              variant="outline"
              size="md"
              icon={<FaPrint size={13} />}
              onClick={() => handlePreSubmit(true)}
              disabled={!canCreateReturn || !selectedOrder || lines.filter((l) => l.isSelected && l.quantity > 0).length === 0}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleSubmitReturn}
        title={`Confirm ${isSale ? "Sales" : "Purchase"} Return`}
        message={`Are you sure you want to process this return of ৳ ${formatMoney(totals.grandTotal)} against invoice #${invoiceNo}?`}
        isLoading={isSubmitting}
      />

      {/* Unified Return Invoice / Receipt Modal */}
      {invoiceModalData && (
        <TradeInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={handleInvoiceModalClose}
          invoice={invoiceModalData}
          autoPrint={autoPrintInvoice}
        />
      )}
    </div>
  );
};

export default TradeReturnForm;
