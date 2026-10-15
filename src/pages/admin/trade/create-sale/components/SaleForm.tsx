import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";
import { FaTrash, FaSearch, FaBarcode, FaUserPlus, FaCheck, FaPlus, FaTimes, FaPrint, FaCalculator, FaMoneyBillWave, FaCreditCard, FaMobileAlt, FaWallet, FaWalking } from "react-icons/fa";
import Button from "@/components/button/Button";
import DeleteModal from "@/components/modal/DeleteModal";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PartyModal from "@/pages/admin/people/parties/components/PartyModal";
import SaleInvoiceModal from "@/pages/admin/trade/sales/components/SaleInvoiceModal";
import apiConfig from "@/config/api.json";
import {
  salesListQueryKey,
  productListQueryKey,
  partyListQueryKey,
  salesAndReturnQueryKey,
} from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { getBusinessCode, getUserInfo } from "@/utils/auth-storage";
import { makeInvoiceNo } from "@/utils/invoiceNo";
import { postData } from "@/services/api-service";
import { useAPI } from "@/hooks/useApi";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast, showDeleteToast } from "@/utils/toast-utils";
import { isPartyActive } from "@/utils/party-utils";
import { useFinancialAccounts } from "@/hooks/useFinancialAccounts";
import { useTradePayment } from "@/hooks/useTradePayment";
import TradePaymentSection from "@/components/trade/TradePaymentSection";
import { useTradeProductSearch } from "@/hooks/useTradeProductSearch";
import TradeProductSearch from "@/components/trade/TradeProductSearch";
import TradeLineItemsTable from "@/components/trade/TradeLineItemsTable";
import TradePartySelector from "@/components/trade/TradePartySelector";
import { useSalesQuery } from "@/pages/admin/trade/sales-return/hooks/useSalesReturnQueries";
import type { SaleItem, ProductItem, PartyItem } from "@/types";

interface FormLineItem {
  id?: string | number;
  saleDetailId?: string | number;
  productId: string | number;
  productCode: string;
  productName: string;
  unit: string;
  sellPrice: string;
  buyPrice?: number;
  quantity: string;
  discount: string;
  vat: string;
  total: number;
  stock?: number | string;
  returnedQty?: number;
  originalQty?: number;
}

export const WALK_IN_CUSTOMER: PartyItem = {
  id: 0,
  partyId: 0,
  name: "Walk-in Customer",
  partyName: "Walk-in Customer",
  phone: "",
  partyPhone: "",
  address: "",
  type: "CUSTOMER",
};

