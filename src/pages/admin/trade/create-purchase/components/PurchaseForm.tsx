import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  FaTrash,
  FaSearch,
  FaBarcode,
  FaUserPlus,
  FaSlidersH,
  FaCheck,
  FaPrint,
  FaCalculator,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
  FaUniversity,
  FaWallet,
} from "react-icons/fa";
import Button from "@/components/button/Button";
import PartyModal from "@/pages/admin/people/parties/components/PartyModal";
import ChallanSettingsModal from "@/pages/admin/trade/purchases/components/ChallanSettingsModal";
import PurchaseInvoiceModal from "@/pages/admin/trade/purchases/components/PurchaseInvoiceModal";
import apiConfig from "@/config/api.json";
import {
  purchaseListQueryKey,
  productListQueryKey,
  partyListQueryKey,
  purchaseChallanSettingsQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
} from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { PurchaseItem, PurchaseDetailItem, ProductItem, PartyItem, PurchaseChallanSettings } from "@/types";

interface FormLineItem {
  productId: string | number;
  productCode: string;
  productName: string;
  unit: string;
  buyPrice: string; // string so empty string doesn't force 0
  quantity: string;
  vat: string;
  total: number;
  stock?: number | string;
}

const defaultChallanSettings: PurchaseChallanSettings = {
  showChallanNo: true,
  showVehicleNo: true,
  showDriverName: true,
  showDriverPhone: true,
  showTransportCost: true,
  showDeliveryDate: true,
  showNotes: true,
  showPoNumber: true,
};

const CreatePurchaseForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const queryClient = useQueryClient();

  const stateEditData: PurchaseItem | undefined = (location.state as any)?.editData;
  const isEditMode = Boolean(routeId || stateEditData);

  // Form Basic Info
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [poNumber, setPoNumber] = useState<string>("");

  // Supplier
  const [selectedSupplier, setSelectedSupplier] = useState<PartyItem | null>(null);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState<boolean>(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  // Challan & Logistics Info
  const [challanNo, setChallanNo] = useState<string>("");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [driverPhone, setDriverPhone] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [transportCost, setTransportCost] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Product Selection & Line Items
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // Invoice-level Financials
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>("");
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [invoiceVat, setInvoiceVat] = useState<string>("");

  // Multi-Payment Breakdown (Split Payment)
  const [cashAmount, setCashAmount] = useState<string>("");
  const [bankAmount, setBankAmount] = useState<string>("");
  const [mfsAmount, setMfsAmount] = useState<string>("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [showCashGivenCalc, setShowCashGivenCalc] = useState<boolean>(false);

  // Bank details
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountNo, setAccountNo] = useState<string>("");
  const [bankRef, setBankRef] = useState<string>("");

  // MFS details
  const [selectedMfsId, setSelectedMfsId] = useState<string>("");
  const [mfsName, setMfsName] = useState<string>("bKash");
  const [mfsPhone, setMfsPhone] = useState<string>("");
  const [mfsTrxId, setMfsTrxId] = useState<string>("");

  // Modals & Settings
  const [isChallanSettingsOpen, setIsChallanSettingsOpen] = useState<boolean>(false);
  const [challanSettings, setChallanSettings] = useState<PurchaseChallanSettings>(defaultChallanSettings);
  const [savedPurchaseForPrint, setSavedPurchaseForPrint] = useState<PurchaseItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch Existing Purchases to determine the next sequential invoice number
  const purchaseListUrl = apiConfig.purchase?.purchaseListUrl || "get-purchase-list";
  const { data: rawPurchaseData } = useQuery({
    queryKey: [purchaseListQueryKey],
    queryFn: async () => {
      try {
        const res = await postData<any>({
          url: purchaseListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Calculate Next Sequential Invoice Number based on last value in database
  const nextInvoiceNumber = useMemo(() => {
    if (!rawPurchaseData) return "PUR-0001";
    let list: any[] = [];
    if (Array.isArray(rawPurchaseData)) {
      list = rawPurchaseData;
    } else if (rawPurchaseData && typeof rawPurchaseData === "object") {
      const raw = rawPurchaseData as any;
      if (Array.isArray(raw.purchaseList)) list = raw.purchaseList;
      else if (Array.isArray(raw.purchasesList)) list = raw.purchasesList;
      else if (Array.isArray(raw.purchaseListDetails)) list = raw.purchaseListDetails;
      else if (Array.isArray(raw.purchaseInfoList)) list = raw.purchaseInfoList;
      else if (Array.isArray(raw.data)) list = raw.data;
      else if (raw.data && typeof raw.data === "object") {
        if (Array.isArray(raw.data.purchaseList)) list = raw.data.purchaseList;
        else if (Array.isArray(raw.data.purchasesList)) list = raw.data.purchasesList;
        else if (Array.isArray(raw.data.data)) list = raw.data.data;
      }
    }

    const validList = list.filter((p: any) => {
      if (!p || typeof p !== "object") return false;
      const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
      return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
    });

    if (validList.length === 0) {
      return "PUR-0001";
    }

    let maxSeq = 0;
    for (const p of validList) {
      // 1. Check numeric database auto-increment ID
      const rawId = p.id ?? p.purchaseId ?? p.purchase_id ?? p.purId;
      if (typeof rawId === "number" && rawId > maxSeq && rawId < 1000000) {
        maxSeq = Math.max(maxSeq, rawId);
      } else if (typeof rawId === "string" && /^\d+$/.test(rawId.trim())) {
        const n = Number(rawId.trim());
        if (n > maxSeq && n < 1000000) maxSeq = Math.max(maxSeq, n);
      }

      // 2. Check invoice number (e.g., PUR-0001, PUR-12, INV-05, PUR-2026-001)
      const inv = String(p.invoiceNo || p.invoice_no || p.billNo || "").trim();
      const match = inv.match(/0*(\d{1,6})$/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq && num < 1000000) {
          maxSeq = Math.max(maxSeq, num);
        }
      }
    }

    const nextNum = maxSeq > 0 ? maxSeq + 1 : validList.length + 1;
    const padded = String(nextNum).padStart(4, "0");
    return `PUR-${padded}`;
  }, [rawPurchaseData]);

  // Set invoice number on load as soon as database purchases are fetched
  useEffect(() => {
    if (!isEditMode && nextInvoiceNumber) {
      // Only set if invoiceNo is empty or was using default placeholder
      if (!invoiceNo || invoiceNo === "PUR-0001") {
        setInvoiceNo(nextInvoiceNumber);
      }
    }
  }, [isEditMode, nextInvoiceNumber]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Products via POST /get-product-list
  const productListUrl = apiConfig.productList?.productListUrl || "get-product-list";
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
      if (Array.isArray(raw.productsList)) list = raw.productsList;
      else if (Array.isArray(raw.productList)) list = raw.productList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }

    return list.filter((p: any) => {
      const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
      return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
    });
  }, [rawProductData]);

  // Fetch Suppliers via POST /get-party-info-list
  const partyListUrl = apiConfig.party?.partyListUrl || "get-party-info-list";
  const { data: rawPartyData } = useQuery({
    queryKey: [partyListQueryKey],
    queryFn: async () => {
      try {
        const res = await postData<any>({
          url: partyListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const suppliersList: PartyItem[] = useMemo(() => {
    if (!rawPartyData) return [];
    let list: any[] = [];
    if (Array.isArray(rawPartyData)) list = rawPartyData;
    else if (rawPartyData && typeof rawPartyData === "object") {
      const raw = rawPartyData as any;
      if (Array.isArray(raw.partyList)) list = raw.partyList;
      else if (Array.isArray(raw.supplierList)) list = raw.supplierList;
      else if (Array.isArray(raw.partyInfoList)) list = raw.partyInfoList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }

    return list.filter((p: any) => {
      const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
      if (isDel === "Y" || isDel === "YES" || isDel === "TRUE" || isDel === "1") return false;
      const type = (p.type || p.partyType || p.party_type || "").toUpperCase();
      return type.includes("SUPPLIER") || !type;
    });
  }, [rawPartyData]);

  // Fetch Registered Bank Accounts via POST /get-bank-info-list
  const bankInfoListUrl = apiConfig.bank?.bankInfoListUrl || "get-bank-info-list";
  const { data: rawBankData } = useQuery({
    queryKey: [bankInfoListQueryKey],
    queryFn: async () => {
      try {
        const res = await postData<any>({
          url: bankInfoListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const registeredBankAccounts: any[] = useMemo(() => {
    if (!rawBankData) return [];
    if (Array.isArray(rawBankData)) return rawBankData;
    const raw = rawBankData as any;
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
  }, [rawBankData]);

  // Fetch Registered MFS Accounts via POST /mfs-user-list
  const mfsUserListUrl = apiConfig.mfs?.mfsUserListUrl || "mfs-user-list";
  const { data: rawMfsData } = useQuery({
    queryKey: [mfsUserListQueryKey],
    queryFn: async () => {
      try {
        const res = await postData<any>({
          url: mfsUserListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const registeredMfsAccounts: any[] = useMemo(() => {
    if (!rawMfsData) return [];
    if (Array.isArray(rawMfsData)) return rawMfsData;
    const raw = rawMfsData as any;
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
  }, [rawMfsData]);

  // Fetch Challan Settings
  const challanSettingsUrl = apiConfig.purchase?.purchaseChallanSettingsUrl || "get-purchase-challan-settings";
  const { data: rawChallanSettings } = useQuery({
    queryKey: [purchaseChallanSettingsQueryKey],
    queryFn: async () => {
      try {
        const res = await postData<any>({
          url: challanSettingsUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (rawChallanSettings) {
      const data = (rawChallanSettings as any)?.data || (rawChallanSettings as any)?.settings || rawChallanSettings;
      if (typeof data === "object" && data !== null) {
        setChallanSettings({
          showChallanNo: data.showChallanNo ?? data.show_challan_no ?? true,
          showVehicleNo: data.showVehicleNo ?? data.show_vehicle_no ?? true,
          showDriverName: data.showDriverName ?? data.show_driver_name ?? true,
          showDriverPhone: data.showDriverPhone ?? data.show_driver_phone ?? true,
          showTransportCost: data.showTransportCost ?? data.show_transport_cost ?? true,
          showDeliveryDate: data.showDeliveryDate ?? data.show_delivery_date ?? true,
          showNotes: data.showNotes ?? data.show_notes ?? true,
          showPoNumber: data.showPoNumber ?? data.show_po_number ?? true,
        });
      }
    }
  }, [rawChallanSettings]);

  // Prefill in Edit Mode
  useEffect(() => {
    if (stateEditData) {
      setInvoiceNo(stateEditData.invoiceNo || "");
      setPurchaseDate(stateEditData.purchaseDate || new Date().toISOString().substring(0, 10));
      setChallanNo(stateEditData.challanNo || "");
      setVehicleNo(stateEditData.vehicleNo || "");
      setDriverName(stateEditData.driverName || "");
      setDriverPhone(stateEditData.driverPhone || "");
      setDeliveryDate(stateEditData.deliveryDate || stateEditData.delivery_date || "");
      setTransportCost(stateEditData.transportCost || stateEditData.delivery_charge ? String(stateEditData.transportCost || stateEditData.delivery_charge) : "");
      setNotes(stateEditData.note || "");
      setInvoiceDiscount(stateEditData.discount ? String(stateEditData.discount) : "");
      setInvoiceDiscountType(stateEditData.discountType === "PERCENT" ? "PERCENT" : "FLAT");
      setInvoiceVat(stateEditData.vat ? String(stateEditData.vat) : "");

      // Split payments
      setCashAmount(stateEditData.cashReceived ? String(stateEditData.cashReceived) : "");
      setBankAmount(stateEditData.cardReceived ? String(stateEditData.cardReceived) : "");
      setMfsAmount(stateEditData.mfsReceived ? String(stateEditData.mfsReceived) : "");
      setBankName(stateEditData.bankName || "");
      setAccountNo(stateEditData.accountNo || "");
      setBankRef(stateEditData.bankAccountName || "");
      setMfsName(stateEditData.mfsName || "bKash");
      setMfsPhone(stateEditData.mfsPhone || "");

      if (stateEditData.supplierId || stateEditData.supplierName) {
        const found = suppliersList.find(
          (s) =>
            (stateEditData.supplierId && (s.id === stateEditData.supplierId || s.partyId === stateEditData.supplierId)) ||
            (stateEditData.supplierName && (s.name === stateEditData.supplierName || s.partyName === stateEditData.supplierName))
        );
        if (found) {
          setSelectedSupplier(found);
        } else {
          setSelectedSupplier({
            id: stateEditData.supplierId,
            name: stateEditData.supplierName,
            phone: stateEditData.supplierPhone,
            address: stateEditData.supplierAddress,
          });
        }
      }

      if (Array.isArray(stateEditData.purchaseDetails)) {
        const loadedItems: FormLineItem[] = stateEditData.purchaseDetails.map((item) => ({
          productId: item.productId,
          productCode: item.productCode || item.pcode || "",
          productName: item.productName || "Product",
          unit: item.unit || "pcs",
          buyPrice: String(item.buyPrice || ""),
          quantity: String(item.quantity || "1"),
          vat: item.vat ? String(item.vat) : "",
          total: Number(item.total || Number(item.buyPrice || 0) * Number(item.quantity || 1)),
        }));
        setLineItems(loadedItems);
      }
    }
  }, [stateEditData, suppliersList]);

  // Filtered Products for Search Dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return allProducts.slice(0, 8);
    const q = productSearchQuery.toLowerCase().trim();
    return allProducts
      .filter((p) => {
        const name = (p.name || p.productName || "").toLowerCase();
        const code = (p.pcode || p.productCode || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        return name.includes(q) || code.includes(q) || barcode.includes(q) || sku.includes(q);
      })
      .slice(0, 10);
  }, [allProducts, productSearchQuery]);

  // Filtered Suppliers for Supplier Dropdown
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchQuery.trim()) return suppliersList.slice(0, 8);
    const q = supplierSearchQuery.toLowerCase().trim();
    return suppliersList.filter((s) => {
      const name = (s.name || s.partyName || "").toLowerCase();
      const phone = (s.phone || s.partyPhone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [suppliersList, supplierSearchQuery]);

  // Calculate single line item total
  const computeLineTotal = (
    priceStr: string,
    qtyStr: string,
    vatStr: string
  ) => {
    const p = Number(priceStr) || 0;
    const q = Number(qtyStr) || 0;
    const v = Number(vatStr) || 0;

    const baseAmount = p * q;
    const vatAmount = (baseAmount * v) / 100;
    return Math.round((baseAmount + vatAmount) * 100) / 100;
  };

  // Add Product to line items
  const handleAddProduct = (product: ProductItem) => {
    const prodId = product.id ?? product.productId ?? "";
    const prodCode = product.pcode || product.productCode || "";
    const prodName = product.name || product.productName || "Product";
    const prodUnit = product.unit || "pcs";
    const buyPrice = Number(product.buy_price ?? product.buyPrice ?? 0);
    const currentStock = Number(product.stock ?? product.quantity ?? 0);

    setLineItems((prev) => {
      const existingIdx = prev.findIndex((item) => String(item.productId) === String(prodId));
      if (existingIdx >= 0) {
        const updated = [...prev];
        const item = updated[existingIdx];
        const newQty = String((Number(item.quantity) || 0) + 1);
        const total = computeLineTotal(item.buyPrice, newQty, item.vat);
        updated[existingIdx] = { ...item, quantity: newQty, total };
        return updated;
      } else {
        const newLine: FormLineItem = {
          productId: prodId,
          productCode: prodCode,
          productName: prodName,
          unit: prodUnit,
          buyPrice: buyPrice > 0 ? String(buyPrice) : "",
          quantity: "1",
          vat: "",
          total: buyPrice,
          stock: currentStock,
        };
        return [...prev, newLine];
      }
    });

    setProductSearchQuery("");
    setIsProductDropdownOpen(false);
  };

  const handleUpdateLineItem = (index: number, field: keyof FormLineItem, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      item.total = computeLineTotal(item.buyPrice, item.quantity, item.vat);
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Financial Calculations ---
  // 1. Raw Subtotal = sum of (buyPrice * quantity)
  const rawSubtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const p = Number(item.buyPrice) || 0;
      const q = Number(item.quantity) || 0;
      return sum + p * q;
    }, 0);
  }, [lineItems]);

  // 2. Line Items Total VAT
  const lineVatTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const p = Number(item.buyPrice) || 0;
      const q = Number(item.quantity) || 0;
      const v = Number(item.vat) || 0;
      const base = p * q;
      return sum + (base * v) / 100;
    }, 0);
  }, [lineItems]);

  // 3. Invoice-level Overall Discount
  const calculatedInvoiceDiscount = useMemo(() => {
    const rawDisc = Number(invoiceDiscount) || 0;
    if (invoiceDiscountType === "PERCENT") {
      return (rawSubtotal * rawDisc) / 100;
    }
    return rawDisc;
  }, [rawSubtotal, invoiceDiscount, invoiceDiscountType]);

  // 4. Total Discount combined
  const totalDiscount = useMemo(() => {
    return calculatedInvoiceDiscount;
  }, [calculatedInvoiceDiscount]);

  // 6. Invoice-level VAT
  const calculatedInvoiceVat = useMemo(() => {
    const rawVat = Number(invoiceVat) || 0;
    const taxableBase = Math.max(0, rawSubtotal - totalDiscount);
    return (taxableBase * rawVat) / 100;
  }, [rawSubtotal, totalDiscount, invoiceVat]);

  // 7. Total VAT combined
  const totalVat = useMemo(() => {
    return lineVatTotal + calculatedInvoiceVat;
  }, [lineVatTotal, calculatedInvoiceVat]);

  // 8. Transport / Freight
  const calculatedTransport = useMemo(() => {
    return Number(transportCost) || 0;
  }, [transportCost]);

  // 9. Grand Total
  const grandTotal = useMemo(() => {
    const total = rawSubtotal - totalDiscount + totalVat + calculatedTransport;
    return Math.max(0, Math.round(total * 100) / 100);
  }, [rawSubtotal, totalDiscount, totalVat, calculatedTransport]);

  // 10. Multi-Payment totals
  const numCash = Number(cashAmount) || 0;
  const numBank = Number(bankAmount) || 0;
  const numMfs = Number(mfsAmount) || 0;
  const totalPaid = useMemo(() => {
    return numCash + numBank + numMfs;
  }, [numCash, numBank, numMfs]);

  const dueAmount = useMemo(() => {
    return Math.max(0, grandTotal - totalPaid);
  }, [grandTotal, totalPaid]);

  const changeReturnAmount = useMemo(() => {
    const given = Number(cashGiven) || 0;
    if (given > numCash) {
      return given - numCash;
    }
    return 0;
  }, [cashGiven, numCash]);

  const formatMoney = (amount: number | string | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Quick Payment presets
  const handlePayFullCash = () => {
    setCashAmount(String(grandTotal));
    setBankAmount("");
    setMfsAmount("");
  };

  const handlePayFullBank = () => {
    setBankAmount(String(grandTotal));
    setCashAmount("");
    setMfsAmount("");
  };

  const handlePayFullMfs = () => {
    setMfsAmount(String(grandTotal));
    setCashAmount("");
    setBankAmount("");
  };

  const handlePayFullCredit = () => {
    setCashAmount("");
    setBankAmount("");
    setMfsAmount("");
  };

  // When selecting a registered bank
  const handleSelectRegisteredBank = (bankId: string) => {
    setSelectedBankId(bankId);
    const found = registeredBankAccounts.find(
      (b) => String(b.id || b.bankId || b._id) === String(bankId)
    );
    if (found) {
      setBankName(found.bankName || found.name || "");
      setAccountNo(found.accountNo || found.bankAccountNumber || found.bankAccountNo || "");
      setBankRef(found.accountName || found.branchName || "");
    } else {
      setBankName("");
      setAccountNo("");
      setBankRef("");
    }
  };

  // When selecting a registered MFS
  const handleSelectRegisteredMfs = (mfsId: string) => {
    setSelectedMfsId(mfsId);
    const found = registeredMfsAccounts.find(
      (m) => String(m.id || m.mfsId || m._id) === String(mfsId)
    );
    if (found) {
      setMfsName(found.mfsName || found.name || found.method || "bKash");
      setMfsPhone(found.mobileNo || found.phone || found.accountNo || "");
    } else {
      setMfsName("bKash");
      setMfsPhone("");
    }
  };

  // Submit Purchase
  const handleSubmit = async (shouldPrint = false) => {
    if (!selectedSupplier) {
      showErrorToast("Please select a supplier for this purchase");
      return;
    }
    if (lineItems.length === 0) {
      showErrorToast("Please add at least one product to the purchase");
      return;
    }

    // Validate line items
    for (const item of lineItems) {
      if (!item.buyPrice || Number(item.buyPrice) <= 0) {
        showErrorToast(`Please enter a valid buy price for "${item.productName}"`);
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        showErrorToast(`Please enter a valid quantity for "${item.productName}"`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const accessUser = buildAccessUser();
      const insertUrl = apiConfig.purchase?.insertPurchasesUrl || "insert-purchases";
      const updateUrl = apiConfig.purchase?.updatePurchasesUrl || "update-purchases";
      const targetUrl = isEditMode ? updateUrl : insertUrl;

      // Backend expects "CASH" (when any payment is made) or "CREDIT" (when 100% due)
      const paymentType = totalPaid > 0 ? "CASH" : "CREDIT";
      const paymentStatus = dueAmount <= 0 ? "Paid" : totalPaid > 0 ? "PARTIAL" : "Pending";

      const purchaseDetailsPayload: PurchaseDetailItem[] = lineItems.map((item) => {
        const p = Number(item.buyPrice) || 0;
        const q = Number(item.quantity) || 0;
        const v = Number(item.vat) || 0;
        const base = p * q;
        const lineVat = (base * v) / 100;

        return {
          productId: item.productId,
          productCode: item.productCode,
          pcode: item.productCode,
          productName: item.productName,
          unit: item.unit || "pcs",
          quantity: q,
          buyPrice: p,
          discount: 0,
          vat: lineVat,
          delivery_charge: 0,
          total: Number(item.total),
          status: "PENDING",
          advenType: "PURCHASE",
        };
      });

      const purchasePayload: any = {
        accessUser,
        orgId: accessUser.orgId,
        branchId: accessUser.branchId,
        invoiceNo: invoiceNo.trim(),
        purchaseDate,
        salesDate: purchaseDate, // backward compatibility with sales schema
        date: purchaseDate,
        supplierId: selectedSupplier.id ?? selectedSupplier.partyId ?? "",
        customerId: selectedSupplier.id ?? selectedSupplier.partyId ?? "",
        supplierName: selectedSupplier.name || selectedSupplier.partyName || "",
        customerName: selectedSupplier.name || selectedSupplier.partyName || "",
        supplierPhone: selectedSupplier.phone || selectedSupplier.partyPhone || "",
        customerPhone: selectedSupplier.phone || selectedSupplier.partyPhone || "",
        supplierAddress: selectedSupplier.address || selectedSupplier.partyAddress || "",
        customerAddress: selectedSupplier.address || selectedSupplier.partyAddress || "",
        challanNo: challanNo.trim(),
        vehicleNo: vehicleNo.trim(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        deliveryDate: deliveryDate || purchaseDate,
        transportCost: calculatedTransport,
        delivery_charge: calculatedTransport,
        totalAmount: rawSubtotal,
        discount: totalDiscount,
        discountType: invoiceDiscountType,
        vat: totalVat,
        grandTotal,
        paidAmount: totalPaid,
        dueAmount,
        paymentType,
        status: paymentStatus,
        osType: "WEB",
        note: notes.trim(),
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        createdAtTime: new Date().toISOString(),
        cashReceived: numCash,
        cardReceived: numBank,
        mfsReceived: numMfs,
        bankId: numBank > 0 ? (selectedBankId || bankName) : null,
        bankName: numBank > 0 ? bankName : null,
        accountNo: numBank > 0 ? accountNo : null,
        bankAccountName: numBank > 0 ? bankRef : null,
        mfsId: numMfs > 0 ? (selectedMfsId || mfsName) : null,
        mfsName: numMfs > 0 ? mfsName : null,
        mfsMethod: numMfs > 0 ? mfsName : null,
        mfsPhone: numMfs > 0 ? mfsPhone : null,
        customerPaid: Number(cashGiven) || totalPaid,
        returnAmount: changeReturnAmount,
        purchaseDetails: purchaseDetailsPayload,
      };

      if (isEditMode && (stateEditData?.id || stateEditData?.purchaseId || routeId)) {
        purchasePayload.id = stateEditData?.id || stateEditData?.purchaseId || routeId;
        purchasePayload.purchaseId = stateEditData?.id || stateEditData?.purchaseId || routeId;
      }

      console.log("Submitting purchase payload to backend:", purchasePayload);

      const res = await postData<any>({
        url: targetUrl,
        body: purchasePayload,
      });

      console.log("Response from server:", res);

      if (res && (res.error || res.status === "Error")) {
        const errorMsg = res.msg || res.message || "Failed to save purchase";
        showErrorToast(errorMsg);
        setIsSubmitting(false);
        return;
      }

      showSuccessToast(isEditMode ? "Purchase updated successfully!" : "Purchase recorded successfully!");
      
      const savedItem: any = {
        ...purchasePayload,
        id: res?.id || res?.purchaseId || res?.purchase_id || invoiceNo,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData([purchaseListQueryKey], (oldData: any) => {
        if (!oldData) return { status: "Success", purchaseList: [savedItem] };
        if (Array.isArray(oldData)) {
          return [savedItem, ...oldData];
        }
        if (oldData && typeof oldData === "object") {
          const listKey = Array.isArray(oldData.purchaseList)
            ? "purchaseList"
            : Array.isArray(oldData.purchaseInfoList)
            ? "purchaseInfoList"
            : Array.isArray(oldData.purchasesList)
            ? "purchasesList"
            : Array.isArray(oldData.data)
            ? "data"
            : "purchaseList";
          const currentList = Array.isArray(oldData[listKey]) ? oldData[listKey] : [];
          return {
            ...oldData,
            [listKey]: [savedItem, ...currentList],
          };
        }
        return oldData;
      });

      queryClient.invalidateQueries({ queryKey: [purchaseListQueryKey] });

      if (shouldPrint) {
        setSavedPurchaseForPrint({
          ...purchasePayload,
          id: res?.id || invoiceNo,
        });
        setIsPrintModalOpen(true);
      } else {
        navigate("/admin/purchases");
      }
    } catch (err: any) {
      console.error("Save purchase exception:", err);
      showErrorToast(err?.message || "An error occurred while saving purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the form? All unsaved data will be cleared.")) {
      setLineItems([]);
      setSelectedSupplier(null);
      setInvoiceDiscount("");
      setInvoiceVat("");
      setTransportCost("");
      setCashAmount("");
      setBankAmount("");
      setMfsAmount("");
      setCashGiven("");
      setNotes("");
      setInvoiceNo(nextInvoiceNumber || "PUR-0001");
    }
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <FaCalculator className="text-[var(--color-primary)]" size={18} />
            {isEditMode ? "Edit Purchase Invoice" : "Create New Purchase"}
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-mono font-semibold">
            {invoiceNo || "INV"}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsChallanSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <FaSlidersH className="text-gray-500" size={12} />
            <span className="hidden sm:inline">Challan Settings</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/purchases")}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <Button
            label={isSubmitting ? "Saving..." : isEditMode ? "Update Purchase" : "Save Purchase"}
            onClick={() => handleSubmit(false)}
            color="#009fe3"
            hoverColor="#0085be"
            disabled={isSubmitting}
            icon={<FaCheck className="text-white text-xs" />}
          />
          <Button
            label="Save & Print"
            onClick={() => handleSubmit(true)}
            color="#059669"
            hoverColor="#047857"
            disabled={isSubmitting}
            icon={<FaPrint className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* Grid: Supplier & Meta Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* Supplier Selector */}
        <div className="relative" ref={supplierRef}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
              Supplier <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsPartyModalOpen(true)}
              className="text-[11px] font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FaUserPlus size={10} /> + New
            </button>
          </div>

          <div
            onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
            className="flex items-center justify-between p-2 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white cursor-pointer text-xs"
          >
            {selectedSupplier ? (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-gray-900 truncate">
                  {selectedSupplier.name || selectedSupplier.partyName}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {selectedSupplier.phone || selectedSupplier.partyPhone || "No Phone"}
                </span>
              </div>
            ) : (
              <span className="text-gray-400">Select or search supplier...</span>
            )}
            <span className="text-gray-400 text-xs">▼</span>
          </div>

          {/* Supplier Dropdown Panel */}
          {isSupplierDropdownOpen && (
            <div className="absolute left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-40">
              <div className="relative mb-2">
                <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search supplier name, phone..."
                  value={supplierSearchQuery}
                  onChange={(e) => setSupplierSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[var(--color-primary)]"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((s) => (
                    <div
                      key={s.id || s.partyId || s.name}
                      onClick={() => {
                        setSelectedSupplier(s);
                        setIsSupplierDropdownOpen(false);
                      }}
                      className="p-2 hover:bg-sky-50 cursor-pointer rounded-md transition-colors text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-gray-900 block">{s.name || s.partyName}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{s.phone || s.partyPhone}</span>
                      </div>
                      {(s.balance || s.openingBalance || s.dueAmount) && (
                        <span className="text-[10px] font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          Bal: ৳{s.balance || s.openingBalance || s.dueAmount}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-400 text-xs">No supplier found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Invoice No */}
        <div>
          <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
            Invoice No <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-mono font-medium"
            placeholder="INV-0001"
          />
        </div>

        {/* Purchase Date */}
        <div>
          <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
            Purchase Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-medium"
          />
        </div>

        {/* Optional Challan No */}
        {challanSettings.showChallanNo && (
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
              Challan Ref No
            </label>
            <input
              type="text"
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-mono"
              placeholder="e.g. CH-98234"
            />
          </div>
        )}

        {/* Optional Vehicle No */}
        {challanSettings.showVehicleNo && (
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
              Vehicle / Truck No
            </label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-mono"
              placeholder="e.g. DHAKA-METRO-11-2233"
            />
          </div>
        )}

        {/* Optional Driver Name */}
        {challanSettings.showDriverName && (
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
              Driver Name
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="e.g. Rafiq Hossain"
            />
          </div>
        )}

        {/* Optional Driver Phone */}
        {challanSettings.showDriverPhone && (
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
              Driver Phone
            </label>
            <input
              type="text"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-mono"
              placeholder="017xxxxxxxx"
            />
          </div>
        )}

        {/* Optional PO Number */}
        {challanSettings.showPoNumber && (
          <div>
            <label className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider block mb-1">
              PO 
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-mono"
              placeholder="PO-2026-001"
            />
          </div>
        )}
      </div>

      {/* Product Live Search & Add Bar */}
      <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs relative" ref={productSearchRef}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <FaBarcode className="absolute left-3 top-3 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Scan barcode or type product name / code / SKU to add item..."
              value={productSearchQuery}
              onChange={(e) => {
                setProductSearchQuery(e.target.value);
                setIsProductDropdownOpen(true);
              }}
              onFocus={() => setIsProductDropdownOpen(true)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] bg-gray-50/50 focus:bg-white"
            />
          </div>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            Press Enter / Click to add
          </span>
        </div>

        {/* Product Search Results Dropdown */}
        {isProductDropdownOpen && (
          <div className="absolute left-2.5 right-2.5 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-40 divide-y divide-gray-100">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const buyPrice = Number(p.buy_price ?? p.buyPrice ?? 0);
                const stock = Number(p.stock ?? p.quantity ?? 0);

                return (
                  <div
                    key={p.id || p.productId || p.pcode}
                    onClick={() => handleAddProduct(p)}
                    className="p-2.5 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{p.name || p.productName}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Code: {p.pcode || p.productCode || "N/A"} | Unit: {p.unit || "pcs"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        Stock: <span className="font-semibold">{stock}</span>
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-right min-w-[70px]">
                        ৳ {formatMoney(buyPrice)}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1 bg-[var(--color-primary)] text-white rounded text-[11px] font-medium cursor-pointer"
                      >
                        + Add
                      </button>
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

      {/* Dynamic Line Items Table (Dense, Right-Aligned Money Inputs, No Spinners) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-2.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Purchase Items List ({lineItems.length})
          </h2>
          <span className="text-[11px] text-gray-500 font-medium">
            Subtotal: <span className="font-mono font-bold text-gray-900">৳ {formatMoney(rawSubtotal)}</span>
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-3 min-w-[190px]">Product</th>
                <th className="py-2 px-2 text-center w-16">Unit</th>
                <th className="py-2 px-2 text-right w-28">Buy Price (৳)</th>
                <th className="py-2 px-2 text-center w-24">Quantity</th>
                <th className="py-2 px-2 text-right w-20">VAT (%)</th>
                <th className="py-2 px-3 text-right w-28">Total (৳)</th>
                <th className="py-2 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.length > 0 ? (
                lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    {/* SL */}
                    <td className="py-2 px-2 text-center text-gray-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Product Name & Code */}
                    <td className="py-2 px-3">
                      <span className="font-semibold text-gray-900 block">{item.productName}</span>
                      {item.productCode && (
                        <span className="text-[10px] text-gray-400 font-mono">Code: {item.productCode}</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2 text-center">
                      <span className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                        {item.unit || "pcs"}
                      </span>
                    </td>

                    {/* Buy Price (Right Aligned Money Input, No Wheel/Spinners) */}
                    <td className="py-2 px-2 text-right">
                      <div className="relative inline-block w-full">
                        <span className="absolute left-1.5 top-1.5 text-gray-400 text-[11px]">৳</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.buyPrice}
                          placeholder="0.00"
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => handleUpdateLineItem(idx, "buyPrice", e.target.value)}
                          className="w-full pl-5 pr-1.5 py-1 text-xs border border-gray-300 rounded text-right font-mono font-medium focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    </td>

                    {/* Quantity (Stepper) */}
                    <td className="py-2 px-2 text-center">
                      <div className="inline-flex items-center border border-gray-300 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            const q = Math.max(1, (Number(item.quantity) || 1) - 1);
                            handleUpdateLineItem(idx, "quantity", String(q));
                          }}
                          className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs cursor-pointer"
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
                          className="w-12 py-1 text-xs text-center font-mono font-semibold focus:outline-none border-x border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const q = (Number(item.quantity) || 0) + 1;
                            handleUpdateLineItem(idx, "quantity", String(q));
                          }}
                          className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Line VAT % */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.vat}
                        placeholder="0"
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => handleUpdateLineItem(idx, "vat", e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded text-right font-mono focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </td>

                    {/* Total (Right Aligned Display) */}
                    <td className="py-2 px-3 text-right font-bold text-gray-900 font-mono">
                      ৳ {formatMoney(item.total)}
                    </td>

                    {/* Delete Action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
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
                    No items in purchase. Search and add products above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary & Split Payment Breakdown (2 Column Dense Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left Column: Overall Discounts, VAT, Transport & Remarks (5 cols) */}
        <div className="lg:col-span-5 bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2.5">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Discounts & Extra Charges
          </h3>

          {/* Overall Invoice Discount */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-700 font-medium">Overall Discount:</label>
              <div className="inline-flex rounded border border-gray-300 overflow-hidden text-[10px]">
                <button
                  type="button"
                  onClick={() => setInvoiceDiscountType("FLAT")}
                  className={`px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                    invoiceDiscountType === "FLAT"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ৳ Flat
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceDiscountType("PERCENT")}
                  className={`px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                    invoiceDiscountType === "PERCENT"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  %
                </button>
              </div>
            </div>
            <div className="relative w-36">
              <input
                type="number"
                step="0.01"
                value={invoiceDiscount}
                placeholder="0"
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setInvoiceDiscount(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-right font-mono focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Invoice VAT % */}
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-gray-700 font-medium">Invoice VAT (%):</label>
            <div className="relative w-36">
              <input
                type="number"
                step="0.01"
                value={invoiceVat}
                placeholder="0"
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setInvoiceVat(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-right font-mono focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Transport / Freight Charge */}
          {challanSettings.showTransportCost && (
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-gray-700 font-medium">Transport / Freight (৳):</label>
              <div className="relative w-36">
                <span className="absolute left-2 top-1.5 text-gray-400 text-xs">৳</span>
                <input
                  type="number"
                  step="0.01"
                  value={transportCost}
                  placeholder="0.00"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setTransportCost(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 text-xs border border-gray-300 rounded text-right font-mono focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          {challanSettings.showNotes && (
            <div className="mt-1">
              <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider block mb-1">
                Purchase Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special terms, batch notes, or delivery remarks..."
                className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
            </div>
          )}
        </div>

        {/* Right Column: Financial Totals & Clean Split Payment Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between gap-2.5">
          {/* Detailed Financial Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Subtotal</span>
              <span className="text-xs font-bold font-mono text-gray-900 block text-right">
                ৳ {formatMoney(rawSubtotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Discount</span>
              <span className="text-xs font-bold font-mono text-rose-600 block text-right">
                - ৳ {formatMoney(totalDiscount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">VAT + Transport</span>
              <span className="text-xs font-bold font-mono text-gray-800 block text-right">
                + ৳ {formatMoney(totalVat + calculatedTransport)}
              </span>
            </div>
            <div className="bg-sky-100/70 p-1.5 rounded text-right">
              <span className="text-[10px] text-sky-800 uppercase font-bold block">Grand Total</span>
              <span className="text-sm font-extrabold font-mono text-[var(--color-primary)] block">
                ৳ {formatMoney(grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Collected Section (Matching cash-boi_v2) */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaWallet size={12} className="text-gray-500" />
              Payment Collected
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePayFullCash}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
              >
                All Cash
              </button>
              <button
                type="button"
                onClick={handlePayFullBank}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
              >
                All Bank
              </button>
              <button
                type="button"
                onClick={handlePayFullMfs}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
              >
                All MFS
              </button>
              <button
                type="button"
                onClick={handlePayFullCredit}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
              >
                All Due
              </button>
            </div>
          </div>

          {/* Payment Cards: Cash, Card, MFS */}
          <div className="flex flex-col gap-2.5">
            {/* 1. Cash Card */}
            <div
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                Number(cashAmount) > 0
                  ? "border-blue-400 bg-white shadow-xs"
                  : "border-gray-200 bg-gray-50/70"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100/90 text-emerald-600 flex items-center justify-center shrink-0">
                  <FaMoneyBillWave size={15} />
                </div>
                <span className="font-bold text-xs text-gray-800 tracking-wider">CASH</span>
              </div>

              <div
                className={`flex items-center h-8 rounded-lg border bg-white overflow-hidden w-32 sm:w-36 transition-colors ${
                  Number(cashAmount) > 0
                    ? "border-emerald-500 ring-1 ring-emerald-500"
                    : "border-gray-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
                }`}
              >
                <span className="text-[11px] text-gray-400 px-2.5 bg-gray-50 h-full flex items-center border-r border-gray-200 font-mono select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cashAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full text-right px-2 text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Optional Change Tendered Toggle */}
            {numCash > 0 && (
              <div className="flex items-center justify-end gap-2 text-[11px] px-1 -mt-1">
                <button
                  type="button"
                  onClick={() => setShowCashGivenCalc(!showCashGivenCalc)}
                  className="text-[var(--color-primary)] hover:underline cursor-pointer"
                >
                  {showCashGivenCalc ? "- Hide Change Calculator" : "+ Calculate Cash Change / ভাংতি"}
                </button>
              </div>
            )}

            {showCashGivenCalc && numCash > 0 && (
              <div className="flex items-center justify-between gap-2 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 -mt-1">
                <span className="text-[11px] text-gray-600 font-medium">Cash Tendered:</span>
                <div className="flex items-center gap-2">
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1 text-gray-400 text-xs font-mono">৳</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={cashGiven}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="w-full pl-5 pr-1.5 py-0.5 text-xs border border-gray-300 rounded text-right font-mono bg-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  {changeReturnAmount > 0 && (
                    <span className="text-xs text-emerald-800 font-mono font-bold">
                      Return: ৳{formatMoney(changeReturnAmount)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 2. Card / Bank Card */}
            <div
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                Number(bankAmount) > 0
                  ? "border-blue-400 bg-white shadow-xs"
                  : "border-gray-200 bg-gray-50/70"
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-sky-100/90 text-sky-600 flex items-center justify-center shrink-0">
                  <FaCreditCard size={15} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-xs text-gray-800 tracking-wider">CARD</span>
                  <select
                    value={selectedBankId}
                    onChange={(e) => handleSelectRegisteredBank(e.target.value)}
                    className="mt-1 w-full max-w-[180px] sm:max-w-[240px] px-2 py-1 text-[11px] border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:border-sky-500 cursor-pointer truncate"
                  >
                    <option value="">
                      {registeredBankAccounts.length ? "Select Bank..." : "No bank account registered"}
                    </option>
                    {registeredBankAccounts.map((b) => (
                      <option key={b.id || b.bankId || b._id} value={b.id || b.bankId || b._id}>
                        {b.bankName || b.name}
                        {b.accountNo || b.bankAccountNumber || b.bankAccountNo
                          ? ` – ${b.accountNo || b.bankAccountNumber || b.bankAccountNo}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className={`flex items-center h-8 rounded-lg border bg-white overflow-hidden w-32 sm:w-36 shrink-0 transition-colors ${
                  Number(bankAmount) > 0
                    ? "border-sky-500 ring-1 ring-sky-500"
                    : "border-gray-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500"
                }`}
              >
                <span className="text-[11px] text-gray-400 px-2.5 bg-gray-50 h-full flex items-center border-r border-gray-200 font-mono select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={bankAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setBankAmount(e.target.value)}
                  className="w-full text-right px-2 text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* 3. MFS Card */}
            <div
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                Number(mfsAmount) > 0
                  ? "border-blue-400 bg-white shadow-xs"
                  : "border-gray-200 bg-gray-50/70"
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-100/90 text-amber-600 flex items-center justify-center shrink-0">
                  <FaWallet size={15} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-xs text-gray-800 tracking-wider">MFS</span>
                  <select
                    value={selectedMfsId}
                    onChange={(e) => handleSelectRegisteredMfs(e.target.value)}
                    className="mt-1 w-full max-w-[180px] sm:max-w-[240px] px-2 py-1 text-[11px] border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:border-amber-500 cursor-pointer truncate"
                  >
                    <option value="">
                      {registeredMfsAccounts.length ? "Select MFS..." : "No MFS wallet registered"}
                    </option>
                    {registeredMfsAccounts.map((m) => (
                      <option key={m.id || m.mfsId || m._id} value={m.id || m.mfsId || m._id}>
                        {m.mfsName || m.name}
                        {m.method || m.mfsMethod || m.mobileNo
                          ? ` – ${m.method || m.mfsMethod || m.mobileNo}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className={`flex items-center h-8 rounded-lg border bg-white overflow-hidden w-32 sm:w-36 shrink-0 transition-colors ${
                  Number(mfsAmount) > 0
                    ? "border-amber-500 ring-1 ring-amber-500"
                    : "border-gray-300 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500"
                }`}
              >
                <span className="text-[11px] text-gray-400 px-2.5 bg-gray-50 h-full flex items-center border-r border-gray-200 font-mono select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mfsAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setMfsAmount(e.target.value)}
                  className="w-full text-right px-2 text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Bottom Totals: Total Paid & Due Balance */}
          <div className="grid grid-cols-2 gap-2 border-t border-gray-200 pt-2 items-center">
            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                Total Paid Amount (৳)
              </span>
              <span className="text-sm font-extrabold font-mono text-emerald-700 block text-right">
                ৳ {formatMoney(totalPaid)}
              </span>
            </div>

            <div className={`p-2 rounded-lg border ${dueAmount > 0 ? "bg-rose-50 border-rose-200" : "bg-gray-50 border-gray-200"}`}>
              <span className="text-[10px] font-bold text-gray-600 uppercase block">
                Due Balance (৳)
              </span>
              <span
                className={`text-sm font-extrabold font-mono block text-right ${
                  dueAmount > 0 ? "text-rose-600" : "text-gray-400"
                }`}
              >
                ৳ {formatMoney(dueAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Modal */}
      <PartyModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        defaultType="SUPPLIER"
        onSuccess={() => {
          setIsPartyModalOpen(false);
          queryClient.invalidateQueries({ queryKey: [partyListQueryKey] });
        }}
      />

      {/* Challan Settings Modal */}
      <ChallanSettingsModal
        isOpen={isChallanSettingsOpen}
        onClose={() => setIsChallanSettingsOpen(false)}
        onSaved={(newSettings) => setChallanSettings(newSettings)}
      />

      {/* Printable Invoice Modal after Save & Print */}
      <PurchaseInvoiceModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          navigate("/admin/purchases");
        }}
        purchase={savedPurchaseForPrint}
      />
    </div>
  );
};

export default CreatePurchaseForm;
