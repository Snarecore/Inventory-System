import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";
import {
  FaTrash,
  FaSearch,
  FaBarcode,
  FaUserPlus,
  FaCheck,
  FaPlus,
  FaTimes,
  FaPrint,
  FaCalculator,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
  FaWallet,
} from "react-icons/fa";
import Button from "@/components/button/Button";
import DeleteModal from "@/components/modal/DeleteModal";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PartyModal from "@/pages/admin/people/parties/components/PartyModal";
import SaleInvoiceModal from "@/pages/admin/trade/sales/components/SaleInvoiceModal";
import ImageUpload from "@/components/image/ImageUpload";
import apiConfig from "@/config/api.json";
import {
  salesListQueryKey,
  productListQueryKey,
  partyListQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
} from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { getBusinessCode, getUserInfo } from "@/utils/auth-storage";
import { makeInvoiceNo } from "@/utils/invoiceNo";
import { postData } from "@/services/api-service";
import { useAPI } from "@/hooks/useApi";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast, showDeleteToast } from "@/utils/toast-utils";
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
}

const mockDefaultProducts: ProductItem[] = [
  { id: "1", productId: "1", productCode: "P-1001", productName: "Premium Basmati Rice 25kg", name: "Premium Basmati Rice 25kg", unit: "bag", sellPrice: 3200, buyPrice: 2800, stock: 45 },
  { id: "2", productId: "2", productCode: "P-1002", productName: "Soyabean Oil 5L", name: "Soyabean Oil 5L", unit: "can", sellPrice: 850, buyPrice: 760, stock: 80 },
  { id: "3", productId: "3", productCode: "P-1003", productName: "Aroma Tea Pack 500g", name: "Aroma Tea Pack 500g", unit: "pcs", sellPrice: 310, buyPrice: 250, stock: 120 },
  { id: "4", productId: "4", productCode: "P-1004", productName: "Dell 24-inch IPS Monitor", name: "Dell 24-inch IPS Monitor", unit: "pcs", sellPrice: 18500, buyPrice: 15500, stock: 12 },
  { id: "5", productId: "5", productCode: "P-1005", productName: "Logitech MX Master 3S Mouse", name: "Logitech MX Master 3S Mouse", unit: "pcs", sellPrice: 9500, buyPrice: 7500, stock: 25 },
];