export const CreateSaleForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const queryClient = useQueryClient();
  const { postMutation, handleApiMutation } = useAPI();

  const stateEditData: SaleItem | undefined = (location.state as any)?.editData;
  const isEditMode = Boolean(routeId || stateEditData);

  // Basic Information
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [salesDate, setSalesDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [poNumber, setPoNumber] = useState<string>("");

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<PartyItem | null>(null);
  const [walkInName, setWalkInName] = useState<string>("");
  const [walkInPhone, setWalkInPhone] = useState<string>("");
  const [isPartyModalOpen, setIsPartyModalOpen] = useState<boolean>(false);

  // Line items
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);

  // Pricing, Discounts, VAT & Extra
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [vatAmount, setVatAmount] = useState<string>("");
  const [deliveryCharge, setDeliveryCharge] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isNotesDropdownOpen, setIsNotesDropdownOpen] = useState<boolean>(false);
  const notesDropdownRef = useRef<HTMLDivElement>(null);



  // Modals & Submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [savedSaleForInvoice, setSavedSaleForInvoice] = useState<SaleItem | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [shouldAutoPrint, setShouldAutoPrint] = useState<boolean>(false);
  const [isDeleteLineModalOpen, setIsDeleteLineModalOpen] = useState<boolean>(false);
  const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState<boolean>(false);
  const [pendingSavePrint, setPendingSavePrint] = useState<boolean>(false);

  // 1. Fetch Customers
  const { data: rawPartyData } = useQuery({
    queryKey: [partyListQueryKey, "CUSTOMER"],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: apiConfig.party.partyListUrl,
        body: { accessUser },
      });
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const customerList: PartyItem[] = useMemo(() => {
    if (!rawPartyData) return [];
    let list: any[] = [];
    if (Array.isArray(rawPartyData)) list = rawPartyData;
    else if (rawPartyData && typeof rawPartyData === "object") {
      const raw = rawPartyData as any;
      if (Array.isArray(raw.customerList)) list = raw.customerList;
      else if (Array.isArray(raw.partyList)) list = raw.partyList;
      else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }

    return list.filter((p: any) => {
      if (!isPartyActive(p)) return false;
      const type = String(p.type || p.partyType || p.party_type || p.party_type_name || p.role || "").toUpperCase();
      if (type.includes("SUPPLIER") || type.includes("VENDOR")) return false;
      return type.includes("CUSTOMER") || !type;
    });
  }, [rawPartyData]);

  // 2. Fetch Products
  const productListUrl = apiConfig.productList.productListUrl;
  const { data: rawProductData } = useQuery({
    queryKey: [productListQueryKey],
    queryFn: async () => {
      try {
        const res = await postData<any>({
          url: productListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });

  const allProducts: ProductItem[] = useMemo(() => {
    if (!rawProductData) return [];
    let list: any[] = [];
    if (Array.isArray(rawProductData)) list = rawProductData;
    else if (rawProductData && typeof rawProductData === "object") {
      const raw = rawProductData as any;
      if (Array.isArray(raw.productList)) list = raw.productList;
      else if (Array.isArray(raw.productsList)) list = raw.productsList;
      else if (Array.isArray(raw.product_list)) list = raw.product_list;
      else if (Array.isArray(raw.products)) list = raw.products;
      else if (Array.isArray(raw.data)) list = raw.data;
      else if (raw.data && typeof raw.data === "object") {
        if (Array.isArray(raw.data.productList)) list = raw.data.productList;
        else if (Array.isArray(raw.data.productsList)) list = raw.data.productsList;
        else if (Array.isArray(raw.data.products)) list = raw.data.products;
      }
    }

    return list.filter((p: any) => {
      const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
      return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
    });
  }, [rawProductData]);

  // 3. Fetch Registered Bank and MFS Accounts (Shared cache with 5-minute staleTime)
  const { registeredBankAccounts, registeredMfsAccounts } = useFinancialAccounts();

  // 4. Fetch fresh sale data directly from shared sales query cache for edit mode
  const { data: apiSalesData } = useSalesQuery({
    enabled: Boolean(isEditMode || routeId),
  });

  const effectiveEditData: SaleItem | undefined = useMemo(() => {
    if (stateEditData) return stateEditData;
    const targetKey = String(routeId || "").trim();
    if (Array.isArray(apiSalesData) && apiSalesData.length > 0 && targetKey) {
      const matched = apiSalesData.find(
        (s: any) =>
          String(s.id ?? s.saleId ?? "").trim() === targetKey ||
          String(s.invoiceNo ?? s.invoice_no ?? s.salesInvoiceNo ?? "").trim() === targetKey
      );
      if (matched) return matched;
    }
    return undefined;
  }, [apiSalesData, routeId, stateEditData]);

  // Auto-generate invoice number if create mode (Single Source of Truth from user session)
  useEffect(() => {
    if (!isEditMode && !invoiceNo) {
      const bCode = getBusinessCode();
      if (bCode) {
        setInvoiceNo(makeInvoiceNo(bCode));
      }
    }
  }, [isEditMode, invoiceNo]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notesDropdownRef.current && !notesDropdownRef.current.contains(e.target as Node)) {
        setIsNotesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hydrate edit data directly from backend response
  useEffect(() => {
    if (isEditMode && effectiveEditData) {
      const data = effectiveEditData;
      setInvoiceNo(data.invoiceNo || data.invoice_no || "");
      if (data.salesDate || data.saleDate || data.date) {
        setSalesDate(String(data.salesDate || data.saleDate || data.date).substring(0, 10));
      }
      setNotes(data.note || data.remarks || "");
      setPoNumber(data.poNumber || (data as any).po_number || "");

      const disc = data.discount ?? data.discountAmount ?? "";
      setDiscountValue(disc !== "" && disc !== null && Number(disc) > 0 ? String(disc) : "");
      setDiscountType(data.discountType === "PERCENT" ? "PERCENT" : "FLAT");

      const v = data.vat ?? data.vatAmount ?? "";
      setVatAmount(v !== "" && v !== null && Number(v) > 0 ? String(v) : "");

      const del = data.delivery_charge ?? data.deliveryCharge ?? "";
      setDeliveryCharge(del !== "" && del !== null && Number(del) > 0 ? String(del) : "");

      // Split payments directly from backend data
      const cash = data.cashReceived ?? (data.paymentType === "CASH" && !data.bankId && !data.mfsId ? data.paidAmount : "");
      const bank = data.cardReceived ?? (data.bankId ? data.paidAmount : "");
      const mfs = data.mfsReceived ?? (data.mfsId ? data.paidAmount : "");

      initializePayment({
        cashAmount: cash !== "" && cash !== null && Number(cash) > 0 ? String(cash) : "",
        bankAmount: bank !== "" && bank !== null && Number(bank) > 0 ? String(bank) : "",
        mfsAmount: mfs !== "" && mfs !== null && Number(mfs) > 0 ? String(mfs) : "",
        selectedBankId: data.bankId ? String(data.bankId) : "",
        bankName: data.bankName || "",
        accountNo: data.accountNo || "",
        bankRef: data.bankAccountName || "",
        selectedMfsId: data.mfsId ? String(data.mfsId) : "",
        mfsName: data.mfsName || "bKash",
        mfsPhone: data.mfsPhone || "",
      });

      // Customer
      const custId = data.customerId !== undefined && data.customerId !== null ? Number(data.customerId) : (data.customer_id !== undefined && data.customer_id !== null ? Number(data.customer_id) : undefined);
      const custName = data.customerName || data.customer_name || "";
      const custPhone = data.customerPhone || data.customer_phone || "";
      const custAddress = data.customerAddress || data.customer_address || "";

      const isWalkInSale =
        custId === 0 ||
        custAddress.toLowerCase().includes("counter") ||
        custName.toLowerCase().includes("walk-in") ||
        !custId;

      if (isWalkInSale) {
        setSelectedCustomer(WALK_IN_CUSTOMER);
        // If customer was saved with a custom walk-in name (e.g. "sanim"), populate it into walkInName
        if (custName && !custName.toLowerCase().includes("walk-in")) {
          setWalkInName(custName);
        } else {
          setWalkInName("");
        }
        setWalkInPhone(custPhone);
      } else {
        const found = customerList.find(
          (c) => (custId && Number(c.id || c.partyId) === custId) || (custName && (c.name === custName || c.partyName === custName))
        );
        if (found) {
          setSelectedCustomer(found);
        } else {
          setSelectedCustomer({
            id: custId,
            name: custName,
            phone: custPhone,
            address: custAddress,
          });
        }
        setWalkInName("");
        setWalkInPhone("");
      }

      // Details - load directly from whatever backend API returns
      const rawDetails =
        data.salesDetails || data.details || data.sales_details || data.items || [];
      if (Array.isArray(rawDetails) && rawDetails.length > 0) {
        // Extract returned quantities map for this sale (if any return records exist)
        const invNo = String(data.invoiceNo || data.invoice_no || (data as any).salesInvoiceNo || "").trim();
        const ordNo = String(data.orderNo || (data as any).order_no || "").trim();
        const sId = String(data.id || (data as any).saleId || (data as any).sale_id || "").trim();

        const returnedQtyMap: Record<string, number> = {};
        const processDetails = (dList: any[]) => {
          if (!Array.isArray(dList)) return;
          dList.forEach((rd: any) => {
            const pId = String(rd.productId ?? rd.product_id ?? "").trim();
            const pCode = String(rd.productCode ?? rd.pcode ?? "").trim();
            const pName = String(rd.productName ?? rd.name ?? "").trim().toLowerCase();
            const qty = Number(rd.quantity ?? rd.qty ?? rd.returnQuantity ?? 0);
            if (qty > 0) {
              if (pId) returnedQtyMap[`id_${pId}`] = (returnedQtyMap[`id_${pId}`] || 0) + qty;
              if (pCode) returnedQtyMap[`code_${pCode}`] = (returnedQtyMap[`code_${pCode}`] || 0) + qty;
              if (pName) returnedQtyMap[`name_${pName}`] = (returnedQtyMap[`name_${pName}`] || 0) + qty;
            }
          });
        };

        if (Array.isArray(apiSalesData)) {
          apiSalesData.forEach((item: any) => {
            const isReturnRecord =
              item.hasReturn ||
              Boolean(item.returnNo) ||
              Boolean(item.returnGrandTotal) ||
              (Array.isArray(item.returnDetails) && item.returnDetails.length > 0);

            const matchesInvoice =
              (invNo && (String(item.salesInvoiceNo || "").trim() === invNo || String(item.invoiceNo || "").trim() === invNo)) ||
              (ordNo && String(item.orderNo || "").trim() === ordNo) ||
              (sId && String(item.saleId || "").trim() === sId);

            if (matchesInvoice && isReturnRecord) {
              processDetails(item.returnDetails || item.details);
            }
          });
        }

        if (Array.isArray(data.returnDetails)) processDetails(data.returnDetails);
        if (Array.isArray((data as any).returns)) {
          (data as any).returns.forEach((r: any) => processDetails(r.returnDetails || r.details));
        }
        if (Array.isArray((data as any).salesReturns)) {
          (data as any).salesReturns.forEach((r: any) => processDetails(r.returnDetails || r.details));
        }

        const loaded: FormLineItem[] = rawDetails.map((item: any) => {
          const p = Number(item.sellPrice ?? item.price ?? item.rate ?? 0);
          const q = Number(item.quantity ?? item.qty ?? 1);
          const d = Number(item.discount ?? 0);
          const v = Number(item.vat ?? 0);
          const tot =
            item.total !== undefined && item.total !== null && !isNaN(Number(item.total)) && Number(item.total) > 0
              ? Number(item.total)
              : Number(p * q + v - d);

          const pId = String(item.productId || item.product_id || "").trim();
          const pCode = String(item.productCode || item.product_code || item.pcode || "").trim();
          const pName = String(item.productName || item.product_name || "").trim().toLowerCase();

          const directReturned = Number(
            item.returnedQuantity ??
            item.returnedQty ??
            item.returnQuantity ??
            item.returnQty ??
            item.alreadyReturned ??
            item.returned_qty ??
            item.returned_quantity ??
            0
          );

          const matchedFromReturns =
            (pId && returnedQtyMap[`id_${pId}`]) ||
            (pCode && returnedQtyMap[`code_${pCode}`]) ||
            (pName && returnedQtyMap[`name_${pName}`]) ||
            0;

          const retQty = Math.max(directReturned, matchedFromReturns);

          const matchedProd = allProducts.find(
            (p) =>
              (pId && String(p.id ?? p.productId ?? "").trim() === pId) ||
              (pCode && String(p.pcode ?? p.productCode ?? "").trim().toLowerCase() === pCode.toLowerCase())
          );

          const liveStock = matchedProd
            ? Number(matchedProd.quantity ?? matchedProd.stock ?? (matchedProd as any).qty ?? 0)
            : Number(item.stock ?? 0);

          return {
            id: item.id || item.saleDetailId,
            saleDetailId: item.id || item.saleDetailId,
            productId: item.productId || item.product_id || "",
            productCode: item.productCode || item.product_code || "",
            productName: item.productName || item.product_name || "Product",
            unit: item.unit || "pcs",
            sellPrice: String(p),
            buyPrice: Number(item.buyPrice || 0),
            quantity: String(q),
            discount: d ? String(d) : "",
            vat: v ? String(v) : "",
            total: tot,
            stock: liveStock,
            returnedQty: retQty > 0 ? retQty : undefined,
            originalQty: q,
          };
        });
        setLineItems(loaded);
      }
    }
  }, [isEditMode, effectiveEditData, customerList, allProducts, apiSalesData]);

  // Sync live stock from products
  useEffect(() => {
    if (allProducts.length > 0 && lineItems.length > 0) {
      setLineItems((prev) => {
        let hasChanges = false;
        const nextLines = prev.map((item) => {
          const pId = String(item.productId || "").trim();
          const pCode = String(item.productCode || "").trim();
          const matched = allProducts.find(
            (p) =>
              (pId && String(p.id ?? p.productId ?? "").trim() === pId) ||
              (pCode && String(p.pcode ?? p.productCode ?? "").trim().toLowerCase() === pCode.toLowerCase())
          );
          if (matched) {
            const liveStock = Number(matched.quantity ?? matched.stock ?? (matched as any).qty ?? 0);
            if (item.stock !== liveStock) {
              hasChanges = true;
              return { ...item, stock: liveStock };
            }
          }
          return item;
        });
        return hasChanges ? nextLines : prev;
      });
    }
  }, [allProducts, lineItems.length]);




  // Financial Calculations
  const rawSubtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  }, [lineItems]);

  const totalDiscount = useMemo(() => {
    return Number(discountValue) || 0;
  }, [discountValue]);

  const totalVat = useMemo(() => {
    return Number(vatAmount) || 0;
  }, [vatAmount]);

  const calculatedDelivery = Number(deliveryCharge) || 0;

  const grandTotal = useMemo(() => {
    return Math.max(0, rawSubtotal - totalDiscount + totalVat + calculatedDelivery);
  }, [rawSubtotal, totalDiscount, totalVat, calculatedDelivery]);

  const payment = useTradePayment({
    grandTotal,
    registeredBankAccounts,
    registeredMfsAccounts,
  });

  const {
    cashAmount,
    bankAmount,
    mfsAmount,
    cashGiven,
    selectedBankId,
    selectedMfsId,
    bankName,
    accountNo,
    bankRef,
    mfsName,
    mfsPhone,
    numCash,
    numBank,
    numMfs,
    totalPaid,
    dueAmount,
    changeReturnAmount,
    resetPayment,
    initializePayment,
  } = payment;

  // Helper to check if a product is already added in the sale line items list
  const isProductAlreadyInList = useCallback(
    (p: ProductItem) => {
      const pId = String(p.id ?? p.productId ?? (p as any).product_id ?? "");
      const pCode = (p.pcode || p.productCode || (p as any).product_code || "").trim().toLowerCase();

      return lineItems.some((item) => {
        if (pId && item.productId && String(item.productId) === pId) return true;
        if (pCode && item.productCode && item.productCode.trim().toLowerCase() === pCode) return true;
        return false;
      });
    },
    [lineItems]
  );

  // Toggle adding or removing a product from sale line items directly (matches PurchaseForm UX)
  const handleToggleProductInList = useCallback(
    (p: ProductItem) => {
      const pId = String(p.id ?? p.productId ?? (p as any).product_id ?? "");
      const pCode = p.pcode || p.productCode || (p as any).product_code || "";
      const pName = p.name || p.productName || (p as any).product_name || "Product";
      const unit = p.unit || "pcs";
      const sellPrice = Number(p.sellPrice ?? p.sell_price ?? p.buyPrice ?? (p as any).buy_price ?? 0);
      const buyPrice = Number(p.buyPrice ?? (p as any).buy_price ?? 0);
      const stock = Number(p.quantity ?? p.stock ?? (p as any).qty ?? 0);

      const isAlreadyIn = isProductAlreadyInList(p);

      if (isAlreadyIn) {
        // Toggle off / remove from list
        setLineItems((prev) =>
          prev.filter((item) => {
            if (pId && item.productId && String(item.productId) === pId) return false;
            if (pCode && item.productCode && item.productCode.trim().toLowerCase() === pCode.trim().toLowerCase()) return false;
            return true;
          })
        );
        showDeleteToast(`"${pName}" removed from sale list!`);
      } else {
        // Check stock before adding
        if (stock <= 0) {
          showErrorToast(`"${pName}" is out of stock (Stock: 0)`);
          return;
        }

        const newLine: FormLineItem = {
          productId: pId,
          productCode: pCode,
          productName: pName,
          unit,
          sellPrice: String(sellPrice),
          buyPrice,
          quantity: "1",
          discount: "",
          vat: "",
          total: sellPrice,
          stock,
        };
        setLineItems((prev) => [...prev, newLine]);
        showSuccessToast(`Added "${pName}" to invoice`);
      }
    },
    [isProductAlreadyInList]
  );

  // Handle Add Product to Line Items (used for barcode scanning or incrementing)
  const handleAddProduct = useCallback(
    (p: ProductItem) => {
      const pId = String(p.id ?? "");
      const pCode = p.pcode || "";
      const pName = p.name || "Product";
      const unit = p.unit || "pcs";
      const sellPrice = Number(p.sellPrice ?? p.buyPrice ?? 0);
      const buyPrice = Number(p.buyPrice ?? 0);
      const stock = Number(p.quantity ?? 0);

      if (stock <= 0) {
        showErrorToast(`"${pName}" is out of stock (Stock: 0)`);
        return;
      }

      const existingIndex = lineItems.findIndex(
        (item) =>
          (pId && String(item.productId) === pId) ||
          (pCode && item.productCode.toLowerCase() === pCode.toLowerCase())
      );

      if (existingIndex > -1) {
        const curQty = Number(lineItems[existingIndex].quantity) || 1;
        const newQty = curQty + 1;

        if (newQty > stock) {
          showErrorToast(`Stock limit reached (${stock} ${unit}) for "${pName}"`);
          return;
        }

        const unitPrice = Number(lineItems[existingIndex].sellPrice) || sellPrice;
        const disc = Number(lineItems[existingIndex].discount) || 0;
        const vat = Number(lineItems[existingIndex].vat) || 0;

        const base = unitPrice * newQty;
        const total = base + vat - disc;

        setLineItems((prev) => {
          const updated = [...prev];
          if (!updated[existingIndex]) return prev;
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: String(newQty),
            total: Math.max(0, total),
          };
          return updated;
        });
        showSuccessToast(`Increased "${pName}" quantity to ${newQty}`);
      } else {
        const newLine: FormLineItem = {
          productId: pId,
          productCode: pCode,
          productName: pName,
          unit,
          sellPrice: String(sellPrice),
          buyPrice,
          quantity: "1",
          discount: "",
          vat: "",
          total: sellPrice,
          stock,
        };
        setLineItems((prev) => [...prev, newLine]);
        showSuccessToast(`Added "${pName}" to invoice`);
      }
    },
    [lineItems]
  );

  const productSearch = useTradeProductSearch({
    allProducts,
    mode: "sale",
    onAddProduct: handleAddProduct,
    onToggleProduct: handleToggleProductInList,
  });

  const handleUpdateLineItem = useCallback(
    (index: number, field: keyof FormLineItem, val: string) => {
      setLineItems((prev) => {
        if (!prev[index]) return prev;
        const updated = [...prev];
        const target = { ...updated[index], [field]: val };

        let q = Number(field === "quantity" ? val : target.quantity) || 0;
        const itemStock = Number(target.stock ?? 0);

        if (field === "quantity" && itemStock > 0 && q > itemStock) {
          showErrorToast(`Quantity cannot exceed available stock (${itemStock})`);
          q = itemStock;
          target.quantity = String(itemStock);
        }

        const p = Number(field === "sellPrice" ? val : target.sellPrice) || 0;
        const d = Number(field === "discount" ? val : target.discount) || 0;
        const v = Number(field === "vat" ? val : target.vat) || 0;

        const base = q * p;
        target.total = Math.max(0, base + v - d);

        updated[index] = target;
        return updated;
      });
    },
    []
  );

  const handleRequestDeleteLineItem = useCallback((idx: number) => {
    setItemIndexToDelete(idx);
    setIsDeleteLineModalOpen(true);
  }, []);

  const handleUpdatePrice = useCallback(
    (idx: number, val: string) => handleUpdateLineItem(idx, "sellPrice", val),
    [handleUpdateLineItem]
  );

  const handleUpdateQuantity = useCallback(
    (idx: number, val: string) => handleUpdateLineItem(idx, "quantity", val),
    [handleUpdateLineItem]
  );

  const handleSelectCustomer = useCallback((customer: PartyItem) => {
    setSelectedCustomer(customer);
    if (customer.id !== 0 && customer.name !== "Walk-in Customer") {
      setWalkInName("");
      setWalkInPhone("");
    }
  }, []);

  const handleOpenPartyModal = useCallback(() => {
    setIsPartyModalOpen(true);
  }, []);

  const handleConfirmDeleteLineItem = useCallback(() => {
    if (itemIndexToDelete !== null && itemIndexToDelete >= 0) {
      setLineItems((prev) => prev.filter((_, idx) => idx !== itemIndexToDelete));
      setItemIndexToDelete(null);
      setIsDeleteLineModalOpen(false);
      showDeleteToast("Item removed from sale list");
    }
  }, [itemIndexToDelete]);



  // Pre-Submit validation & Modal Open
  const handlePreSubmit = (shouldPrint = false) => {
    if (!selectedCustomer) {
      showErrorToast("Please select or add a customer");
      return;
    }
    if (lineItems.length === 0) {
      showErrorToast("Please add at least one item to the sale invoice");
      return;
    }

    for (const item of lineItems) {
      if (!item.sellPrice || Number(item.sellPrice) < 0) {
        showErrorToast(`Please enter a valid sell price for "${item.productName}"`);
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        showErrorToast(`Please enter a valid quantity for "${item.productName}"`);
        return;
      }
    }

    const isWalkIn = Boolean(
      selectedCustomer &&
      (selectedCustomer.id === 0 ||
        selectedCustomer.partyId === 0 ||
        String(selectedCustomer.name || selectedCustomer.partyName).toLowerCase().includes("walk-in") ||
        String(selectedCustomer.name || selectedCustomer.partyName).toLowerCase().includes("walking"))
    );

    if (isWalkIn && dueAmount > 0) {
      showErrorToast("Credit / Due sale is not allowed for Walk-in Customer. Please collect full payment or register the customer.");
      return;
    }

    if (numBank > 0 && !selectedBankId) {
      showErrorToast("Please select a bank account for card/bank payment");
      return;
    }
    if (numMfs > 0 && !selectedMfsId) {
      showErrorToast("Please select an MFS provider for MFS payment");
      return;
    }

    setPendingSavePrint(shouldPrint);
    setIsSaveConfirmModalOpen(true);
  };

  // Submit Sale Form
  const handleSubmit = async (shouldPrint = false) => {
    if (!selectedCustomer || lineItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const accessUser = buildAccessUser();
      const insertUrl = apiConfig.sales.insertSalesUrl;
      const updateUrl = apiConfig.sales.updateSalesUrl;
      const targetUrl = isEditMode ? updateUrl : insertUrl;

      const methodsUsed = [numCash > 0, numBank > 0, numMfs > 0].filter(Boolean).length;
      const invType = methodsUsed > 1 ? "MULTI" : "SINGLE";
      const paymentType = totalPaid <= 0 ? "credit" : methodsUsed > 1 ? "multi" : numBank > 0 ? "bank" : numMfs > 0 ? "mfs" : "cash";
      const paymentStatus = dueAmount <= 0 ? "Paid" : totalPaid > 0 ? "PARTIAL" : "Pending";

      const isWalkIn = Boolean(
        selectedCustomer &&
        (selectedCustomer.id === 0 ||
          selectedCustomer.partyId === 0 ||
          String(selectedCustomer.name || selectedCustomer.partyName).toLowerCase().includes("walk-in"))
      );

      const finalCustomerName = isWalkIn
        ? (walkInName.trim() || "Walk-in Customer")
        : (selectedCustomer.name || selectedCustomer.partyName || "Walk-in Customer");
      const finalCustomerPhone = isWalkIn
        ? walkInPhone.trim()
        : (selectedCustomer.phone || selectedCustomer.partyPhone || "");
      const finalCustomerId = isWalkIn
        ? 0
        : (selectedCustomer.id ?? selectedCustomer.partyId ?? 0);
      const finalCustomerAddress = isWalkIn
        ? "Counter Sale"
        : (selectedCustomer.address || selectedCustomer.partyAddress || "");

      const salesDetails = lineItems.map((item) => {
        const q = Number(item.quantity) || 1;
        const p = Number(item.sellPrice) || 0;
        const d = Number(item.discount) || 0;
        const v = Number(item.vat) || 0;

        return {
          productId: String(item.productId || ""),
          productCode: String(item.productCode || ""),
          productName: item.productName || "",
          unit: item.unit || "pcs",
          quantity: q,
          sellPrice: p,
          discount: d,
          total: Number(item.total),
          status: "PENDING",
          advenType: "SALE",
          vat: v,
          delivery_charge: 0,
        };
      });

      const selectedMfsObj = registeredMfsAccounts.find(
        (m) => String(m.id || m.mfsId || m._id) === String(selectedMfsId)
      );
      const finalMfsName = mfsName || selectedMfsObj?.name || selectedMfsObj?.mfsName || selectedMfsObj?.method || "";
      const finalMfsPhone = mfsPhone || selectedMfsObj?.phoneNumber || selectedMfsObj?.mfsPhone || selectedMfsObj?.phone || "";

      const selectedBankObj = registeredBankAccounts.find(
        (b) => String(b.id || b.bankId || b._id) === String(selectedBankId)
      );
      const finalBankName = bankName || selectedBankObj?.bankName || selectedBankObj?.name || "";
      const finalAccountNo = accountNo || selectedBankObj?.accountNo || selectedBankObj?.bankAccountNumber || "";
      const finalBankRef = bankRef || selectedBankObj?.bankAccountName || selectedBankObj?.accountName || "";

      const payload: any = {
        accessUser,
        invoiceNo: invoiceNo.trim() || makeInvoiceNo("INV"),
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerAddress: finalCustomerAddress,
        salesDate,
        totalAmount: rawSubtotal,
        discount: totalDiscount,
        grandTotal,
        paidAmount: totalPaid,
        dueAmount,
        paymentType: paymentType.toLowerCase(),
        inv_type: invType,
        status: paymentStatus,
        note: notes.trim() || "",
        vat: totalVat,
        osType: "WEB",
        delivery_charge: calculatedDelivery,
        cashReceived: numCash,
        cardReceived: numBank,
        posName: null,
        mfsReceived: numMfs,
        mfsId: numMfs > 0 ? selectedMfsId : null,
        mfsName: numMfs > 0 ? (finalMfsName || null) : null,
        mfsPhone: numMfs > 0 ? (finalMfsPhone || null) : null,
        customerPaid: Number(cashGiven) || (numCash > 0 ? numCash : totalPaid),
        returnAmount: changeReturnAmount,
        bankId: numBank > 0 ? selectedBankId : null,
        bankName: numBank > 0 ? (finalBankName || null) : null,
        accountNo: numBank > 0 ? (finalAccountNo || null) : null,
        bankAccountName: numBank > 0 ? (finalBankRef || null) : null,
        salesDetails,
      };

      const editId =
        stateEditData?.id ||
        (stateEditData as any)?.saleId ||
        routeId;

      if (isEditMode && editId) {
        payload.id = editId;
        payload.saleId = editId;
      }

      const result = await handleApiMutation({
        mutation: postMutation,
        url: targetUrl,
        body: payload,
        invalidateQueryKey: [salesListQueryKey, productListQueryKey, salesAndReturnQueryKey],
        showSuccessMessage: true,
        showErrorMessage: true,
      });

      if (result?.success) {
        const res: any = (result.data as any)?.data !== undefined ? (result.data as any).data : result.data;
        const savedId = res?.id || res?.saleId || editId || invoiceNo;

        setShouldAutoPrint(shouldPrint);
        setSavedSaleForInvoice({
          ...payload,
          id: savedId,
        });
        setIsInvoiceModalOpen(true);
      }
    } catch (err: any) {
      showErrorToast(err?.message || "An error occurred while saving sale transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    setLineItems([]);
    setSelectedCustomer(null);
    setDiscountValue("");
    setVatAmount("");
    setDeliveryCharge("");
    setNotes("");
    setPoNumber("");
    resetPayment();
    const bCode = getBusinessCode();
    if (bCode) {
      setInvoiceNo(makeInvoiceNo(bCode));
    } else {
      setInvoiceNo("");
    }
    setIsResetModalOpen(false);
    showDeleteToast("Sale invoice reset successfully!");
  };

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-[#F6F6F6] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 border-b border-gray-200">
        {/* Left Side: Title & Invoice Badge */}
        <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2.5 min-w-0">
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-[var(--primary-color)] flex items-center gap-1.5 shrink-0">
              <FaCalculator className="text-[var(--primary-color)] shrink-0" size={18} />
              <span className="truncate">{isEditMode ? "Edit Sales Invoice" : "Create New Sale"}</span>
            </h1>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] font-normal w-fit">
              {invoiceNo || "INV"}
            </span>
          </div>

          {/* Quick Reset & Cancel for Mobile */}
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
              onClick={() => navigate("/admin/sales")}
              className="px-2.5 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Action Controls */}
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
              onClick={() => navigate("/admin/sales")}
              className="px-3 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Save & Save & Print Buttons */}
          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
            <Button
              label={isSubmitting ? "Saving..." : isEditMode ? "Update Sale" : "Save Sale"}
              onClick={() => handlePreSubmit(false)}
              color="var(--primary-color)"
              disabled={isSubmitting}
              buttonClass="!text-xs !py-1.5 !w-full lg:!w-fit justify-center font-normal !text-white"
            />
            <Button
              label="Save & Print"
              onClick={() => handlePreSubmit(true)}
              color="#059669"
              disabled={isSubmitting}
              buttonClass="!text-xs !py-1.5 !w-full lg:!w-fit justify-center font-normal !text-white"
            />
          </div>
        </div>
      </div>


      {/* Grid: Customer & Meta Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* Customer Selector */}
        <TradePartySelector
          partyType="customer"
          label="Customer"
          required
          selectedParty={selectedCustomer}
          partyList={customerList}
          onSelectParty={handleSelectCustomer}
          onOpenNewPartyModal={handleOpenPartyModal}
          allowWalkIn
          walkInName={walkInName}
          walkInPhone={walkInPhone}
          onChangeWalkInName={setWalkInName}
          onChangeWalkInPhone={setWalkInPhone}
        />

        {/* Invoice No */}
        <div>
          <label className="text-[11px] font-bold text-black  tracking-wider block mb-1">
            Invoice No <span className="text-rose-500">*</span>
          </label>
          <div
            className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-200 font-bold text-black flex items-center select-text cursor-default"
            title="Auto-generated Invoice Number"
          >
            {invoiceNo || "N/A"}
          </div>
        </div>

        {/* Sales Date */}
        <div>
          <label className="text-[11px] font-bold text-black  tracking-wider block mb-1">
            Sales Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={salesDate}
            onChange={(e) => setSalesDate(e.target.value)}
            className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
          />
        </div>

        {/* PO / Reference No */}
        <div>
          <label className="text-[11px] font-bold text-black  tracking-wider block mb-1">
            PO Number
          </label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
            placeholder="e.g. PO-89234"
          />
        </div>
      </div>

      {/* Product Live Search & Barcode Scan Bar */}
      <TradeProductSearch
        search={productSearch}
        lineItems={lineItems}
        mode="sale"
        isProductAlreadyInList={isProductAlreadyInList}
        onToggleProduct={handleToggleProductInList}
        onUpdateLineItem={handleUpdateLineItem}
      />

      {/* Dynamic Line Items Table */}
      <TradeLineItemsTable
        title="Sales Items List"
        subtotal={rawSubtotal}
        lineItems={lineItems}
        priceHeader="Sell Price (৳)"
        onUpdatePrice={handleUpdatePrice}
        onUpdateQuantity={handleUpdateQuantity}
        onRequestDelete={handleRequestDeleteLineItem}
        emptyMessage="No items in sales cart. Search and add products above or scan barcodes."
      />

      {/* Financial Summary & Split Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
        {/* Left Column: Overall Discounts, VAT, Delivery & Remarks */}
        <div className="lg:col-span-5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-black">
              Discounts & Extra Charges
            </h3>

            {/* Overall Invoice Discount (Fixed Amount) */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-black font-semibold">Overall Discount (৳):</label>
              <div className="relative w-32 sm:w-36">
                <span className="absolute left-2 top-1 text-black text-xs font-bold">৳</span>
                <input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 text-xs border border-gray-300 rounded text-right text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Invoice VAT (Fixed Amount) */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-black font-semibold">Invoice VAT (৳):</label>
              <div className="relative w-32 sm:w-36">
                <span className="absolute left-2 top-1 text-black text-xs font-bold">৳</span>
                <input
                  type="number"
                  step="0.01"
                  value={vatAmount}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setVatAmount(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 text-xs border border-gray-300 rounded text-right text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Delivery Charge */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-black font-semibold">Delivery Charge (৳):</label>
              <div className="relative w-32 sm:w-36">
                <span className="absolute left-2 top-1 text-black text-xs font-bold">৳</span>
                <input
                  type="number"
                  step="0.01"
                  value={deliveryCharge}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 text-xs border border-gray-300 rounded text-right text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Notes / Remarks */}
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex flex-col" ref={notesDropdownRef}>
            <div className="h-5 flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-semibold text-black truncate">
                Notes / Remarks
              </span>
              <button
                type="button"
                onClick={() => setIsNotesDropdownOpen(!isNotesDropdownOpen)}
                className="text-[11px] font-semibold text-black bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded-md border border-gray-300 transition-all flex items-center gap-1 cursor-pointer shadow-2xs h-5"
              >
                <span>+ Presets</span>
                <FiChevronDown
                  size={11}
                  className={`transition-transform duration-200 ${isNotesDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            <div className="relative h-[84px]">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type notes or click '+ Presets' to add..."
                className="w-full h-[84px] p-2.5 text-xs border border-gray-300/80 rounded-xl focus:outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/15 resize-none text-black font-medium bg-slate-50/40 hover:bg-white focus:bg-white placeholder:text-gray-400 transition-all shadow-2xs leading-relaxed"
              />

              {isNotesDropdownOpen && (
                <div className="absolute right-0 bottom-full mb-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden divide-y divide-gray-100">
                  <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-700">
                      Choose a preset:
                    </span>
                    <span className="text-[10px] text-gray-400">Click to add</span>
                  </div>

                  <div className="flex flex-col py-1 divide-y divide-gray-50">
                    {[
                      "Goods delivered in good condition",
                      "Cash received on delivery",
                      "Full payment cleared",
                      "Standard order completed",
                      "Warranty card issued",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setNotes((prev) => {
                            if (!prev.trim()) return preset;
                            if (prev.includes(preset)) return prev;
                            return `${prev}, ${preset}`;
                          });
                          setIsNotesDropdownOpen(false);
                        }}
                        className="px-3 py-2 text-[11px] text-left text-black hover:bg-sky-50 hover:text-[var(--color-primary)] font-medium transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <span className="truncate">{preset}</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-[var(--color-primary)] font-semibold shrink-0 ml-2">
                          + Add
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Totals & Split Payments */}
        <div className="lg:col-span-7 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
          {/* Detailed Financial Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-50/90 py-1.5 px-2.5 rounded-lg border border-gray-200/90 shadow-2xs">
            <div>
              <span className="text-[10px] text-black  font-bold block tracking-wider leading-tight">Subtotal</span>
              <span className="text-xs font-bold text-black block text-right leading-tight mt-0.5">
                ৳ {formatMoney(rawSubtotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black  font-bold block tracking-wider leading-tight">Discount</span>
              <span className="text-xs font-bold text-rose-600 block text-right leading-tight mt-0.5">
                - ৳ {formatMoney(totalDiscount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black  font-bold block tracking-wider leading-tight">VAT + Delivery</span>
              <span className="text-xs font-bold text-black block text-right leading-tight mt-0.5">
                + ৳ {formatMoney(totalVat + calculatedDelivery)}
              </span>
            </div>
            <div className="bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded text-right flex flex-col justify-center">
              <span className="text-[10px] text-black  font-bold block tracking-wider leading-tight">Grand Total</span>
              <span className="text-xs sm:text-[13px] font-extrabold text-[var(--color-primary)] block leading-tight mt-0.5">
                ৳ {formatMoney(grandTotal)}
              </span>
            </div>
          </div>

          {/* Unified Payment Section */}
          <TradePaymentSection
            grandTotal={grandTotal}
            payment={payment}
            registeredBankAccounts={registeredBankAccounts}
            registeredMfsAccounts={registeredMfsAccounts}
            title="Payment Collected"
            bankLabel="BANK"
          />

          {/* Financial Settlement Summary Ribbon (Matching Professional ERP Standard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-gray-200/90 pt-1.5 items-center">
            {/* Total Paid Card with status badge */}
            <div className="bg-emerald-50/90 px-2.5 py-1 rounded-md border border-emerald-200/90 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                <span className="text-[10.5px] font-bold text-emerald-950 tracking-wide">
                  Total Paid
                </span>
                <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  {totalPaid >= grandTotal && grandTotal > 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID"}
                </span>
              </div>
              <span className="text-xs sm:text-[13px] font-extrabold text-emerald-800">
                ৳ {formatMoney(totalPaid)}
              </span>
            </div>

            {/* Due Balance Card or Change Return */}
            {changeReturnAmount > 0 ? (
              <div className="bg-sky-50/90 px-2.5 py-1 rounded-md border border-sky-200/90 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600 inline-block" />
                  <span className="text-[10.5px] font-bold text-sky-950 tracking-wide">
                    Change / ফেরত
                  </span>
                </div>
                <span className="text-xs sm:text-[13px] font-extrabold text-sky-700">
                  ৳ {formatMoney(changeReturnAmount)}
                </span>
              </div>
            ) : (
              <div
                className={`px-2.5 py-1 rounded-md border flex items-center justify-between transition-colors shadow-2xs ${
                  dueAmount > 0 ? "bg-rose-50/90 border-rose-200/90" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${
                      dueAmount > 0 ? "bg-rose-600" : "bg-gray-400"
                    }`}
                  />
                  <span
                    className={`text-[10.5px] font-bold tracking-wide ${
                      dueAmount > 0 ? "text-rose-950" : "text-gray-700"
                    }`}
                  >
                    Due Balance
                  </span>
                  {dueAmount > 0 && (
                    <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-rose-100 text-rose-800">
                      DUE
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs sm:text-[13px] font-extrabold ${
                    dueAmount > 0 ? "text-rose-600" : "text-black"
                  }`}
                >
                  ৳ {formatMoney(dueAmount)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Confirm Modal */}
      {isSaveConfirmModalOpen && (
        <ConfirmModal
          isOpen={isSaveConfirmModalOpen}
          title={isEditMode ? "Update Sale Invoice?" : "Save Sale Invoice?"}
          message={`Are you sure you want to ${isEditMode ? "update" : "save"} this sale invoice with total amount ৳${formatMoney(grandTotal)}?`}
          confirmText={pendingSavePrint ? "Save & Print" : "Save"}
          cancelText="Cancel"
          onClose={() => setIsSaveConfirmModalOpen(false)}
          onConfirm={() => {
            setIsSaveConfirmModalOpen(false);
            handleSubmit(pendingSavePrint);
          }}
        />
      )}

      {/* Reset Confirm Modal */}
      {isResetModalOpen && (
        <ConfirmModal
          isOpen={isResetModalOpen}
          title="Reset Sales Form?"
          message="Are you sure you want to clear all product items, customer details, and payment inputs? This cannot be undone."
          confirmText="Reset Everything"
          cancelText="Keep Editing"
          iconBgColor="bg-rose-100"
          confirmButtonColor="bg-rose-600 hover:bg-rose-700"
          onClose={() => setIsResetModalOpen(false)}
          onConfirm={handleConfirmReset}
        />
      )}

      {/* Delete Single Line Item Modal */}
      {isDeleteLineModalOpen && (
        <DeleteModal
          isOpen={isDeleteLineModalOpen}
          title="Remove Item from Cart"
          message={
            itemIndexToDelete !== null && lineItems[itemIndexToDelete]
              ? `Are you sure you want to remove "${lineItems[itemIndexToDelete]?.productName || 'this item'}" from the sales list?`
              : "Are you sure you want to remove this item from the sales list?"
          }
          onClose={() => {
            setIsDeleteLineModalOpen(false);
            setItemIndexToDelete(null);
          }}
          onDelete={handleConfirmDeleteLineItem}
        />
      )}

      {/* Customer Quick Add Modal */}
      {isPartyModalOpen && (
        <PartyModal
          isOpen={isPartyModalOpen}
          onClose={() => setIsPartyModalOpen(false)}
          defaultType="CUSTOMER"
          onSuccess={(newParty) => {
            queryClient.invalidateQueries({ queryKey: [partyListQueryKey] });
            if (newParty) setSelectedCustomer(newParty);
            setIsPartyModalOpen(false);
          }}
        />
      )}

      {/* Invoice Details Modal */}
      {isInvoiceModalOpen && (
        <SaleInvoiceModal
          isOpen={isInvoiceModalOpen}
          autoPrint={shouldAutoPrint}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSavedSaleForInvoice(null);
            navigate("/admin/sales");
          }}
          sale={savedSaleForInvoice}
        />
      )}
    </div>
  );
};

export default CreateSaleForm;
