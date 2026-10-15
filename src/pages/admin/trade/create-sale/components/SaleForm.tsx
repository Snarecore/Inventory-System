import React, { useState, useEffect, useMemo, useRef } from "react";
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
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState<boolean>(false);
  const customerRef = useRef<HTMLDivElement>(null);

  // Line items
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Pricing, Discounts, VAT & Extra
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [vatAmount, setVatAmount] = useState<string>("");
  const [deliveryCharge, setDeliveryCharge] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isNotesDropdownOpen, setIsNotesDropdownOpen] = useState<boolean>(false);
  const notesDropdownRef = useRef<HTMLDivElement>(null);

  // Split payment amounts
  const [cashAmount, setCashAmount] = useState<string>("");
  const [bankAmount, setBankAmount] = useState<string>("");
  const [mfsAmount, setMfsAmount] = useState<string>("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [showCashGivenCalc, setShowCashGivenCalc] = useState<boolean>(false);

  // Bank & MFS details
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountNo, setAccountNo] = useState<string>("");
  const [bankRef, setBankRef] = useState<string>("");

  const [selectedMfsId, setSelectedMfsId] = useState<string>("");
  const [mfsName, setMfsName] = useState<string>("");
  const [mfsPhone, setMfsPhone] = useState<string>("");

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
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
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

      setCashAmount(cash !== "" && cash !== null && Number(cash) > 0 ? String(cash) : "");
      setBankAmount(bank !== "" && bank !== null && Number(bank) > 0 ? String(bank) : "");
      setMfsAmount(mfs !== "" && mfs !== null && Number(mfs) > 0 ? String(mfs) : "");

      if (data.bankId) setSelectedBankId(String(data.bankId));
      setBankName(data.bankName || "");
      setAccountNo(data.accountNo || "");
      setBankRef(data.bankAccountName || "");

      if (data.mfsId) setSelectedMfsId(String(data.mfsId));
      setMfsName(data.mfsName || "bKash");
      setMfsPhone(data.mfsPhone || "");

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

  // Filtered Products for Search Dropdown (Instant O(N) in-memory filter)
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return allProducts.slice(0, 15);
    const q = productSearchQuery.toLowerCase().trim();
    return allProducts
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const pcode = (p.pcode || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        return name.includes(q) || pcode.includes(q) || barcode.includes(q);
      })
      .slice(0, 25);
  }, [allProducts, productSearchQuery]);

  // Filtered Customers (Instant O(N) in-memory filter)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customerList.slice(0, 15);
    const q = customerSearchQuery.toLowerCase().trim();
    return customerList.filter((c) => {
      const name = (c.name || c.partyName || "").toLowerCase();
      const phone = (c.phone || c.partyPhone || "").toLowerCase();
      const address = (c.address || c.partyAddress || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || address.includes(q);
    });
  }, [customerList, customerSearchQuery]);

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

  const numCash = Number(cashAmount) || 0;
  const numBank = Number(bankAmount) || 0;
  const numMfs = Number(mfsAmount) || 0;
  const totalPaid = numCash + numBank + numMfs;
  const dueAmount = Math.max(0, grandTotal - totalPaid);

  const numCashGiven = Number(cashGiven) || 0;
  const changeReturnAmount = numCashGiven > numCash ? numCashGiven - numCash : 0;

  // Helper to check if a product is already added in the sale line items list
  const isProductAlreadyInList = (p: ProductItem) => {
    const pId = String(p.id ?? p.productId ?? (p as any).product_id ?? "");
    const pCode = (p.pcode || p.productCode || (p as any).product_code || "").trim().toLowerCase();

    return lineItems.some((item) => {
      if (pId && item.productId && String(item.productId) === pId) return true;
      if (pCode && item.productCode && item.productCode.trim().toLowerCase() === pCode) return true;
      return false;
    });
  };

  // Toggle adding or removing a product from sale line items directly (matches PurchaseForm UX)
  const handleToggleProductInList = (p: ProductItem) => {
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
  };

  // Handle Add Product to Line Items (used for barcode scanning or incrementing)
  const handleAddProduct = (p: ProductItem, keepDropdownOpen: boolean = false) => {
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
      const updated = [...lineItems];
      const curQty = Number(updated[existingIndex].quantity) || 1;
      const newQty = curQty + 1;

      if (newQty > stock) {
        showErrorToast(`Stock limit reached (${stock} ${unit}) for "${pName}"`);
        return;
      }

      const unitPrice = Number(updated[existingIndex].sellPrice) || sellPrice;
      const disc = Number(updated[existingIndex].discount) || 0;
      const vat = Number(updated[existingIndex].vat) || 0;

      const base = unitPrice * newQty;
      const total = base + vat - disc;

      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: String(newQty),
        total: Math.max(0, total),
      };
      setLineItems(updated);
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

    if (!keepDropdownOpen) {
      setProductSearchQuery("");
      setIsProductDropdownOpen(false);
    }
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts.length === 1) {
        handleToggleProductInList(filteredProducts[0]);
        return;
      }
      const q = productSearchQuery.toLowerCase().trim();
      if (!q) return;
      const immediateMatches = allProducts.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const pcode = (p.pcode || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        return name.includes(q) || pcode.includes(q) || barcode.includes(q);
      });
      if (immediateMatches.length === 1) {
        handleToggleProductInList(immediateMatches[0]);
      }
    }
  };

  // Find Product STRICTLY By barcode or pcode
  const findProductByBarcode = (query: string): ProductItem | undefined => {
    const code = query.trim().toLowerCase();
    if (!code) return undefined;

    return allProducts.find((p) => {
      const barcode = String(p.barcode || "").trim().toLowerCase();
      const pcode = String(p.pcode || "").trim().toLowerCase();
      return Boolean((barcode && barcode === code) || (pcode && pcode === code));
    });
  };

  const processBarcodeMatch = (codeToSearch: string) => {
    const trimmed = codeToSearch.trim();
    if (!trimmed) return false;

    const found = findProductByBarcode(trimmed);
    if (found) {
      const stock = Number(found.quantity ?? found.stock ?? 0);
      if (stock <= 0) {
        showErrorToast(`Product "${found.name || found.productName || "Product"}" is out of stock (Stock: 0)`);
        setBarcodeInput("");
        return true;
      }
      handleAddProduct(found);
      setBarcodeInput("");
      return true;
    }
    return false;
  };

  // Barcode Input Change Handler (Auto-detects exact barcode or pcode match)
  const handleBarcodeChange = (val: string) => {
    setBarcodeInput(val);
    const trimmed = val.trim();
    if (!trimmed) return;

    // Check if the input is an exact barcode or pcode match
    const matched = allProducts.find((p) => {
      const barcode = String(p.barcode || "").trim().toLowerCase();
      const pcode = String(p.pcode || "").trim().toLowerCase();
      return Boolean(
        (barcode && barcode === trimmed.toLowerCase()) ||
        (pcode && pcode === trimmed.toLowerCase())
      );
    });

    if (matched) {
      const stock = Number(matched.quantity ?? matched.stock ?? 0);
      if (stock <= 0) {
        showErrorToast(`Product "${matched.name || matched.productName || "Product"}" is out of stock (Stock: 0)`);
        setBarcodeInput("");
        return;
      }
      handleAddProduct(matched);
      setBarcodeInput("");
    }
  };

  // Barcode Scanning Handler (On Enter key)
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;

      const success = processBarcodeMatch(code);
      if (!success) {
        showErrorToast(`Product with barcode "${barcodeInput}" not found`);
      }
    }
  };

  // Barcode Paste Handler (Paste full barcode)
  const handleBarcodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted) return;
    const success = processBarcodeMatch(pasted);
    if (success) {
      e.preventDefault();
    }
  };

  const handleUpdateLineItem = (index: number, field: keyof FormLineItem, val: string) => {
    const updated = [...lineItems];
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
    setLineItems(updated);
  };

  const handleConfirmDeleteLineItem = () => {
    if (itemIndexToDelete !== null && itemIndexToDelete >= 0) {
      setLineItems((prev) => prev.filter((_, idx) => idx !== itemIndexToDelete));
      setItemIndexToDelete(null);
      setIsDeleteLineModalOpen(false);
      showDeleteToast("Item removed from sale list");
    }
  };

  // Payment normalizer & capping helper (exact amount cannot be exceeded)
  const normalizePaymentValue = (val: string, max: number): string => {
    if (val === "" || val === undefined || val === null) return "";
    if (val === ".") return "0.";
    const num = Number(val);
    if (isNaN(num)) return "";
    if (num < 0) return "0";
    if (num > max) return String(max);
    return val;
  };

  // Card Amount Change: cannot enter if bank not selected; auto deducts from cash; caps to max
  const handleCardAmountChange = (rawVal: string) => {
    if (!selectedBankId) {
      showErrorToast("Please select a bank first before entering card amount");
      return;
    }
    const currentMfs = Number(mfsAmount) || 0;
    const maxForCard = Math.max(0, grandTotal - currentMfs);
    const normalized = normalizePaymentValue(rawVal, maxForCard);
    setBankAmount(normalized);

    const numCard = Number(normalized) || 0;
    const remainingCash = Math.max(0, grandTotal - numCard - currentMfs);
    setCashAmount(remainingCash > 0 ? String(Math.round(remainingCash * 100) / 100) : "0");
  };

  // MFS Amount Change: cannot enter if MFS not selected; auto deducts from cash; caps to max
  const handleMfsAmountChange = (rawVal: string) => {
    if (!selectedMfsId) {
      showErrorToast("Please select an MFS provider first before entering MFS amount");
      return;
    }
    const currentCard = Number(bankAmount) || 0;
    const maxForMfs = Math.max(0, grandTotal - currentCard);
    const normalized = normalizePaymentValue(rawVal, maxForMfs);
    setMfsAmount(normalized);

    const numMfsVal = Number(normalized) || 0;
    const remainingCash = Math.max(0, grandTotal - currentCard - numMfsVal);
    setCashAmount(remainingCash > 0 ? String(Math.round(remainingCash * 100) / 100) : "0");
  };

  // Cash Amount Change: cannot exceed remaining amount
  const handleCashAmountChange = (rawVal: string) => {
    const currentCard = Number(bankAmount) || 0;
    const currentMfs = Number(mfsAmount) || 0;
    const maxForCash = Math.max(0, grandTotal - currentCard - currentMfs);
    const normalized = normalizePaymentValue(rawVal, maxForCash);
    setCashAmount(normalized);
  };

  // Auto-sync initial cash amount with grandTotal when grandTotal changes
  useEffect(() => {
    const currentCard = Number(bankAmount) || 0;
    const currentMfs = Number(mfsAmount) || 0;

    if (currentCard === 0 && currentMfs === 0) {
      if (grandTotal > 0) {
        setCashAmount(String(grandTotal));
      } else {
        setCashAmount("");
      }
    } else {
      const remainingCash = Math.max(0, grandTotal - currentCard - currentMfs);
      setCashAmount(remainingCash > 0 ? String(Math.round(remainingCash * 100) / 100) : "0");
    }
  }, [grandTotal]);

  // Quick Payment presets
  const handlePayFullCash = () => {
    setCashAmount(grandTotal > 0 ? String(grandTotal) : "");
    setBankAmount("");
    setMfsAmount("");
  };

  const handlePayFullBank = () => {
    if (!selectedBankId) {
      if (registeredBankAccounts.length > 0) {
        const firstBank = registeredBankAccounts[0];
        const bId = String(firstBank.id || firstBank.bankId || firstBank._id || "");
        handleSelectBank(bId);
      } else {
        showErrorToast("Please select / register a bank account first");
        return;
      }
    }
    setBankAmount(grandTotal > 0 ? String(grandTotal) : "");
    setCashAmount("0");
    setMfsAmount("");
  };

  const handlePayFullMfs = () => {
    if (!selectedMfsId) {
      if (registeredMfsAccounts.length > 0) {
        const firstMfs = registeredMfsAccounts[0];
        const mId = String(firstMfs.id || firstMfs.mfsId || firstMfs._id || "");
        handleSelectMfs(mId);
      } else {
        showErrorToast("Please select / register an MFS account first");
        return;
      }
    }
    setMfsAmount(grandTotal > 0 ? String(grandTotal) : "");
    setCashAmount("0");
    setBankAmount("");
  };

  const handlePayFullCredit = () => {
    setCashAmount("");
    setBankAmount("");
    setMfsAmount("");
    setCashGiven("");
  };

  const handleSelectBank = (id: string) => {
    setSelectedBankId(id);
    const found = registeredBankAccounts.find((b) => String(b.id || b.bankId || b._id) === String(id));
    if (found) {
      setBankName(found.bankName || found.name || "");
      setAccountNo(found.accountNo || found.bankAccountNumber || found.bankAccountNo || "");
      setBankRef(found.bankAccountName || found.accountName || found.branchName || "");
    } else {
      setBankName("");
      setAccountNo("");
      setBankRef("");
    }
  };

  const handleSelectMfs = (id: string) => {
    setSelectedMfsId(id);
    const found = registeredMfsAccounts.find((m) => String(m.id || m.mfsId || m._id) === String(id));
    if (found) {
      setMfsName(found.name || found.mfsName || found.method || "");
      setMfsPhone(found.phoneNumber || found.mfsPhone || found.phone || "");
    } else {
      setMfsName("");
      setMfsPhone("");
    }
  };

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
    setCashAmount("");
    setBankAmount("");
    setMfsAmount("");
    setCashGiven("");
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
        <div className="relative" ref={customerRef}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-black  tracking-wider">
              Customer <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(WALK_IN_CUSTOMER);
                  setIsCustomerDropdownOpen(false);
                }}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                  selectedCustomer?.id === 0 || selectedCustomer?.name === "Walk-in Customer"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                }`}
                title="Quick 1-click counter / walk-in customer"
              >
                <FaWalking size={10} />
                <span>Walk-in</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPartyModalOpen(true)}
                className="text-[11px] font-bold text-[var(--color-primary)] flex items-center gap-1 cursor-pointer"
              >
                <FaUserPlus size={10} /> + New
              </button>
            </div>
          </div>

          <div
            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
            className={`flex items-center justify-between h-9 px-2.5 py-1.5 border rounded-lg bg-gray-50/50 hover:bg-white cursor-pointer text-xs transition-colors ${
              selectedCustomer?.id === 0 || selectedCustomer?.name === "Walk-in Customer"
                ? "border-emerald-400 bg-emerald-50/30"
                : "border-gray-300"
            }`}
          >
            {selectedCustomer ? (
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                {selectedCustomer.id === 0 || selectedCustomer.name === "Walk-in Customer" ? (
                  <span className="font-bold text-emerald-800 flex items-center gap-1 truncate">
                    <FaWalking size={12} className="text-emerald-700 shrink-0" />
                    Walk-in Customer {walkInName ? `(${walkInName})` : "(Counter Sale)"}
                  </span>
                ) : (
                  <>
                    <span className="font-bold text-black truncate">
                      {selectedCustomer.name || selectedCustomer.partyName}
                    </span>
                    {(selectedCustomer.phone || selectedCustomer.partyPhone) && (
                      <span className="text-[11px] text-gray-700 shrink-0">
                        ({selectedCustomer.phone || selectedCustomer.partyPhone})
                      </span>
                    )}
                    {(selectedCustomer.address || selectedCustomer.partyAddress) && (
                      <span className="text-[11px] text-black truncate">
                        - {selectedCustomer.address || selectedCustomer.partyAddress}
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <span className="text-gray-400">Select or search customer...</span>
            )}
            <FiChevronDown className="text-gray-500 text-xs ml-1 shrink-0" size={14} />
          </div>

          {/* Optional Walk-in Inputs */}
          {(selectedCustomer?.id === 0 || selectedCustomer?.name === "Walk-in Customer") && (
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 p-1.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <input
                type="text"
                placeholder="Name (Optional)"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white font-medium text-black focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Phone (Optional)"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white font-medium text-black focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Customer Dropdown Panel */}
          {isCustomerDropdownOpen && (
            <div className="absolute left-0 right-0 sm:right-auto sm:w-96 max-w-[calc(100vw-32px)] mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-1.5 z-30">
              <div className="relative mb-1.5">
                <FaSearch className="absolute left-2.5 top-2 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search customer name, phone, address..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[var(--color-primary)] text-black"
                  autoFocus
                />
              </div>

              {/* Quick Walk-in Option */}
              <div
                onClick={() => {
                  setSelectedCustomer(WALK_IN_CUSTOMER);
                  setIsCustomerDropdownOpen(false);
                }}
                className="px-2 py-1 mb-1 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-md cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px]">
                    <FaWalking size={10} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-emerald-900 text-[11px] leading-tight">Walk-in Customer</span>
                    <span className="text-[9.5px] text-emerald-700 leading-tight">Quick counter sale / সাধারণ ক্রেতা</span>
                  </div>
                </div>
                <span className="text-[9.5px] font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300 shadow-2xs">
                  Select
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <div
                      key={c.id || c.partyId || c.name}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs flex justify-between items-center"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-black">{c.name || c.partyName}</span>
                          {(c.phone || c.partyPhone) && (
                            <span className="text-[11px] text-black">({c.phone || c.partyPhone})</span>
                          )}
                        </div>
                        {(c.address || c.partyAddress) && (
                          <span className="text-[10px] text-black truncate mt-0.5">
                            {c.address || c.partyAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-400 text-xs">No customer found</div>
                )}
              </div>

              {/* Add New Customer Action Button */}
              {customerSearchQuery.trim() && (
                <div
                  onClick={() => {
                    setIsPartyModalOpen(true);
                    setIsCustomerDropdownOpen(false);
                  }}
                  className="mt-2 p-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md cursor-pointer text-xs flex items-center justify-between text-[var(--color-primary)] font-bold transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <FaUserPlus size={11} /> Add "{customerSearchQuery}" as New Customer
                  </span>
                  <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-sky-300 shrink-0">
                    + Add
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

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
      <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs relative" ref={productSearchRef}>
        <div className="flex items-center gap-2">
          {/* Barcode Quick Scan */}
          <div className="relative w-44 sm:w-56 shrink-0 hidden sm:block">
            <FaBarcode className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={(e) => handleBarcodeChange(e.target.value)}
              onKeyDown={handleBarcodeScan}
              onPaste={handleBarcodePaste}
              className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-medium text-black h-9 bg-gray-50/50"
            />
          </div>

          {/* Search Product Input */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search product name, code to add..."
              value={productSearchQuery}
              onChange={(e) => {
                setProductSearchQuery(e.target.value);
                setIsProductDropdownOpen(true);
              }}
              onFocus={() => setIsProductDropdownOpen(true)}
              onKeyDown={handleKeyDownSearch}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--primary-color)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-gray-50/40 focus:bg-white font-medium text-black placeholder:text-gray-400 placeholder:text-xs h-9 transition-all"
            />
          </div>

          {/* Dynamic Action Button */}
          {isProductDropdownOpen ? (
            <button
              type="button"
              onClick={() => {
                setIsProductDropdownOpen(false);
                setProductSearchQuery("");
              }}
              className="px-3 sm:px-3.5 h-9 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer bg-gray-100 hover:bg-gray-200 text-black border border-gray-300"
            >
              <FaTimes size={11} className="text-gray-600" />
              <span>Cancel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsProductDropdownOpen(true)}
              className="px-3 sm:px-3.5 h-9 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white"
            >
              <FaPlus size={10} className="text-white" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Product Dropdown */}
        {isProductDropdownOpen && (
          <div className="absolute left-2.5 right-2.5 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-72 overflow-y-auto z-20 divide-y divide-gray-100">
            {/* Helpful Quick Guide Header Bar */}
            <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
              <span>Select Product</span>
              <div className="flex items-center gap-6 pr-2">
                <span>Stock</span>
                <span>Sale Rate</span>
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const prodKey = String(p.id ?? p.productId ?? (p as any).product_id ?? p.pcode ?? p.productCode ?? "");
                const isAlreadyInList = isProductAlreadyInList(p);
                const existingIndex = lineItems.findIndex(
                  (item) =>
                    (p.id && String(item.productId) === String(p.id)) ||
                    (p.productCode && item.productCode.toLowerCase() === String(p.productCode).toLowerCase()) ||
                    (p.pcode && item.productCode.toLowerCase() === String(p.pcode).toLowerCase())
                );
                const cartItem = existingIndex > -1 ? lineItems[existingIndex] : null;
                const cartQty = Number(cartItem?.quantity || 0);
                const totalStock = Number(p.quantity ?? p.stock ?? (p as any).qty ?? 0);
                const remainingStock = Math.max(0, totalStock - cartQty);
                const isOutOfStock = totalStock <= 0;
                const defaultSellPrice = Number(p.sellPrice ?? p.sell_price ?? p.buyPrice ?? (p as any).buy_price ?? 0);
                const prodName = p.name || p.productName || (p as any).product_name || "Product";
                const prodCode = p.pcode || p.productCode || (p as any).product_code || (p as any).sku || "N/A";
                const prodUnit = p.unit || "pcs";

                return (
                  <div
                    key={prodKey}
                    onClick={() => {
                      if (isOutOfStock && !isAlreadyInList) {
                        showErrorToast(`"${prodName}" is out of stock (Stock: 0)`);
                        return;
                      }
                      handleToggleProductInList(p);
                    }}
                    className={`p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors select-none cursor-pointer ${
                      isOutOfStock && !isAlreadyInList
                        ? "opacity-60 bg-gray-50/90 cursor-not-allowed border-l-4 border-l-rose-300"
                        : isAlreadyInList
                        ? "bg-sky-50/70 hover:bg-sky-100/70 border-l-4 border-l-[var(--color-primary)]"
                        : "hover:bg-gray-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox box */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isOutOfStock && !isAlreadyInList
                            ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : isAlreadyInList
                            ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                            : "border-gray-300 bg-white hover:border-[var(--color-primary)]"
                        }`}
                        title={isAlreadyInList ? "Click to remove from list" : "Click to add to list"}
                      >
                        {isAlreadyInList && <FaCheck size={9} />}
                        {isOutOfStock && !isAlreadyInList && <span className="text-[10px] text-rose-500 font-bold">✕</span>}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-bold truncate ${
                              isOutOfStock && !isAlreadyInList
                                ? "text-gray-500 line-through decoration-rose-400"
                                : isAlreadyInList
                                ? "text-[var(--color-primary)]"
                                : "text-black"
                            }`}
                          >
                            {prodName}
                          </span>
                          {isAlreadyInList && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-semibold whitespace-nowrap">
                              Added in list
                            </span>
                          )}
                          {isOutOfStock && !isAlreadyInList && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 border border-rose-300 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                              Stock Out / স্টক নেই
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500">
                          Code: <span className="text-black font-medium">{prodCode}</span> | Unit:{" "}
                          <span className="text-black font-medium">{prodUnit}</span>
                        </span>
                      </div>
                    </div>

                    {/* Stock & Sale Price Badges - Clean Single Line (1-Line) */}
                    <div
                      className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-center"
                      onClick={(e) => {
                        if (isAlreadyInList) e.stopPropagation();
                      }}
                    >
                      {/* Current / Available Stock */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                          Stock:
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {totalStock <= 0 ? (
                            <span className="text-rose-600">0</span>
                          ) : (
                            <>
                              {remainingStock}{" "}
                              <span className="text-[10px] font-normal text-gray-600">{prodUnit}</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Sell Rate & Cart Qty (1 line - editable when added in list) */}
                      {isAlreadyInList && existingIndex !== -1 ? (
                        <div className="flex items-center gap-2">
                          {/* Editable Sale Qty */}
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-300 shadow-2xs">
                            <span className="text-[10px] font-bold text-sky-800">
                              Qty:
                            </span>
                            <input
                              type="number"
                              min="1"
                              max={totalStock > 0 ? totalStock : undefined}
                              step="1"
                              value={lineItems[existingIndex].quantity}
                              placeholder="1"
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => {
                                handleUpdateLineItem(existingIndex, "quantity", e.target.value);
                              }}
                              className="w-12 sm:w-14 px-1 py-0.5 text-xs font-bold text-sky-950 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 text-center"
                              title={`Edit Sale Quantity (Max: ${totalStock})`}
                            />
                            <span className="text-[10px] text-sky-700 font-medium">
                              {prodUnit}
                            </span>
                          </div>

                          {/* Editable Sell Price */}
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 shadow-2xs">
                            <span className="text-[10px] font-bold text-emerald-800">
                              Rate: ৳
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={lineItems[existingIndex].sellPrice}
                              placeholder="0"
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => {
                                handleUpdateLineItem(existingIndex, "sellPrice", e.target.value);
                              }}
                              className="w-16 sm:w-20 px-1 py-0.5 text-xs font-bold text-emerald-950 bg-white border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right"
                              title="Edit Sale Price"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                            Sale Rate:
                          </span>
                          <span className="text-xs font-bold text-emerald-950">
                            ৳ {formatMoney(defaultSellPrice)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-gray-400 text-xs">No products found matching query.</div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Line Items Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-2.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-black">
            Sales Items List ({lineItems.length})
          </h2>
          <span className="text-[11px] text-black font-medium">
            Subtotal: <span className="font-bold text-black">৳ {formatMoney(rawSubtotal)}</span>
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[720px] text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#41bef3] border-b border-gray-200 text-[11px] font-semibold text-black shadow-md">
                <th className="py-2 px-2 text-center w-10 whitespace-nowrap">SL</th>
                <th className="py-2 px-3 w-auto min-w-[200px]">Product</th>
                <th className="py-2 px-2 text-center w-16 whitespace-nowrap">Unit</th>
                <th className="py-2 px-2 text-center w-20 whitespace-nowrap">Stock</th>
                <th className="py-2 px-2 text-right w-28 min-w-[100px] whitespace-nowrap">Sell Price (৳)</th>
                <th className="py-2 px-2 text-center w-28 min-w-[110px] whitespace-nowrap">Quantity</th>
                <th className="py-2 px-3 text-right w-28 min-w-[100px] whitespace-nowrap">Total (৳)</th>
                <th className="py-2 px-2 text-center w-10 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.length > 0 ? (
                lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-2 px-2 text-center text-gray-700 text-[11px] whitespace-nowrap">
                      {idx + 1}
                    </td>

                    <td className="py-2 px-3">
                      <span className="font-semibold text-black block">{item.productName}</span>
                      {item.productCode && (
                        <span className="text-[10px] text-black">Code: {item.productCode}</span>
                      )}
                    </td>

                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="text-black font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                        {item.unit || "pcs"}
                      </span>
                    </td>

                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {Number(item.stock) || 0}
                      </span>
                    </td>

                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <div className="relative inline-block w-full">
                        <span className="absolute left-1.5 top-1.5 text-black font-bold text-[11px]">৳</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.sellPrice}
                          placeholder="0"
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => handleUpdateLineItem(idx, "sellPrice", e.target.value)}
                          className="w-full pl-5 pr-1.5 py-1 text-xs border border-gray-300 rounded text-right font-bold text-black focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    </td>

                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center border border-gray-300 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const q = Math.max(1, (Number(item.quantity) || 1) - 1);
                            handleUpdateLineItem(idx, "quantity", String(q));
                          }}
                          className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          placeholder="0"
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => handleUpdateLineItem(idx, "quantity", e.target.value)}
                          className="w-12 py-1 text-xs text-center font-bold text-black focus:outline-none border-x border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const q = (Number(item.quantity) || 0) + 1;
                            handleUpdateLineItem(idx, "quantity", String(q));
                          }}
                          className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-right font-bold text-black whitespace-nowrap">
                      ৳ {formatMoney(item.total)}
                    </td>

                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setItemIndexToDelete(idx);
                          setIsDeleteLineModalOpen(true);
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <FaTrash size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No items in sales cart. Search and add products above or scan barcodes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

          {/* Payment Collected Section */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-bold text-gray-800  tracking-wider flex items-center gap-1.5">
              <FaWallet size={11} className="text-gray-700" />
              Payment Collected
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePayFullCash}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 shadow-2xs transition-colors cursor-pointer"
              >
                Cash
              </button>
              <button
                type="button"
                onClick={handlePayFullBank}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 shadow-2xs transition-colors cursor-pointer"
              >
                Bank
              </button>
              <button
                type="button"
                onClick={handlePayFullMfs}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-800 border border-purple-300 hover:bg-purple-100 shadow-2xs transition-colors cursor-pointer"
              >
                MFS
              </button>
              <button
                type="button"
                onClick={handlePayFullCredit}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 shadow-2xs transition-colors cursor-pointer"
              >
                Credit
              </button>
            </div>
          </div>

          {/* Payment Breakdown Cards */}
          <div className="flex flex-col gap-1.5">
            {/* 1. Cash Card */}
            <div
              className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs ${
                Number(cashAmount) > 0
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-gray-200 bg-gray-50/50 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FaMoneyBillWave size={11} />
                </div>
                <span className="font-bold text-[11px] text-gray-800 tracking-wider">CASH</span>
              </div>

              <div
                className={`flex items-center h-6.5 rounded border bg-white overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                  Number(cashAmount) > 0
                    ? "border-emerald-500 ring-1 ring-emerald-500/50"
                    : "border-gray-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
                }`}
              >
                <span className="text-[11px] text-gray-600 font-bold px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={cashAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => handleCashAmountChange(e.target.value)}
                  className="w-full text-right px-1.5 text-xs font-bold text-black outline-none bg-transparent placeholder:text-gray-400 h-full"
                />
              </div>
            </div>

            {/* Change Calculator Toggle */}
            {numCash > 0 && (
              <div className="flex items-center justify-end gap-2 text-[10px] px-1 -my-0.5">
                <button
                  type="button"
                  onClick={() => setShowCashGivenCalc(!showCashGivenCalc)}
                  className="text-[var(--color-primary)] cursor-pointer font-bold"
                >
                  {showCashGivenCalc ? "- Hide Change Calculator" : "+ Calculate Cash Change / ভাংতি"}
                </button>
              </div>
            )}

            {showCashGivenCalc && numCash > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-emerald-50/60 px-2 py-1 rounded-md border border-emerald-200 shadow-2xs">
                <span className="text-[11px] text-gray-800 font-semibold">Cash Tendered:</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-28 sm:w-32">
                    <span className="absolute left-1.5 top-0.5 text-gray-600 text-xs font-bold">৳</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={cashGiven}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="w-full pl-4.5 pr-1.5 py-0.5 text-xs border border-gray-300 rounded text-right font-bold text-black bg-white outline-none focus:border-emerald-500 h-6"
                    />
                  </div>
                  {changeReturnAmount > 0 && (
                    <span className="text-[11px] text-emerald-800 font-bold whitespace-nowrap">
                      Return: ৳{formatMoney(changeReturnAmount)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 2. Card / Bank Card */}
            <div
              className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs ${
                Number(bankAmount) > 0
                  ? "border-sky-400 bg-sky-50/30"
                  : "border-gray-200 bg-gray-50/50 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
                <div className="w-6 h-6 rounded bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <FaCreditCard size={11} />
                </div>
                <span className="font-bold text-[11px] text-gray-800 tracking-wider shrink-0">BANK</span>
                <select
                  value={selectedBankId}
                  onChange={(e) => handleSelectBank(e.target.value)}
                  className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-300 rounded bg-white text-black font-medium focus:outline-none focus:border-sky-500 cursor-pointer truncate"
                >
                  <option value="" className="text-black">
                    {registeredBankAccounts.length ? "Select Bank..." : "No bank registered"}
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
                className={`flex items-center h-6.5 rounded border bg-white overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                  !selectedBankId
                    ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                    : Number(bankAmount) > 0
                    ? "border-sky-500 ring-1 ring-sky-500/50"
                    : "border-gray-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500"
                }`}
              >
                <span className="text-[11px] text-gray-600 font-bold px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  disabled={!selectedBankId}
                  value={bankAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => handleCardAmountChange(e.target.value)}
                  className="w-full text-right px-1.5 text-xs font-bold text-black outline-none bg-transparent placeholder:text-gray-400 h-full"
                />
              </div>
            </div>

            {/* 3. MFS Card */}
            <div
              className={`px-2.5 py-1 rounded-md border transition-all flex items-center justify-between gap-1.5 shadow-2xs ${
                Number(mfsAmount) > 0
                  ? "border-purple-400 bg-purple-50/30"
                  : "border-gray-200 bg-gray-50/50 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
                <div className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <FaMobileAlt size={11} />
                </div>
                <span className="font-bold text-[11px] text-gray-800 tracking-wider shrink-0">MFS</span>
                <select
                  value={selectedMfsId}
                  onChange={(e) => handleSelectMfs(e.target.value)}
                  className="h-6.5 w-full max-w-[130px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-300 rounded bg-white text-black font-medium focus:outline-none focus:border-purple-500 cursor-pointer truncate"
                >
                  <option value="" className="text-black">
                    {registeredMfsAccounts.length ? "Select MFS..." : "No MFS registered"}
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
                className={`flex items-center h-6.5 rounded border bg-white overflow-hidden w-28 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                  !selectedMfsId
                    ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                    : Number(mfsAmount) > 0
                    ? "border-purple-500 ring-1 ring-purple-500/50"
                    : "border-gray-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500"
                }`}
              >
                <span className="text-[11px] text-gray-600 font-bold px-1.5 bg-gray-50 h-full flex items-center border-r border-gray-200 select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  disabled={!selectedMfsId}
                  value={mfsAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => handleMfsAmountChange(e.target.value)}
                  className="w-full text-right px-1.5 text-xs font-bold text-black outline-none bg-transparent placeholder:text-gray-400 h-full"
                />
              </div>
            </div>
          </div>

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

      {/* Reset Confirm Modal */}
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

      {/* Delete Single Line Item Modal */}
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

      {/* Customer Quick Add Modal */}
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

      {/* Invoice Details Modal */}
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
    </div>
  );
};

export default CreateSaleForm;