const mockDefaultCustomers: PartyItem[] = [
  { id: "1", partyId: "1", name: "Rahim Traders", partyName: "Rahim Traders", phone: "01711223344", address: "Mirpur 10, Dhaka", type: "CUSTOMER" },
  { id: "2", partyId: "2", name: "Karim Enterprises", partyName: "Karim Enterprises", phone: "01822334455", address: "Dhanmondi, Dhaka", type: "CUSTOMER" },
  { id: "3", partyId: "3", name: "Bismillah General Store", partyName: "Bismillah General Store", phone: "01933445566", address: "Chawkbazar, Chittagong", type: "CUSTOMER" },
];

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
  const [vatPercent, setVatPercent] = useState<string>("");
  const [deliveryCharge, setDeliveryCharge] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isNotesDropdownOpen, setIsNotesDropdownOpen] = useState<boolean>(false);
  const notesDropdownRef = useRef<HTMLDivElement>(null);
  const [attachment, setAttachment] = useState<File | string | null>(null);

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
  const [mfsName, setMfsName] = useState<string>("bKash");
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
  const { data: customersData } = useQuery({
    queryKey: [partyListQueryKey, "CUSTOMER"],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: apiConfig.party?.partyListUrl || "get-party-info-list",
        body: { accessUser, type: "CUSTOMER" },
      });
      const list = res?.partyList || res?.data || res?.parties || [];
      return Array.isArray(list) && list.length > 0 ? list : mockDefaultCustomers;
    },
    staleTime: 5 * 60 * 1000,
  });
  const customerList: PartyItem[] = useMemo(() => {
    if (Array.isArray(customersData) && customersData.length > 0) return customersData;
    return mockDefaultCustomers;
  }, [customersData]);

  // 2. Fetch Products
  const { data: productsData } = useQuery({
    queryKey: [productListQueryKey],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: apiConfig.productList?.productListUrl || "get-product-list",
        body: { accessUser },
      });
      const list = res?.productList || res?.data || res?.products || [];
      return Array.isArray(list) && list.length > 0 ? list : mockDefaultProducts;
    },
    staleTime: 5 * 60 * 1000,
  });
  const allProducts: ProductItem[] = useMemo(() => {
    if (Array.isArray(productsData) && productsData.length > 0) return productsData;
    return mockDefaultProducts;
  }, [productsData]);

  // 3. Fetch Registered Banks
  const { data: banksData } = useQuery({
    queryKey: [bankInfoListQueryKey],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: apiConfig.bankInfo?.bankInfoListUrl || "get-bank-info-list",
        body: { accessUser },
      });
      return res?.bankList || res?.bankInfoList || res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const registeredBankAccounts: any[] = useMemo(() => {
    return Array.isArray(banksData) ? banksData : [];
  }, [banksData]);

  // 4. Fetch Registered MFS Accounts
  const { data: mfsData } = useQuery({
    queryKey: [mfsUserListQueryKey],
    queryFn: async () => {
      const accessUser = buildAccessUser();
      const res: any = await postData({
        url: apiConfig.mfsUser?.mfsUserListUrl || "get-mfs-user-list",
        body: { accessUser },
      });
      return res?.mfsUserList || res?.mfsList || res?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const registeredMfsAccounts: any[] = useMemo(() => {
    return Array.isArray(mfsData) ? mfsData : [];
  }, [mfsData]);

  // Auto-generate invoice number if create mode
  useEffect(() => {
    if (!isEditMode && !invoiceNo) {
      const bCode = getBusinessCode() || getUserInfo()?.businessCode || "1001";
      setInvoiceNo(makeInvoiceNo(bCode));
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

  // Hydrate edit data if in edit mode
  useEffect(() => {
    if (isEditMode && stateEditData) {
      const data = stateEditData;
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
      setVatPercent(v !== "" && v !== null && Number(v) > 0 ? String(v) : "");

      const del = data.delivery_charge ?? data.deliveryCharge ?? "";
      setDeliveryCharge(del !== "" && del !== null && Number(del) > 0 ? String(del) : "");

      // Split payments
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
      const custId = data.customerId || data.customer_id;
      const custName = data.customerName || data.customer_name;
      if (custId || custName) {
        const found = customerList.find(
          (c) => (custId && String(c.id || c.partyId) === String(custId)) || (custName && (c.name === custName || c.partyName === custName))
        );
        if (found) {
          setSelectedCustomer(found);
        } else {
          setSelectedCustomer({
            id: custId,
            name: custName || "Walk-in Customer",
            phone: data.customerPhone || "",
            address: data.customerAddress || "",
          });
        }
      }

      // Details
      const rawDetails =
        data.salesDetails || data.details || data.sales_details || data.items || [];
      if (Array.isArray(rawDetails) && rawDetails.length > 0) {
        const loaded: FormLineItem[] = rawDetails.map((item: any) => {
          const p = Number(item.sellPrice ?? item.price ?? item.rate ?? 0);
          const q = Number(item.quantity ?? item.qty ?? 1);
          const d = Number(item.discount ?? 0);
          const v = Number(item.vat ?? 0);
          const tot = Number(item.total ?? p * q + v - d);

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
            stock: item.stock ?? 50,
          };
        });
        setLineItems(loaded);
      }
    }
  }, [isEditMode, stateEditData, customerList]);

  // Sync live stock from products
  useEffect(() => {
    if (allProducts.length > 0 && lineItems.length > 0) {
      setLineItems((prev) =>
        prev.map((item) => {
          const matched = allProducts.find(
            (p) =>
              (item.productId && String(p.id || p.productId) === String(item.productId)) ||
              (item.productCode && (p.pcode === item.productCode || p.productCode === item.productCode))
          );
          if (matched) {
            const liveStock = Number(matched.quantity ?? matched.stock ?? 0);
            if (item.stock !== liveStock) {
              return { ...item, stock: liveStock };
            }
          }
          return item;
        })
      );
    }
  }, [allProducts]);

  // Filtered Products for Search Dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return allProducts.slice(0, 8);
    const q = productSearchQuery.toLowerCase().trim();
    return allProducts
      .filter((p) => {
        const name = (p.name || p.productName || "").toLowerCase();
        const code = (p.pcode || p.productCode || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 10);
  }, [allProducts, productSearchQuery]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customerList.slice(0, 10);
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
    const val = Number(discountValue) || 0;
    if (discountType === "PERCENT") {
      return (rawSubtotal * val) / 100;
    }
    return val;
  }, [rawSubtotal, discountValue, discountType]);

  const totalVat = useMemo(() => {
    const v = Number(vatPercent) || 0;
    const base = Math.max(0, rawSubtotal - totalDiscount);
    return (base * v) / 100;
  }, [rawSubtotal, totalDiscount, vatPercent]);

  const calculatedDelivery = useMemo(() => {
    return Number(deliveryCharge) || 0;
  }, [deliveryCharge]);

  const grandTotal = useMemo(() => {
    return Math.max(0, rawSubtotal - totalDiscount + totalVat + calculatedDelivery);
  }, [rawSubtotal, totalDiscount, totalVat, calculatedDelivery]);

  const numCash = Number(cashAmount) || 0;
  const numBank = Number(bankAmount) || 0;
  const numMfs = Number(mfsAmount) || 0;
  const totalPaid = numCash + numBank + numMfs;
  const dueAmount = Math.max(0, grandTotal - totalPaid);

  const changeReturnAmount = useMemo(() => {
    const given = Number(cashGiven) || 0;
    if (given > numCash) {
      return given - numCash;
    }
    return 0;
  }, [cashGiven, numCash]);

  // Handle Add Product to Line Items
  const handleAddProduct = (p: ProductItem) => {
    const pId = String(p.id ?? p.productId ?? "");
    const pCode = p.pcode || p.productCode || "";
    const pName = p.name || p.productName || "Product";
    const unit = p.unit || "pcs";
    const sellPrice = Number(p.sellPrice ?? p.sell_price ?? p.buyPrice ?? 0);
    const buyPrice = Number(p.buyPrice ?? p.buy_price ?? 0);
    const stock = Number(p.quantity ?? p.stock ?? 50);

    const existingIndex = lineItems.findIndex(
      (item) =>
        (pId && String(item.productId) === pId) ||
        (pCode && item.productCode.toLowerCase() === pCode.toLowerCase())
    );

    if (existingIndex > -1) {
      const updated = [...lineItems];
      const curQty = Number(updated[existingIndex].quantity) || 1;
      const newQty = curQty + 1;
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

    setProductSearchQuery("");
    setIsProductDropdownOpen(false);
  };

  // Barcode Scanning Handler
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = barcodeInput.trim().toLowerCase();
      if (!code) return;

      const found = allProducts.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === code) ||
          (p.pcode && p.pcode.toLowerCase() === code) ||
          (p.productCode && p.productCode.toLowerCase() === code)
      );

      if (found) {
        handleAddProduct(found);
        setBarcodeInput("");
      } else {
        showErrorToast(`Product with barcode "${barcodeInput}" not found`);
      }
    }
  };

  const handleUpdateLineItem = (index: number, field: keyof FormLineItem, val: string) => {
    const updated = [...lineItems];
    const target = { ...updated[index], [field]: val };

    const q = Number(field === "quantity" ? val : target.quantity) || 0;
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

  // Quick Payment buttons
  const handlePayFullCash = () => {
    setCashAmount(String(grandTotal));
    setBankAmount("");
    setMfsAmount("");
  };

  const handlePayFullBank = () => {
    setBankAmount(String(grandTotal));
    setCashAmount("");
    setMfsAmount("");
    if (!selectedBankId && registeredBankAccounts.length > 0) {
      const first = registeredBankAccounts[0];
      setSelectedBankId(String(first.id || first.bankId));
      setBankName(first.bankName || first.name);
      setAccountNo(first.accountNo || "");
    }
  };

  const handlePayFullMfs = () => {
    setMfsAmount(String(grandTotal));
    setCashAmount("");
    setBankAmount("");
    if (!selectedMfsId && registeredMfsAccounts.length > 0) {
      const first = registeredMfsAccounts[0];
      setSelectedMfsId(String(first.id || first.mfsId));
      setMfsName(first.mfsName || first.name || "bKash");
      setMfsPhone(first.mfsPhone || first.phone || "");
    }
  };

  const handlePayFullCredit = () => {
    setCashAmount("");
    setBankAmount("");
    setMfsAmount("");
    setCashGiven("");
  };

  const handleSelectBank = (id: string) => {
    setSelectedBankId(id);
    const found = registeredBankAccounts.find((b) => String(b.id || b.bankId) === String(id));
    if (found) {
      setBankName(found.bankName || found.name || "");
      setAccountNo(found.accountNo || "");
      setBankRef(found.bankAccountName || "");
    }
  };

  const handleSelectMfs = (id: string) => {
    setSelectedMfsId(id);
    const found = registeredMfsAccounts.find((m) => String(m.id || m.mfsId) === String(id));
    if (found) {
      setMfsName(found.mfsName || found.name || "bKash");
      setMfsPhone(found.mfsPhone || found.phone || "");
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
      const insertUrl = apiConfig.sales?.insertSalesUrl || "insert-sales";
      const updateUrl = apiConfig.sales?.updateSalesUrl || "update-sales";
      const targetUrl = isEditMode ? updateUrl : insertUrl;

      const paymentType = totalPaid > 0 ? "CASH" : "CREDIT";
      const paymentStatus = dueAmount <= 0 ? "Paid" : totalPaid > 0 ? "PARTIAL" : "Pending";

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
          buyPrice: Number(item.buyPrice || 0),
          discount: d,
          vat: v,
          total: Number(item.total),
          delivery_charge: 0,
          status: "SUCCESS",
          addedBy: accessUser.phone || "",
        };
      });

      const payload: any = {
        accessUser,
        orgId: accessUser.orgId,
        branchId: accessUser.branchId,
        invoiceNo: invoiceNo.trim() || makeInvoiceNo("INV"),
        invoice_no: invoiceNo.trim() || makeInvoiceNo("INV"),
        salesDate,
        date: salesDate,
        customerId: String(selectedCustomer.id || selectedCustomer.partyId || "1"),
        customerName: selectedCustomer.name || selectedCustomer.partyName || "Walk-in Customer",
        customerPhone: selectedCustomer.phone || selectedCustomer.partyPhone || "",
        customerAddress: selectedCustomer.address || selectedCustomer.partyAddress || "",
        totalAmount: rawSubtotal,
        discount: totalDiscount,
        discountType,
        vat: totalVat,
        delivery_charge: calculatedDelivery,
        deliveryCharge: calculatedDelivery,
        grandTotal,
        paidAmount: totalPaid,
        dueAmount,
        paymentType,
        status: paymentStatus,
        osType: "WEB",
        note: notes.trim() || null,
        remarks: notes.trim() || null,
        attachments: attachment || null,
        poNumber: poNumber.trim() || null,
        cashReceived: numCash,
        cardReceived: numBank,
        mfsReceived: numMfs,
        bankId: numBank > 0 ? selectedBankId : null,
        bankName: numBank > 0 ? bankName : null,
        accountNo: numBank > 0 ? accountNo : null,
        bankAccountName: numBank > 0 ? bankRef : null,
        mfsId: numMfs > 0 ? selectedMfsId : null,
        mfsName: numMfs > 0 ? mfsName : null,
        mfsMethod: numMfs > 0 ? mfsName : null,
        mfsPhone: numMfs > 0 ? mfsPhone : null,
        customerPaid: Number(cashGiven) || totalPaid,
        returnAmount: changeReturnAmount,
        salesDetails,
        details: salesDetails,
        itemCount: lineItems.length,
        totalItems: lineItems.length,
        totalQty: lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
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
        invalidateQueryKey: [salesListQueryKey, productListQueryKey],
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
    setVatPercent("");
    setDeliveryCharge("");
    setNotes("");
    setPoNumber("");
    setAttachment(null);
    setCashAmount("");
    setBankAmount("");
    setMfsAmount("");
    setCashGiven("");
    const bCode = getBusinessCode() || getUserInfo()?.businessCode || "1001";
    setInvoiceNo(makeInvoiceNo(bCode));
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
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-black flex items-center gap-1.5 shrink-0">
              <FaCalculator className="text-[var(--color-primary)] shrink-0" size={18} />
              <span className="truncate">{isEditMode ? "Edit Sales Invoice" : "Create New Sale"}</span>
            </h1>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold w-fit">
              {invoiceNo || "INV"}
            </span>
          </div>

          {/* Quick Reset & Cancel for Mobile */}
          <div className="flex lg:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/sales")}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
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
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/sales")}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Save & Save & Print Buttons */}
          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
            <Button
              label={isSubmitting ? "Saving..." : isEditMode ? "Update Sale" : "Save Sale"}
              onClick={() => handlePreSubmit(false)}
              color="#009fe3"
              hoverColor="#0085be"
              disabled={isSubmitting}
              icon={<FaCheck className="text-white text-xs" />}
              buttonClass="!text-xs !py-1.5 !w-full lg:!w-fit justify-center font-bold"
            />
            <Button
              label="Save & Print"
              onClick={() => handlePreSubmit(true)}
              color="#059669"
              hoverColor="#047857"
              disabled={isSubmitting}
              icon={<FaPrint className="text-white text-xs" />}
              buttonClass="!text-xs !py-1.5 !w-full lg:!w-fit justify-center font-bold"
            />
          </div>
        </div>
      </div>

      {/* Grid: Customer & Meta Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* Customer Selector */}
        <div className="relative" ref={customerRef}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-black uppercase tracking-wider">
              Customer <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsPartyModalOpen(true)}
              className="text-[11px] font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FaUserPlus size={10} /> + New
            </button>
          </div>

          <div
            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
            className="flex items-center justify-between h-9 px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white cursor-pointer text-xs"
          >
            {selectedCustomer ? (
              <div className="flex items-center gap-1.5 min-w-0 truncate">
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
              </div>
            ) : (
              <span className="text-gray-400">Select or search customer...</span>
            )}
            <FiChevronDown className="text-gray-500 text-xs ml-1 shrink-0" size={14} />
          </div>

          {/* Customer Dropdown Panel */}
          {isCustomerDropdownOpen && (
            <div className="absolute left-0 right-0 sm:right-auto sm:w-96 max-w-[calc(100vw-32px)] mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-30">
              <div className="relative mb-2">
                <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search customer name, phone, address..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[var(--color-primary)] text-black"
                  autoFocus
                />
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
            </div>
          )}
        </div>

        {/* Invoice No */}
        <div>
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
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
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
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
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
            PO / Ref Number
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
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
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
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#0F365C] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-gray-50/40 focus:bg-white font-medium text-black placeholder:text-gray-400 placeholder:text-xs h-9 transition-all"
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
              className="px-3 sm:px-3.5 h-9 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer bg-[#0F365C] hover:bg-[#0a2540] text-white"
            >
              <FaPlus size={10} className="text-white" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Product Dropdown */}
        {isProductDropdownOpen && (
          <div className="absolute left-2.5 right-2.5 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-20 divide-y divide-gray-100">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const prodKey = String(p.id ?? p.productId ?? p.pcode ?? p.productCode ?? "");
                const isAlreadyInList = lineItems.some(
                  (i) => (p.id && String(i.productId) === String(p.id)) || (p.productCode && i.productCode === p.productCode)
                );
                const defaultSellPrice = Number(p.sellPrice ?? p.sell_price ?? p.buyPrice ?? 0);
                const stock = Number(p.stock ?? p.quantity ?? 50);

                return (
                  <div
                    key={prodKey}
                    onClick={() => handleAddProduct(p)}
                    className={`p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors select-none cursor-pointer ${
                      isAlreadyInList
                        ? "bg-sky-50/70 hover:bg-sky-100/70 border-l-4 border-l-[var(--color-primary)]"
                        : "hover:bg-gray-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                          isAlreadyInList
                            ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                            : "border-gray-300 bg-white hover:border-[var(--color-primary)]"
                        }`}
                      >
                        {isAlreadyInList && <FaCheck size={9} />}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-bold truncate ${
                              isAlreadyInList ? "text-[var(--color-primary)]" : "text-black"
                            }`}
                          >
                            {p.name || p.productName}
                          </span>
                          {isAlreadyInList && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-semibold whitespace-nowrap">
                              In cart
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500">
                          Code: <span className="text-black font-medium">{p.pcode || p.productCode || "N/A"}</span> | Unit: <span className="text-black font-medium">{p.unit || "pcs"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        Stock: <span className="font-semibold text-black">{stock}</span>
                      </span>
                      <span className="font-bold text-black text-right min-w-[70px]">
                        ৳ {formatMoney(defaultSellPrice)}
                      </span>
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
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
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
                          min="1"
                          value={item.quantity}
                          placeholder="1"
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

            {/* Overall Invoice Discount */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-black font-semibold">Overall Discount:</label>
                <div className="inline-flex rounded border border-gray-300 overflow-hidden text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDiscountType("FLAT")}
                    className={`px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                      discountType === "FLAT"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-gray-100 text-black hover:bg-gray-200"
                    }`}
                  >
                    ৳ Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("PERCENT")}
                    className={`px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                      discountType === "PERCENT"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-gray-100 text-black hover:bg-gray-200"
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
              <div className="relative w-32 sm:w-36">
                <input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-right text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Invoice VAT % */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-black font-semibold">Invoice VAT (%):</label>
              <div className="relative w-32 sm:w-36">
                <input
                  type="number"
                  step="0.01"
                  value={vatPercent}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setVatPercent(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-right text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
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

          {/* Attachment & Notes */}
          <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-col sm:flex-row items-start gap-3">
            <div className="shrink-0 flex flex-col">
              <div className="h-6 flex items-center mb-1.5">
                <span className="text-[11px] font-semibold text-black">
                  Attachment
                </span>
              </div>
              <div className="h-[84px] flex items-center">
                <ImageUpload
                  value={attachment}
                  onChange={(file) => setAttachment(file)}
                />
              </div>
            </div>

            <div className="relative flex-1 min-w-0 w-full flex flex-col" ref={notesDropdownRef}>
              <div className="h-6 flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-semibold text-black truncate">
                  Notes / Remarks
                </span>
                <button
                  type="button"
                  onClick={() => setIsNotesDropdownOpen(!isNotesDropdownOpen)}
                  className="text-[11px] font-semibold text-black bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md border border-gray-300 transition-all flex items-center gap-1 cursor-pointer shadow-2xs h-6"
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
                  className="w-full h-[84px] p-2.5 text-xs border border-gray-300/80 rounded-xl focus:outline-none focus:border-[#0F365C] focus:ring-2 focus:ring-[#0F365C]/15 resize-none text-black font-medium bg-slate-50/40 hover:bg-white focus:bg-white placeholder:text-gray-400 transition-all shadow-2xs leading-relaxed"
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
        </div>

        {/* Right Column: Financial Totals & Split Payments */}
        <div className="lg:col-span-7 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
          {/* Detailed Financial Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-50/90 py-1.5 px-2.5 rounded-lg border border-gray-200/90 shadow-2xs">
            <div>
              <span className="text-[10px] text-black uppercase font-bold block tracking-wider leading-tight">Subtotal</span>
              <span className="text-xs font-bold text-black block text-right leading-tight mt-0.5">
                ৳ {formatMoney(rawSubtotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black uppercase font-bold block tracking-wider leading-tight">Discount</span>
              <span className="text-xs font-bold text-rose-600 block text-right leading-tight mt-0.5">
                - ৳ {formatMoney(totalDiscount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black uppercase font-bold block tracking-wider leading-tight">VAT + Delivery</span>
              <span className="text-xs font-bold text-black block text-right leading-tight mt-0.5">
                + ৳ {formatMoney(totalVat + calculatedDelivery)}
              </span>
            </div>
            <div className="bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded text-right flex flex-col justify-center">
              <span className="text-[10px] text-black uppercase font-bold block tracking-wider leading-tight">Grand Total</span>
              <span className="text-xs sm:text-[13px] font-extrabold text-[var(--color-primary)] block leading-tight mt-0.5">
                ৳ {formatMoney(grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Collected Section */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
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
                  onChange={(e) => setCashAmount(e.target.value)}
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
                  className="text-[var(--color-primary)] hover:underline cursor-pointer font-bold"
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
                    <option key={b.id || b.bankId} value={b.id || b.bankId} className="text-black">
                      {b.bankName || b.name}
                      {b.accountNo ? ` – ${b.accountNo}` : ""}
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
                  onChange={(e) => setBankAmount(e.target.value)}
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
                  {registeredMfsAccounts.map((m) => (
                    <option key={m.id || m.mfsId} value={m.id || m.mfsId} className="text-black">
                      {m.mfsName || m.name} ({m.mfsPhone || m.phone || "Personal"})
                    </option>
                  ))}
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
                  onChange={(e) => setMfsAmount(e.target.value)}
                  className="w-full text-right px-1.5 text-xs font-bold text-black outline-none bg-transparent placeholder:text-gray-400 h-full"
                />
              </div>
            </div>
          </div>

          {/* Paid vs Due Summary Ribbon */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-bold uppercase block">Paid Total</span>
              <span className="text-sm font-extrabold text-emerald-900 block mt-0.5">
                ৳ {formatMoney(totalPaid)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200">
              <span className="text-[10px] text-rose-800 font-bold uppercase block">Due / Balance</span>
              <span className="text-sm font-extrabold text-rose-900 block mt-0.5">
                ৳ {formatMoney(dueAmount)}
              </span>
            </div>
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
        message="Are you sure you want to remove this item from the sales list?"
        onClose={() => {
          setIsDeleteLineModalOpen(false);
          setItemIndexToDelete(null);
        }}
        onConfirm={handleConfirmDeleteLineItem}
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
