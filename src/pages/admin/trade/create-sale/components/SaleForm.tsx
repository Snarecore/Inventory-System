import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FaCalculator, FaUserCircle } from "react-icons/fa";
import Button from "@/components/button/Button";
import DeleteModal from "@/components/modal/DeleteModal";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PartyModal from "@/pages/admin/people/parties/components/PartyModal";
import SaleInvoiceModal from "@/pages/admin/trade/sales/components/SaleInvoiceModal";
import DatePicker from "@/components/common/DatePicker";
import CurrencyInput from "@/components/form/CurrencyInput";
import apiConfig from "@/config/api.json";
import {
  salesListQueryKey,
  productListQueryKey,
  partyListQueryKey,
  salesAndReturnQueryKey,
  customersDueQueryKey,
  customerInvoicesDueQueryKey,
  collectionReportQueryKey,
} from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { getBusinessCode } from "@/utils/auth-storage";
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
import TradeLedgerSummary from "@/components/trade/TradeLedgerSummary";
import TradeNotesInput from "@/components/trade/TradeNotesInput";
import { useSalesQuery } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import { useCustomerInvoicesDue } from "@/hooks/useCustomerInvoicesDue";
import { cashLeg, bankLeg, mfsLeg, type TradeTender } from "@/services/financial-ledger-service";
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
  const { recordTradeLedger } = useFinancialLedger();

  const stateEditData: SaleItem | undefined = (location.state as any)?.editData;
  const isEditMode = Boolean(routeId || stateEditData);

  // Basic Information
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [salesDate, setSalesDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<PartyItem | null>(null);
  const [walkInName, setWalkInName] = useState<string>("");
  const [walkInPhone, setWalkInPhone] = useState<string>("");
  const [isPartyModalOpen, setIsPartyModalOpen] = useState<boolean>(false);

  // Live Previous Due fetched directly from backend (/customer-invoices-due)
  const isWalkIn =
    !selectedCustomer ||
    selectedCustomer.id === 0 ||
    String(selectedCustomer.name || "").toLowerCase().includes("walk-in");
  const customerApiId = isWalkIn ? "" : String(selectedCustomer.partyId ?? selectedCustomer.id ?? "");

  const { data: customerDueInvoices, isLoading: isLoadingCustomerDue } =
    useCustomerInvoicesDue(customerApiId);

  const previousDue = (customerDueInvoices && customerDueInvoices.length > 0)
    ? customerDueInvoices.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0)
    : 0;

  // Line items
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);

  // Pricing, Discounts, VAT & Extra
  const [discountValue, setDiscountValue] = useState<string>("");
  const [vatAmount, setVatAmount] = useState<string>("");
  const [deliveryCharge, setDeliveryCharge] = useState<string>("");
  const [notes, setNotes] = useState<string>("");



  // Modals & Submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
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

    return list
      .filter((p: any) => {
        if (!isPartyActive(p)) return false;
        const type = String(p.type || p.partyType || "").toUpperCase();
        if (type.includes("SUPPLIER") || type.includes("VENDOR")) return false;
        return type.includes("CUSTOMER") || !type;
      })
      .map((p: any) => ({
        ...p,
        id: p.id ?? p.partyId ?? p.party_id,
        name: p.name || p.partyName || p.party_name || "",
        phone: p.phone || p.partyPhone || p.phoneNumber || "",
        address: p.address || p.partyAddress || "",
      }));
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
      else if (Array.isArray(raw.data)) list = raw.data;
    }

    return list
      .filter((p: any) => {
        const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
        return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
      })
      .map((p: any) => ({
        ...p,
        id: p.id ?? p.pcode,
        name: p.name || "Product",
        productCode: p.productCode || p.pcode || "",
        pcode: p.pcode || p.productCode || "",
        buyPrice: Number(p.buyPrice ?? 0),
        sellPrice: Number(p.sellPrice ?? 0),
        quantity: Number(p.quantity ?? 0),
        unit: p.secondary_unit || p.secondaryUnit || p.unit || "pcs",
      }));
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
          String(s.invoiceNo ?? s.salesInvoiceNo ?? "").trim() === targetKey
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

  // Hydrate edit data directly from backend response
  useEffect(() => {
    if (isEditMode && effectiveEditData) {
      const data = effectiveEditData;
      setInvoiceNo(data.invoiceNo || "");
      if (data.salesDate) {
        setSalesDate(String(data.salesDate).substring(0, 10));
      }
      setNotes(data.note || "");

      const disc = data.discount ?? "";
      setDiscountValue(disc !== "" && disc !== null && Number(disc) > 0 ? String(disc) : "");

      const v = data.vat ?? "";
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
      const custId = data.customerId !== undefined && data.customerId !== null ? Number(data.customerId) : undefined;
      const custName = data.customerName || "";
      const custPhone = data.customerPhone || "";
      const custAddress = data.customerAddress || "";

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
          (c) => (custId && Number(c.id) === custId) || (custName && c.name === custName)
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

      // Details - load directly from salesDetails, saleDetails, or details
      const rawDetails: any[] =
        Array.isArray(data.salesDetails) && data.salesDetails.length > 0
          ? data.salesDetails
          : Array.isArray(data.saleDetails) && data.saleDetails.length > 0
          ? data.saleDetails
          : Array.isArray(data.details)
          ? data.details
          : [];
      if (Array.isArray(rawDetails) && rawDetails.length > 0) {
        // Extract returned quantities map for this sale (if any return records exist)
        const invNo = String(data.invoiceNo || (data as any).salesInvoiceNo || "").trim();
        const ordNo = String(data.orderNo || "").trim();
        const sId = String(data.id || (data as any).saleId || "").trim();

        const returnedQtyMap: Record<string, number> = {};
        const processDetails = (dList: any[]) => {
          if (!Array.isArray(dList)) return;
          dList.forEach((rd: any) => {
            const pId = String(rd.productId ?? rd.id ?? "").trim();
            const pCode = String(rd.productCode ?? rd.pcode ?? "").trim();
            const pName = String(rd.productName ?? rd.name ?? "").trim().toLowerCase();
            const qty = Number(rd.quantity ?? rd.returnQuantity ?? 0);
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
          const p = Number(item.sellPrice ?? 0);
          const q = Number(item.quantity ?? 1);
          const d = Number(item.discount ?? 0);
          const v = Number(item.vat ?? 0);
          const tot =
            item.total !== undefined && item.total !== null && !isNaN(Number(item.total)) && Number(item.total) > 0
              ? Number(item.total)
              : Number(p * q + v - d);

          const pId = String(item.productId ?? item.id ?? "").trim();
          const pCode = String(item.productCode ?? item.pcode ?? "").trim();
          const pName = String(item.productName ?? item.name ?? "Product").trim();

          const directReturned = Number(
            item.returnedQuantity ??
            item.returnQuantity ??
            0
          );

          const matchedFromReturns =
            (pId && returnedQtyMap[`id_${pId}`]) ||
            (pCode && returnedQtyMap[`code_${pCode}`]) ||
            (pName && returnedQtyMap[`name_${pName.toLowerCase()}`]) ||
            0;

          const retQty = Math.max(directReturned, matchedFromReturns);

          const matchedProd = allProducts.find(
            (prod) =>
              (pId && String(prod.id ?? "").trim() === pId) ||
              (pCode && String(prod.pcode || prod.productCode || "").trim().toLowerCase() === pCode.toLowerCase())
          );

          const liveStock = matchedProd
            ? Number(matchedProd.quantity ?? 0)
            : Number(item.stock ?? 0);

          return {
            id: item.id || item.saleDetailId,
            saleDetailId: item.id || item.saleDetailId,
            productId: pId,
            productCode: pCode,
            productName: pName,
            unit: item.unit || (matchedProd as any)?.secondary_unit || (matchedProd as any)?.secondaryUnit || matchedProd?.unit || "pcs",
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
            const liveStock = Number(matched.quantity ?? matched.stock ?? 0);
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

  const totalDiscount = Number(discountValue) || 0;
  const totalVat = Number(vatAmount) || 0;
  const calculatedDelivery = Number(deliveryCharge) || 0;
  const grandTotal = Math.max(0, rawSubtotal - totalDiscount + totalVat + calculatedDelivery);

  const payment = useTradePayment({
    grandTotal,
    registeredBankAccounts,
    registeredMfsAccounts,
  });

  const {
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
      const pId = String(p.id ?? "");
      const pCode = (p.pcode || "").trim().toLowerCase();

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
      const pId = String(p.id ?? "");
      const pCode = p.pcode || "";
      const pName = p.name || "Product";
      const unit = (p as any).secondary_unit || (p as any).secondaryUnit || p.unit || "pcs";
      const sellPrice = Number(p.sellPrice ?? 0);
      const buyPrice = Number(p.buyPrice ?? 0);
      const stock = Number(p.quantity ?? 0);

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
      const unit = (p as any).secondary_unit || (p as any).secondaryUnit || p.unit || "pcs";
      const sellPrice = Number(p.sellPrice ?? 0);
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
    if (isSubmittingRef.current || isSubmitting) return;
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
        String(selectedCustomer.name).toLowerCase().includes("walk-in"))
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
    if (isSubmittingRef.current || isSubmitting) return;
    if (!selectedCustomer || lineItems.length === 0) return;

    isSubmittingRef.current = true;
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
          String(selectedCustomer.name).toLowerCase().includes("walk-in"))
      );

      const finalCustomerName = isWalkIn
        ? (walkInName.trim() || "Walk-in Customer")
        : (selectedCustomer.name || "Walk-in Customer");
      const finalCustomerPhone = isWalkIn
        ? walkInPhone.trim()
        : (selectedCustomer.phone || "");
      const finalCustomerId = isWalkIn
        ? 0
        : (selectedCustomer.id ?? 0);
      const finalCustomerAddress = isWalkIn
        ? "Counter Sale"
        : (selectedCustomer.address || "");

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
        (m) => String(m.id) === String(selectedMfsId)
      );
      const finalMfsName = mfsName || selectedMfsObj?.mfsName || "";
      const finalMfsPhone = mfsPhone || selectedMfsObj?.mfsPhone || "";

      const selectedBankObj = registeredBankAccounts.find(
        (b) => String(b.id) === String(selectedBankId)
      );
      const finalBankName = bankName || selectedBankObj?.bankName || "";
      const finalAccountNo = accountNo || selectedBankObj?.accountNo || "";
      const finalBankRef = bankRef || selectedBankObj?.bankAccountName || "";

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
        details: salesDetails,
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
        invalidateQueryKey: [
          salesListQueryKey,
          productListQueryKey,
          salesAndReturnQueryKey,
          customersDueQueryKey,
          customerInvoicesDueQueryKey,
          collectionReportQueryKey,
        ],
        showSuccessMessage: true,
        showErrorMessage: true,
      });

      if (result?.success) {
        const res: any = (result.data as any)?.data !== undefined ? (result.data as any).data : result.data;
        const savedId = res?.id || res?.saleId || editId || invoiceNo;

        // Post financial transaction INCOME to update cash/bank balances
        if (totalPaid > 0) {
          try {
            const tenders: TradeTender[] = [
              { amount: numCash, leg: cashLeg() },
              { amount: numBank, leg: bankLeg(selectedBankObj) },
              { amount: numMfs, leg: mfsLeg(selectedMfsObj) },
            ].filter((t) => t.amount > 0);

            const productSummary = lineItems.map((li) => li.productName).filter(Boolean).join(", ");

            await recordTradeLedger({
              tradeType: "INCOME",
              tenders,
              invoiceNo: invoiceNo.trim(),
              partyId: finalCustomerId,
              head: "Sales",
              itemsSummary: productSummary,
              notes: notes.trim(),
              date: salesDate,
              totalDue: dueAmount,
            });
          } catch (ledgerErr) {
            console.error("Sale saved, but financial ledger posting encountered an error:", ledgerErr);
          }
        }

        setShouldAutoPrint(shouldPrint);
        setSavedSaleForInvoice({
          ...payload,
          id: savedId,
          previousDue,
          previousDueInvoices: customerDueInvoices || [],
        });
        setIsInvoiceModalOpen(true);
      } else {
        // If sale creation failed or reference collided, auto-generate fresh invoice number in create mode
        if (!isEditMode) {
          const bCode = getBusinessCode();
          if (bCode) setInvoiceNo(makeInvoiceNo(bCode));
        }
      }
    } catch (err: any) {
      showErrorToast(err?.message || "An error occurred while saving sale transaction");
      if (!isEditMode) {
        const bCode = getBusinessCode();
        if (bCode) setInvoiceNo(makeInvoiceNo(bCode));
      }
    } finally {
      isSubmittingRef.current = false;
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
    <div className="flex w-full flex-col gap-2 px-2 py-1.5 sm:px-3 sm:py-2">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-[var(--ui-surface-muted)] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 border-b border-[var(--ui-border)]">
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
              className="ui-btn ui-btn-ghost h-[var(--ui-control-h-xs)] px-2.5 text-[length:var(--ui-font-size-xs)] font-normal"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/sales")}
              className="ui-btn ui-btn-ghost h-[var(--ui-control-h-xs)] px-2.5 text-[length:var(--ui-font-size-xs)] font-normal"
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
              className="ui-btn ui-btn-secondary h-[var(--ui-control-h-xs)] px-3 text-[length:var(--ui-font-size-xs)] font-normal"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/sales")}
              className="ui-btn ui-btn-secondary h-[var(--ui-control-h-xs)] px-3 text-[length:var(--ui-font-size-xs)] font-normal"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>

      {/* Workspace: entry flow on the left, pinned summary rail on the right.
          The rail keeps totals, payment and the save actions in view while the
          item list grows, so nothing critical falls below the fold. */}
      <div className="grid grid-cols-1 items-start gap-2 xl:grid-cols-12">
        {/* ---------- Entry column (scrolls) ---------- */}
        <div className="flex flex-col gap-2 xl:col-span-8">
      {/* Customer & invoice meta */}
      <div className="ui-card p-2 sm:p-2.5">
        <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">
          Customer &amp; Invoice
        </h3>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
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
          previousDue={customerApiId ? previousDue : null}
          isLoadingDue={isLoadingCustomerDue}
        />

        {/* Invoice No */}
        <div>
          <label className="ui-label block mb-1">
            Invoice No <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <div
            className="w-full h-[var(--ui-control-h-sm)] px-2.5 py-1.5 text-[length:var(--ui-font-size-sm)] border border-[var(--ui-border-strong)] rounded-[var(--ui-radius)] bg-[var(--ui-border)] font-bold text-[var(--ui-text)] flex items-center select-text cursor-default"
            title="Auto-generated Invoice Number"
          >
            <span className="truncate">{invoiceNo || "N/A"}</span>
          </div>
        </div>

        {/* Sales Date */}
        <div>
          <label className="ui-label block mb-1">
            Sales Date <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <DatePicker
            value={salesDate}
            onChange={(dateStr) => setSalesDate(dateStr || new Date().toISOString().substring(0, 10))}
            size="md"
            isClearable={false}
            displayFormat="DD MMM, YYYY"
            placeholder="Select sales date"
          />
        </div>
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

        <div className="ui-card flex flex-col gap-2 p-2 sm:p-2.5">
          <div className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-[var(--ui-text)]">
              Discounts & Extra Charges
            </h3>

            {/* Overall Invoice Discount (Fixed Amount) */}
            <CurrencyInput
              label="Overall Discount (৳):"
              value={discountValue}
              onChange={setDiscountValue}
            />

            {/* Invoice VAT (Fixed Amount) */}
            <CurrencyInput
              label="Invoice VAT (৳):"
              value={vatAmount}
              onChange={setVatAmount}
            />

            {/* Delivery Charge */}
            <CurrencyInput
              label="Delivery Charge (৳):"
              value={deliveryCharge}
              onChange={setDeliveryCharge}
            />
          </div>

          {/* Notes / Remarks */}
          <TradeNotesInput
            value={notes}
            onChange={setNotes}
            mode="sale"
            className="mt-1.5 pt-1.5 border-t border-[var(--ui-border)]"
          />
        </div>

        </div>

        {/* ---------- Summary rail (pinned on wide screens) ---------- */}
        <aside className="flex flex-col gap-2 xl:sticky xl:top-[3.5rem] xl:col-span-4">
        <div className="ui-card flex flex-col gap-2 p-2 sm:p-2.5">
          {/* Financial summary, read as an invoice ledger: labels left, figures
              right-aligned on tabular numerals so the columns line up, with a
              rule separating the payable total. */}
          <TradeLedgerSummary
            subtotal={rawSubtotal}
            discount={totalDiscount}
            extraLabel="VAT + Delivery"
            extraAmount={totalVat + calculatedDelivery}
            grandTotal={grandTotal}
          />

          {/* Unified Payment Section */}
          <TradePaymentSection
            grandTotal={grandTotal}
            payment={payment}
            registeredBankAccounts={registeredBankAccounts}
            registeredMfsAccounts={registeredMfsAccounts}
            title="Payment Collected"
            bankLabel="BANK"
          />
          {/* Settlement summary: who, then paid vs short */}
          {/* Who this settlement belongs to. Shown above the Paid / Short row
              so the amounts are always read against a named party — walk-in
              counter sales fall back to whatever was typed in the quick fields. */}
          <div className="flex items-center justify-between gap-2 border-t border-[var(--ui-border)]/90 pt-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <FaUserCircle size={12} className="shrink-0 text-[var(--ui-text-subtle)]" />
              <span className="truncate text-[11px] font-semibold text-[var(--ui-text)]">
                {isWalkIn
                  ? walkInName.trim() || "Walk-in Customer"
                  : selectedCustomer?.name || selectedCustomer?.partyName || "—"}
              </span>
              {(isWalkIn ? walkInPhone.trim() : selectedCustomer?.phone || selectedCustomer?.phoneNumber) && (
                <span className="truncate text-[10px] tabular-nums text-[var(--ui-text-muted)]">
                  · {isWalkIn ? walkInPhone.trim() : selectedCustomer?.phone || selectedCustomer?.phoneNumber}
                </span>
              )}
              {isWalkIn && (
                <span className="shrink-0 rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-border)] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ui-success-dark)]">
                  Counter
                </span>
              )}
            </div>
            {!isWalkIn && customerApiId && previousDue > 0 && (
              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--ui-danger-dark)]">
                Previous due ৳ {formatMoney(previousDue)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-2">
            {/* Total Paid Card with status badge */}
            <div className="bg-[var(--ui-success-light)]/90 px-2.5 py-1 rounded-[var(--ui-radius-sm)] border border-[var(--ui-success-border)]/90 flex items-center justify-between shadow-[var(--ui-shadow-control)]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ui-success)] inline-block" />
                <span className="text-[11px] font-bold text-[var(--ui-success-dark)] tracking-wide">
                  Total Paid
                </span>
                <span className="text-[10px] font-semibold px-1 py-0.5 rounded-[var(--ui-radius-sm)] bg-[var(--ui-success-border)] text-[var(--ui-success-dark)]">
                  {totalPaid >= grandTotal && grandTotal > 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID"}
                </span>
              </div>
              <span className="text-xs sm:text-[13px] font-extrabold tabular-nums text-[var(--ui-success-dark)]">
                ৳ {formatMoney(totalPaid)}
              </span>
            </div>

            {/* Short (unpaid remainder) or Change Return */}
            {changeReturnAmount > 0 ? (
              <div className="bg-[var(--primary-color-light)]/90 px-2.5 py-1 rounded-[var(--ui-radius-sm)] border border-[var(--primary-color-muted)]/90 flex items-center justify-between shadow-[var(--ui-shadow-control)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color)] inline-block" />
                  <span className="text-[11px] font-bold text-[var(--primary-color-dark)] tracking-wide">
                    Change / ফেরত
                  </span>
                </div>
                <span className="text-xs sm:text-[13px] font-extrabold tabular-nums text-[var(--primary-color-dark)]">
                  ৳ {formatMoney(changeReturnAmount)}
                </span>
              </div>
            ) : (
              <div
                className={`px-2.5 py-1 rounded-[var(--ui-radius-sm)] border flex items-center justify-between transition-colors shadow-[var(--ui-shadow-control)] ${
                  dueAmount > 0 ? "bg-[var(--ui-danger-light)]/90 border-[var(--ui-danger-border)]/90" : "bg-[var(--ui-surface-muted)] border-[var(--ui-border)]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${
                      dueAmount > 0 ? "bg-[var(--ui-danger)]" : "bg-[var(--ui-text-subtle)]"
                    }`}
                  />
                  <span
                    className={`text-[11px] font-bold tracking-wide ${
                      dueAmount > 0 ? "text-[var(--ui-danger-dark)]" : "text-[var(--ui-text)]"
                    }`}
                  >
                    Short
                  </span>
                  {dueAmount > 0 && (
                    <span className="text-[10px] font-semibold px-1 py-0.5 rounded-[var(--ui-radius-sm)] bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)]">
                      SHORT
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs sm:text-[13px] font-extrabold ${
                    dueAmount > 0 ? "text-[var(--ui-danger)]" : "text-[var(--ui-text)]"
                  }`}
                >
                  ৳ {formatMoney(dueAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

          {/* Primary actions live with the totals they commit */}
          <div className="ui-card flex items-center gap-2 p-2 sm:p-2.5">
            <Button
              label={isSubmitting ? "Saving..." : isEditMode ? "Update Sale" : "Save Sale"}
              onClick={() => handlePreSubmit(false)}
              color="var(--primary-color)"
              disabled={isSubmitting}
              buttonClass="flex-1 !w-auto justify-center !py-2 text-[length:var(--ui-font-size-sm)] font-semibold !text-white"
            />
            <Button
              label="Save & Print"
              onClick={() => handlePreSubmit(true)}
              color="#059669"
              disabled={isSubmitting}
              buttonClass="flex-1 !w-auto justify-center !py-2 text-[length:var(--ui-font-size-sm)] font-semibold !text-white"
            />
          </div>
        </aside>
      </div>

      {/* Save Confirm Modal */}
      {isSaveConfirmModalOpen && (
        <ConfirmModal
          isOpen={isSaveConfirmModalOpen}
          title={isEditMode ? "Update Sale Invoice?" : "Save Sale Invoice?"}
          message={`Are you sure you want to ${isEditMode ? "update" : "save"} this sale invoice with total amount ৳${formatMoney(grandTotal)}?`}
          confirmText={pendingSavePrint ? "Save & Print" : "Save"}
          cancelText="Cancel"
          isLoading={isSubmitting}
          onClose={() => {
            if (!isSubmittingRef.current && !isSubmitting) {
              setIsSaveConfirmModalOpen(false);
            }
          }}
          onConfirm={() => {
            if (isSubmittingRef.current || isSubmitting) return;
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
          iconBgColor="bg-[var(--ui-danger-border)]"
          confirmButtonColor="bg-[var(--ui-danger)] hover:bg-[var(--ui-danger-dark)]"
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
