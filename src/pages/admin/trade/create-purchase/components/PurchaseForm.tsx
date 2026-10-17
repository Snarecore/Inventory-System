import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";
import {
  FaTrash,
  FaSearch,
  FaBarcode,
  FaUserPlus,
  FaSlidersH,
  FaCheck,
  FaPlus,
  FaTimes,
  FaPrint,
  FaCalculator,
} from "react-icons/fa";
import Button from "@/components/button/Button";
import DeleteModal from "@/components/modal/DeleteModal";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PartyModal from "@/pages/admin/people/parties/components/PartyModal";
import ChallanSettingsModal from "@/pages/admin/trade/purchases/components/ChallanSettingsModal";
import PurchaseInvoiceModal from "@/pages/admin/trade/purchases/components/PurchaseInvoiceModal";
import DatePicker from "@/components/common/DatePicker";
import ImageUpload from "@/components/image/ImageUpload";
import apiConfig from "@/config/api.json";
import {
  purchaseListQueryKey,
  productListQueryKey,
  partyListQueryKey,
  purchaseChallanSettingsQueryKey,
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
import { usePurchasesQuery } from "@/pages/admin/trade/purchase-return/hooks/usePurchaseReturnQueries";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import { cashLeg, bankLeg, mfsLeg, type TradeTender } from "@/services/financial-ledger-service";
import type { PurchaseItem, PurchaseDetailItem, ProductItem, PartyItem, PurchaseChallanSettings } from "@/types";

interface FormLineItem {
  id?: string | number;
  purchaseDetailId?: string | number;
  purchase_detail_id?: string | number;
  productId: string | number;
  productCode: string;
  productName: string;
  unit: string;
  buyPrice: string;
  quantity: string;
  vat: string;
  total: number;
  stock?: number | string;
}

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

const defaultChallanSettings: PurchaseChallanSettings = {
  showChallanRefNo: true,
  showChallanDate: true,
  showVatChallan: false,
  showVatChallanDate: false,
  attachments: true,
  remarks: true,
  vehicleNumber: true,
  capacityCft: true,
  driverName: true,
  driverPhone: true,
  // Aliases
  showChallanNo: true,
  showVehicleNo: true,
  showDeliveryDate: true,
  showNotes: true,
  showTransportCost: true,
  showPoNumber: true,
  enableAttachments: true,
  showAttachments: true,
};

const CreatePurchaseForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const queryClient = useQueryClient();
  const { postFormMutation, postMutation, handleApiMutation } = useAPI();
  const { recordTradeLedger } = useFinancialLedger();

  const stateEditData: PurchaseItem | undefined = (location.state as any)?.editData;
  const isEditMode = Boolean(routeId || stateEditData);

  // Form Basic Info
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Supplier
  const [selectedSupplier, setSelectedSupplier] = useState<PartyItem | null>(null);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState<boolean>(false);

  // Challan & Logistics Info
  const [challanNo, setChallanNo] = useState<string>("");
  const [poNumber, setPoNumber] = useState<string>("");
  const [vatChallan, setVatChallan] = useState<string>("");
  const [vatChallanDate, setVatChallanDate] = useState<string>("");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [capacityCft, setCapacityCft] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [driverPhone, setDriverPhone] = useState<string>("");
  const [transportCost, setTransportCost] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isNotesDropdownOpen, setIsNotesDropdownOpen] = useState<boolean>(false);
  const notesDropdownRef = useRef<HTMLDivElement>(null);
  const [attachment, setAttachment] = useState<File | string | null>(null);

  // Product Selection & Line Items
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);

  // Invoice-level Financials
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>("");
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [invoiceVat, setInvoiceVat] = useState<string>("");



  // Modals & Settings
  const [isChallanSettingsOpen, setIsChallanSettingsOpen] = useState<boolean>(false);
  const [challanSettings, setChallanSettings] = useState<PurchaseChallanSettings>(defaultChallanSettings);
  const [savedPurchaseForPrint, setSavedPurchaseForPrint] = useState<PurchaseItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [shouldAutoPrint, setShouldAutoPrint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null);
  const [isDeleteLineModalOpen, setIsDeleteLineModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState<boolean>(false);
  const [pendingSavePrint, setPendingSavePrint] = useState<boolean>(false);

  // Fetch Existing Purchases ONLY when in edit mode (Shared cache with 60s staleTime)
  const { data: rawPurchaseData } = usePurchasesQuery({
    enabled: Boolean(isEditMode || routeId),
  });

  // Business Code for Auto-Invoice Generation (Single Source of Truth from user session)
  const businessCode = getBusinessCode();

  // Auto-generate invoice number in format: <businessCode>-<YYYY><MM><DD><HH><mm><ss><ms>
  useEffect(() => {
    if (!isEditMode && !invoiceNo && businessCode) {
      setInvoiceNo(makeInvoiceNo(businessCode));
    }
  }, [isEditMode, invoiceNo, businessCode]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notesDropdownRef.current && !notesDropdownRef.current.contains(e.target as Node)) {
        setIsNotesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Products via POST /get-product-list
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
      if (Array.isArray(raw.productsList)) list = raw.productsList;
      else if (Array.isArray(raw.productList)) list = raw.productList;
      else if (Array.isArray(raw.data)) list = raw.data;
    }

    return list
      .filter((p: any) => {
        const isDel = String(p.isDeleted || "").trim().toUpperCase();
        return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
      })
      .map((p: any) => ({
        ...p,
        id: p.id ?? p.pcode,
        name: p.name || "Product",
        productCode: p.pcode || "",
        pcode: p.pcode || "",
        buyPrice: Number(p.buyPrice ?? 0),
        sellPrice: Number(p.sellPrice ?? 0),
        quantity: Number(p.quantity ?? 0),
        unit: p.unit || "pcs",
      }));
  }, [rawProductData]);

  // Fetch Suppliers via POST /get-party-info-list
  const partyListUrl = apiConfig.party.partyListUrl;
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

    return list
      .filter((p: any) => {
        if (!isPartyActive(p)) return false;
        const type = String(p.type || p.partyType || "").toUpperCase();
        return type.includes("SUPPLIER") || !type;
      })
      .map((p: any) => ({
        ...p,
        id: p.id,
        name: p.name || "Supplier",
        phone: p.phone || "",
        address: p.address || "",
      }));
  }, [rawPartyData]);

  // Fetch Registered Bank and MFS Accounts (Shared cache with 5-minute staleTime)
  const { registeredBankAccounts, registeredMfsAccounts } = useFinancialAccounts();

  // Fetch Challan Settings
  const challanSettingsUrl = apiConfig.purchase.purchaseChallanSettingsUrl;
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
          id: data.id ?? null,
          showChallanRefNo: data.showChallanRefNo ?? data.showChallanNo ?? true,
          showChallanDate: data.showChallanDate ?? data.showDeliveryDate ?? true,
          showVatChallan: data.showVatChallan ?? false,
          showVatChallanDate: data.showVatChallanDate ?? false,
          attachments: data.attachments ?? data.enableAttachments ?? true,
          remarks: data.remarks ?? data.showNotes ?? true,
          vehicleNumber: data.vehicleNumber ?? data.showVehicleNo ?? true,
          capacityCft: data.capacityCft ?? true,
          driverName: data.driverName ?? data.showDriverName ?? true,
          driverPhone: data.driverPhone ?? data.showDriverPhone ?? true,
          // Aliases
          showChallanNo: data.showChallanRefNo ?? data.showChallanNo ?? true,
          showVehicleNo: data.vehicleNumber ?? data.showVehicleNo ?? true,
          showDriverName: data.driverName ?? data.showDriverName ?? true,
          showDriverPhone: data.driverPhone ?? data.showDriverPhone ?? true,
          showTransportCost: data.showTransportCost ?? true,
          showDeliveryDate: data.showChallanDate ?? data.showDeliveryDate ?? true,
          showNotes: data.remarks ?? data.showNotes ?? true,
          showPoNumber: data.showPoNumber ?? true,
          enableAttachments: data.attachments ?? data.enableAttachments ?? true,
          showAttachments: data.attachments ?? data.showAttachments ?? true,
        });
      }
    }
  }, [rawChallanSettings]);

  // 1. Resolve edit data from location state OR from loaded purchase list matching routeId (pure database API)
  const effectiveEditData: any = useMemo(() => {
    if (stateEditData) return stateEditData;
    if (!routeId || !rawPurchaseData || !Array.isArray(rawPurchaseData)) return null;

    const target = String(routeId).trim();
    const found = rawPurchaseData.find((p: any) => {
      if (!p) return false;
      const id = String(p.id ?? p.purchaseId ?? "");
      const inv = String(p.invoiceNo ?? "");
      return id === target || inv === target;
    });

    return found || null;
  }, [stateEditData, routeId, rawPurchaseData]);

  const initializedEditIdRef = useRef<string | null>(null);

  // Prefill in Edit Mode
  useEffect(() => {
    if (effectiveEditData) {
      const currentEditId = String(
        effectiveEditData.id ?? effectiveEditData.purchaseId ?? effectiveEditData.invoiceNo ?? routeId ?? ""
      );

      // Only initialize once per purchase ID unless line items are completely empty
      if (initializedEditIdRef.current === currentEditId && lineItems.length > 0) {
        return;
      }
      initializedEditIdRef.current = currentEditId;

      const data: any = effectiveEditData;
      setInvoiceNo(data.invoiceNo || "");
      setPurchaseDate(data.purchaseDate || new Date().toISOString().substring(0, 10));
      setChallanNo(data.challanNo || data.challanRefNo || "");
      setVatChallan(data.vatChallan || "");
      setVatChallanDate(data.vatChallanDate || "");
      setVehicleNo(data.vehicleNo || data.vehicleNumber || "");
      setCapacityCft(data.capacityCft || "");
      setDriverName(data.driverName || "");
      setDriverPhone(data.driverPhone || "");

      let rawAttach = data.attachments ?? data.attachment ?? null;

      if (typeof rawAttach === "string" && (rawAttach.startsWith("[") || rawAttach.startsWith("{"))) {
        try {
          rawAttach = JSON.parse(rawAttach);
        } catch {
          // ignore parse error and retain as string
        }
      }

      let cleanAttach: string | File | null = null;
      if (rawAttach instanceof File) {
        cleanAttach = rawAttach;
      } else if (Array.isArray(rawAttach)) {
        if (rawAttach.length > 0) {
          const first = rawAttach[0];
          cleanAttach =
            first instanceof File
              ? first
              : typeof first === "string"
              ? first
              : (first?.url || first?.path || null);
        }
      } else if (typeof rawAttach === "object" && rawAttach !== null) {
        cleanAttach = rawAttach.url || rawAttach.path || null;
      } else if (typeof rawAttach === "string" && rawAttach.trim() !== "" && rawAttach !== "null" && rawAttach !== "undefined") {
        cleanAttach = rawAttach.trim();
      }

      setAttachment(cleanAttach);

      const transport = data.transportCost ?? "";
      setTransportCost(transport !== "" && transport !== null && Number(transport) > 0 ? String(transport) : "");

      setNotes(data.note || "");

      const disc = data.discount ?? "";
      setInvoiceDiscount(disc !== "" && disc !== null && Number(disc) > 0 ? String(disc) : "");
      setInvoiceDiscountType(data.discountType === "PERCENT" ? "PERCENT" : "FLAT");

      const vatVal = data.vat ?? "";
      setInvoiceVat(vatVal !== "" && vatVal !== null && Number(vatVal) > 0 ? String(vatVal) : "");

      // Split payments
      const cash =
        data.cashReceived ??
        (data.paymentType === "CASH" && !data.bankId && !data.mfsId ? data.paidAmount : "");
      const bank =
        data.cardReceived ??
        (data.bankId ? data.paidAmount : "");
      const mfs =
        data.mfsReceived ??
        (data.mfsId ? data.paidAmount : "");

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

      // Supplier
      const suppId = data.supplierId;
      const suppName = data.supplierName;
      const suppPhone = data.supplierPhone;
      const suppAddress = data.supplierAddress;

      if (suppId || suppName) {
        const found = suppliersList.find(
          (s) =>
            (suppId && String(s.id) === String(suppId)) ||
            (suppName && s.name === suppName)
        );
        if (found) {
          setSelectedSupplier(found);
        } else {
          setSelectedSupplier({
            id: suppId,
            name: suppName || "Supplier",
            phone: suppPhone || "",
            address: suppAddress || "",
          });
        }
      }

      // Line Items (Purchase Details)
      const rawDetails: any[] =
        Array.isArray(data.purchaseDetails) && data.purchaseDetails.length > 0
          ? data.purchaseDetails
          : Array.isArray(data.purchasesDetails) && data.purchasesDetails.length > 0
          ? data.purchasesDetails
          : Array.isArray(data.details)
          ? data.details
          : [];

      if (Array.isArray(rawDetails) && rawDetails.length > 0) {
        const seenProductKeys = new Set<string>();
        const loadedItems: FormLineItem[] = [];

        rawDetails.forEach((item: any) => {
          const pId = String(item.productId || item.id || "");
          const pCode = String(item.productCode || item.pcode || "");
          const pName = String(item.productName || item.name || "Product");
          const key = (pId || pCode || pName).trim().toLowerCase();

          // Deduplicate: If product was already processed in this invoice, skip duplicate without summing
          if (key && seenProductKeys.has(key)) {
            return;
          }

          if (key) seenProductKeys.add(key);

          const buyP = Number(item.buyPrice ?? 0);
          const q = Number(item.quantity ?? 1);
          const v = Number(item.vat ?? 0);
          const tot = Number(item.total ?? (buyP * q));

          // Match with allProducts to get current stock and fallback name/code
          const matchedProd = allProducts.find((p) => {
            const pIdStr = String(p.id ?? "");
            const pCodeStr = String(p.pcode || "").toLowerCase();
            return (pId && pIdStr === pId) || (pCode && pCodeStr === pCode.toLowerCase());
          });

          const currentLiveStock = matchedProd
            ? Number(matchedProd.quantity ?? 0)
            : Number(item.stock ?? 0);

          const detailId = item.id || item.purchaseDetailId;

          loadedItems.push({
            id: detailId,
            purchaseDetailId: detailId,
            productId: pId || (matchedProd?.id ? String(matchedProd.id) : ""),
            productCode: pCode || matchedProd?.pcode || "",
            productName: pName !== "Product" ? pName : (matchedProd?.name || "Product"),
            unit: item.unit || matchedProd?.unit || "pcs",
            buyPrice: String(buyP),
            quantity: String(q),
            vat: v ? String(v) : "",
            total: tot,
            stock: currentLiveStock,
          });
        });

        if (loadedItems.length > 0) {
          setLineItems(loadedItems);
        }
      }
    }
  }, [effectiveEditData, suppliersList, allProducts, routeId]);

  // Synchronize live stock for lineItems whenever allProducts is loaded or updated
  useEffect(() => {
    if (allProducts.length > 0 && lineItems.length > 0) {
      setLineItems((prevItems) => {
        let changed = false;
        const updated = prevItems.map((item) => {
          const matchedProd = allProducts.find((p) => {
            const pIdStr = String(p.id ?? "");
            const pCodeStr = String(p.productCode || p.pcode || "").toLowerCase();
            return (item.productId && pIdStr === String(item.productId)) ||
                   (item.productCode && pCodeStr === item.productCode.toLowerCase());
          });

          if (matchedProd) {
            const liveStock = Number(matchedProd.quantity ?? 0);
            if (item.stock !== liveStock) {
              changed = true;
              return { ...item, stock: liveStock };
            }
          }
          return item;
        });
        return changed ? updated : prevItems;
      });
    }
  }, [allProducts]);


  // Helper to check if a product is already added in the purchase line items list
  const isProductAlreadyInList = useCallback(
    (product: ProductItem) => {
      const pId = product.id;
      const pCode = product.productCode || product.pcode;

      return lineItems.some((item) => {
        if (pId !== undefined && pId !== null && pId !== "" && item.productId !== undefined && item.productId !== null && item.productId !== "") {
          if (String(item.productId) === String(pId)) return true;
        }
        if (pCode && item.productCode) {
          if (String(item.productCode).trim().toLowerCase() === String(pCode).trim().toLowerCase()) return true;
        }
        return false;
      });
    },
    [lineItems]
  );

  // Toggle adding or removing a product from line items directly
  const handleToggleProductInList = useCallback(
    (product: ProductItem) => {
      const pId = product.id ? String(product.id) : "";
      const pCode = product.productCode || product.pcode || "";
      const isAlreadyIn = isProductAlreadyInList(product);

      if (isAlreadyIn) {
        setLineItems((prev) =>
          prev.filter((item) => {
            if (pId && item.productId && String(item.productId) === String(pId)) return false;
            if (pCode && item.productCode && String(item.productCode).trim().toLowerCase() === String(pCode).trim().toLowerCase()) return false;
            return true;
          })
        );
      } else {
        const prodName = product.name || "Product";
        const prodUnit = product.unit || "pcs";
        const buyPrice = Number(product.buyPrice ?? 0);
        const currentStock = Number(product.quantity ?? 0);

        const newLine: FormLineItem = {
          productId: pId,
          productCode: pCode,
          productName: prodName,
          unit: prodUnit,
          buyPrice: buyPrice > 0 ? String(buyPrice) : "",
          quantity: "1",
          vat: "",
          total: buyPrice,
          stock: currentStock,
        };
        setLineItems((prev) => [...prev, newLine]);
      }
    },
    [isProductAlreadyInList]
  );

  const handleUpdateLineItem = useCallback(
    (index: number, field: keyof FormLineItem, value: any) => {
      setLineItems((prev) => {
        if (!prev[index]) return prev;
        const updated = [...prev];
        const item = { ...updated[index], [field]: value };
        item.total = computeLineTotal(item.buyPrice, item.quantity, item.vat);
        updated[index] = item;
        return updated;
      });
    },
    []
  );

  const handleAddProduct = useCallback(
    (product: ProductItem) => {
      const pId = product.id ?? "";
      const pCode = product.pcode || "";
      const existingIndex = lineItems.findIndex(
        (item) =>
          (pId && item.productId && String(item.productId) === String(pId)) ||
          (pCode && item.productCode && String(item.productCode).trim().toLowerCase() === String(pCode).trim().toLowerCase())
      );

      if (existingIndex > -1) {
        const curQty = Number(lineItems[existingIndex].quantity) || 1;
        const newQty = curQty + 1;
        handleUpdateLineItem(existingIndex, "quantity", String(newQty));
        showSuccessToast(`Increased "${lineItems[existingIndex].productName}" quantity to ${newQty}`);
      } else {
        handleToggleProductInList(product);
      }
    },
    [lineItems, handleUpdateLineItem, handleToggleProductInList]
  );

  const productSearch = useTradeProductSearch({
    allProducts,
    mode: "purchase",
    onAddProduct: handleAddProduct,
    onToggleProduct: handleToggleProductInList,
  });

  const handleRemoveLineItem = useCallback((index: number) => {
    setLineItems((prev) => {
      const item = prev[index];
      const name = item?.productName || "Product";
      showDeleteToast(`"${name}" removed from purchase list!`);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleUpdatePrice = useCallback(
    (idx: number, val: string) => handleUpdateLineItem(idx, "buyPrice", val),
    [handleUpdateLineItem]
  );

  const handleUpdateQuantity = useCallback(
    (idx: number, val: string) => handleUpdateLineItem(idx, "quantity", val),
    [handleUpdateLineItem]
  );

  const handleRequestDelete = useCallback((idx: number) => {
    setItemIndexToDelete(idx);
    setIsDeleteLineModalOpen(true);
  }, []);

  const handleSelectSupplier = useCallback((supplier: PartyItem) => {
    setSelectedSupplier(supplier);
  }, []);

  const handleOpenPartyModal = useCallback(() => {
    setIsPartyModalOpen(true);
  }, []);

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

  // 3. Invoice-level Overall Discount (Fixed Amount)
  const calculatedInvoiceDiscount = useMemo(() => {
    return Number(invoiceDiscount) || 0;
  }, [invoiceDiscount]);

  // 4. Total Discount combined
  const totalDiscount = useMemo(() => {
    return calculatedInvoiceDiscount;
  }, [calculatedInvoiceDiscount]);

  // 6. Invoice-level VAT (Fixed Amount)
  const calculatedInvoiceVat = useMemo(() => {
    return Number(invoiceVat) || 0;
  }, [invoiceVat]);

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

  const handleAttachmentChange = (file: File | null) => {
    if (!file) {
      setAttachment(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Pre-validate & Open Confirmation Modal
  const handlePreSubmit = (shouldPrint = false) => {
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

    // Validate Bank & MFS selection if amount entered
    if (Number(bankAmount) > 0 && !selectedBankId) {
      showErrorToast("Please select a bank account for Card / Bank payment");
      return;
    }
    if (Number(mfsAmount) > 0 && !selectedMfsId) {
      showErrorToast("Please select an MFS provider for MFS payment");
      return;
    }

    setPendingSavePrint(shouldPrint);
    setIsSaveConfirmModalOpen(true);
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

    // Validate Bank & MFS selection if amount entered
    if (Number(bankAmount) > 0 && !selectedBankId) {
      showErrorToast("Please select a bank account for Card / Bank payment");
      return;
    }
    if (Number(mfsAmount) > 0 && !selectedMfsId) {
      showErrorToast("Please select an MFS provider for MFS payment");
      return;
    }

    setIsSubmitting(true);

    try {
      const accessUser = buildAccessUser();
      const insertUrl = apiConfig.purchase.insertPurchasesUrl;
      const updateUrl = apiConfig.purchase.updatePurchasesUrl;
      const targetUrl = isEditMode ? updateUrl : insertUrl;

      // Backend expects "CASH" (when any payment is made) or "CREDIT" (when 100% due)
      const paymentType = totalPaid > 0 ? "CASH" : "CREDIT";
      const paymentStatus = dueAmount <= 0 ? "Paid" : totalPaid > 0 ? "PARTIAL" : "Pending";

      const purchaseDetailsPayload = lineItems.map((item) => {
        const p = Number(item.buyPrice) || 0;
        const q = Number(item.quantity) || 0;
        const v = Number(item.vat) || 0;
        const base = p * q;
        const lineVat = (base * v) / 100;

        return {
          productId: String(item.productId || ""),
          productCode: String(item.productCode || ""),
          productName: item.productName || "",
          packSize: null,
          unit: item.unit || "pcs",
          expiryDate: null,
          quantity: q,
          buyPrice: p,
          discount: 0,
          total: Number(item.total),
          vat: lineVat,
          delivery_charge: 0,
          status: "PENDING",
          advenType: "PURCHASE",
          addedBy: accessUser.phone || "",
        };
      });

      const purchasePayload: any = {
        accessUser,
        invoiceNo: invoiceNo.trim(),
        purchaseDate,
        supplierId: selectedSupplier.id || "",
        supplierName: selectedSupplier.name || "",
        supplierPhone: selectedSupplier.phone || "",
        supplierAddress: selectedSupplier.address || "",
        challanNo: challanNo.trim() || null,
        challanDate: purchaseDate,
        vatChallan: vatChallan.trim() || null,
        vatChallanDate: vatChallanDate || null,
        vehicleNo: vehicleNo.trim() || null,
        capacityCft: capacityCft.trim() || null,
        driverName: driverName.trim() || null,
        driverPhone: driverPhone.trim() || null,
        transportCost: calculatedTransport,
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
        note: notes.trim() || null,
        attachments: attachment || null,
        operation: isEditMode ? "update" : "insert",
        cashReceived: numCash,
        cardReceived: numBank,
        mfsReceived: numMfs,
        bankId: numBank > 0 ? selectedBankId : null,
        bankName: numBank > 0 ? bankName : null,
        accountNo: numBank > 0 ? accountNo : null,
        bankAccountName: numBank > 0 ? bankRef : null,
        mfsId: numMfs > 0 ? selectedMfsId : null,
        mfsName: numMfs > 0 ? mfsName : null,
        mfsPhone: numMfs > 0 ? mfsPhone : null,
        customerPaid: Number(cashGiven) || totalPaid,
        returnAmount: changeReturnAmount,
        purchaseDetails: purchaseDetailsPayload,
        details: purchaseDetailsPayload,
      };

      const editId =
        effectiveEditData?.id ??
        effectiveEditData?.purchaseId ??
        stateEditData?.id ??
        stateEditData?.purchaseId ??
        routeId;

      if (isEditMode && editId) {
        purchasePayload.id = editId;
        purchasePayload.purchaseId = editId;
      }

      // Both insert-purchases and update-purchases endpoints in ERP backend are JSON HTTP POST
      const mutation = postMutation;

      const result = await handleApiMutation({
        mutation,
        url: targetUrl,
        body: purchasePayload,
        invalidateQueryKey: [purchaseListQueryKey, productListQueryKey],
        showSuccessMessage: true,
        showErrorMessage: true,
      });

      if (result?.success) {
        const res: any = (result.data as any)?.data !== undefined ? (result.data as any).data : result.data;
        const savedId = res?.id || res?.purchaseId || editId || invoiceNo;

        // Post financial transaction EXPENSE to update cash/bank balances
        if (totalPaid > 0) {
          try {
            const selectedBankObj = registeredBankAccounts.find(
              (b) => String(b.id) === String(selectedBankId)
            );
            const selectedMfsObj = registeredMfsAccounts.find(
              (m) => String(m.id) === String(selectedMfsId)
            );

            const tenders: TradeTender[] = [
              { amount: numCash, leg: cashLeg() },
              { amount: numBank, leg: bankLeg(selectedBankObj) },
              { amount: numMfs, leg: mfsLeg(selectedMfsObj) },
            ].filter((t) => t.amount > 0);

            const productSummary = lineItems.map((li) => li.productName).filter(Boolean).join(", ");

            await recordTradeLedger({
              tradeType: "EXPENSE",
              tenders,
              invoiceNo: invoiceNo.trim(),
              partyId: selectedSupplier?.id || "",
              head: "Purchase",
              itemsSummary: productSummary,
              notes: notes.trim(),
              date: purchaseDate,
              totalDue: dueAmount,
            });
          } catch (ledgerErr) {
            console.error("Purchase saved, but financial ledger posting encountered an error:", ledgerErr);
          }
        }

        const savedItem: any = {
          ...purchasePayload,
          id: savedId,
          attachments: attachment || purchasePayload.attachments,
          attachment: attachment || purchasePayload.attachments,
          createdAt: new Date().toISOString(),
        };

        queryClient.setQueryData([purchaseListQueryKey], (oldData: any) => {
          if (!oldData) return { status: "Success", purchaseList: [savedItem] };
          if (Array.isArray(oldData)) {
            if (isEditMode) {
              return oldData.map((item: any) => {
                const itemId = String(item.id ?? item.purchaseId ?? item.invoiceNo ?? "");
                const targetId = String(savedItem.id ?? savedItem.purchaseId ?? savedItem.invoiceNo ?? "");
                return itemId === targetId || String(item.invoiceNo) === String(savedItem.invoiceNo) ? { ...item, ...savedItem } : item;
              });
            }
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
            const updatedList = isEditMode
              ? currentList.map((item: any) => {
                  const itemId = String(item.id ?? item.purchaseId ?? item.invoiceNo ?? "");
                  const targetId = String(savedItem.id ?? savedItem.purchaseId ?? savedItem.invoiceNo ?? "");
                  return itemId === targetId || String(item.invoiceNo) === String(savedItem.invoiceNo) ? { ...item, ...savedItem } : item;
                })
              : [savedItem, ...currentList];
            return {
              ...oldData,
              [listKey]: updatedList,
            };
          }
          return oldData;
        });

        // Always open Invoice Modal after save so user can view/print invoice
        setShouldAutoPrint(shouldPrint);
        setSavedPurchaseForPrint({
          ...purchasePayload,
          id: savedId,
          attachments: attachment || purchasePayload.attachments,
        });
        setIsPrintModalOpen(true);
      }
    } catch (err: any) {
      console.error("Save purchase exception:", err);
      showErrorToast(err?.message || "An error occurred while saving purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = () => {
    setLineItems([]);
    setSelectedSupplier(null);
    setInvoiceDiscount("");
    setInvoiceVat("");
    setTransportCost("");
    resetPayment();
    setChallanNo("");
    setChallanDate("");
    setVatChallan("");
    setVatChallanDate("");
    setVehicleNo("");
    setCapacityCft("");
    setDriverName("");
    setDriverPhone("");
    setDeliveryDate("");
    setPoNumber("");
    setNotes("");
    setAttachment(null);
    setSelectedProductsMap({});
    if (businessCode) {
      setInvoiceNo(makeInvoiceNo(businessCode));
    } else {
      setInvoiceNo("");
    }
    setIsResetModalOpen(false);
    showDeleteToast("Purchase form reset successfully!");
  };

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-[#F6F6F6] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 border-b border-gray-200">
        {/* Left Side: Title & Invoice Badge (Stacked on Mobile, Inline on LG) */}
        <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2.5 min-w-0">
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-[var(--primary-color)] flex items-center gap-1.5 shrink-0">
              <FaCalculator className="text-[var(--primary-color)] shrink-0" size={18} />
              <span className="truncate">{isEditMode ? "Edit Purchase Invoice" : "Create New Purchase"}</span>
            </h1>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[var(--primary-color-light)] text-[var(--primary-color)] font-normal w-fit">
              {invoiceNo || "INV"}
            </span>
          </div>

          {/* Quick Settings, Reset, Cancel - visible on top right on Mobile (< lg) */}
          <div className="flex lg:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsChallanSettingsOpen(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-normal text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Challan Settings"
            >
              <FaSlidersH className="text-black" size={12} />
              <span className="hidden sm:inline">Challan Settings</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/purchases")}
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
              onClick={() => setIsChallanSettingsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-normal text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FaSlidersH className="text-black" size={12} />
              <span>Challan Settings</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/purchases")}
              className="px-3 py-1.5 text-xs font-normal text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Save & Save & Print Buttons (2 in 1 line on mobile, auto width on LG) */}
          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
            <Button
              label={isSubmitting ? "Saving..." : isEditMode ? "Update Purchase" : "Save Purchase"}
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

      {/* Grid: Supplier & Meta Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* Supplier Selector */}
        <TradePartySelector
          partyType="supplier"
          label="Supplier"
          required
          selectedParty={selectedSupplier}
          partyList={suppliersList}
          onSelectParty={handleSelectSupplier}
          onOpenNewPartyModal={handleOpenPartyModal}
          allowWalkIn={false}
        />

        {/* Invoice No */}
        <div>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
            Invoice No <span className="text-rose-500">*</span>
          </label>
          <div
            className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-200 font-bold text-black flex items-center select-text cursor-default"
            title="Auto-generated Invoice Number"
          >
            {invoiceNo || "N/A"}
          </div>
        </div>

        {/* Purchase Date */}
        <div>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
            Purchase Date <span className="text-rose-500">*</span>
          </label>
          <DatePicker
            value={purchaseDate}
            onChange={(dateStr) => setPurchaseDate(dateStr || new Date().toISOString().substring(0, 10))}
            size="md"
            isClearable={false}
            displayFormat="DD MMM, YYYY"
            placeholder="Select purchase date"
          />
        </div>

        {/* Optional Challan Ref No */}
        {(challanSettings.showChallanRefNo ?? challanSettings.showChallanNo) && (
          <div>
            <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
              Challan Ref No
            </label>
            <input
              type="text"
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
              placeholder="e.g. CH-98234"
            />
          </div>
        )}

        {/* Optional VAT Challan No */}
        {challanSettings.showVatChallan && (
          <div>
            <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
              VAT Challan No
            </label>
            <input
              type="text"
              value={vatChallan}
              onChange={(e) => setVatChallan(e.target.value)}
              className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
              placeholder="e.g. VAT-98234"
            />
          </div>
        )}

        {/* Optional VAT Challan Date */}
        {challanSettings.showVatChallanDate && (
          <div>
            <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
              VAT Challan Date
            </label>
            <DatePicker
              value={vatChallanDate}
              onChange={(dateStr) => setVatChallanDate(dateStr)}
              size="md"
              isClearable={true}
              displayFormat="DD MMM, YYYY"
              placeholder="Select VAT date"
            />
          </div>
        )}

        {/* Optional Vehicle No */}
        {(challanSettings.vehicleNumber ?? challanSettings.showVehicleNo) && (
          <div>
            <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
              Vehicle / Truck No
            </label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
              placeholder="e.g. DHAKA-METRO-11-2233"
            />
          </div>
        )}

        {/* Optional Capacity (CFT) */}
        {challanSettings.capacityCft && (
          <div>
            <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
              Capacity (CFT)
            </label>
            <input
              type="text"
              value={capacityCft}
              onChange={(e) => setCapacityCft(e.target.value)}
              className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
              placeholder="e.g. 500 CFT"
            />
          </div>
        )}

        {/* Optional Driver Name */}
        {(challanSettings.driverName ?? challanSettings.showDriverName) && (
          <div>
            <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
              Driver Name
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
              placeholder="e.g. Rafiq Hossain"
            />
          </div>
        )}

        {/* Optional Driver Phone */}
        {(challanSettings.driverPhone ?? challanSettings.showDriverPhone) && (
          <div>
            <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
              Driver Phone
            </label>
            <input
              type="text"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
              placeholder="017xxxxxxxx"
            />
          </div>
        )}

        {/* PO Number (UI / Design Only) */}
        <div>
          <label className="text-[11px] font-bold text-black tracking-wider block mb-1">
            PO Number
          </label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
            placeholder="e.g. PO-2026-001"
          />
        </div>
      </div>

      {/* Product Live Search & Add Bar */}
      <TradeProductSearch
        search={productSearch}
        lineItems={lineItems}
        mode="purchase"
        isProductAlreadyInList={isProductAlreadyInList}
        onToggleProduct={handleToggleProductInList}
        onUpdateLineItem={handleUpdateLineItem}
      />

      {/* Dynamic Line Items Table */}
      <TradeLineItemsTable
        title="Purchase Items List"
        subtotal={rawSubtotal}
        lineItems={lineItems}
        priceHeader="Buy Price (৳)"
        priceField="buyPrice"
        onUpdatePrice={handleUpdatePrice}
        onUpdateQuantity={handleUpdateQuantity}
        onRequestDelete={handleRequestDelete}
        emptyMessage="No items in purchase. Search and add products above."
      />

      {/* Financial Summary & Split Payment Breakdown (2 Column Dense Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
        {/* Left Column: Overall Discounts, VAT, Transport & Remarks (5 cols) */}
        <div className="lg:col-span-5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-1.5">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold text-black">
              Discounts & Extra Charges
            </h3>

            {/* Overall Invoice Discount (Fixed Amount) */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] text-black font-semibold">Discount (৳):</label>
              <div className="relative w-32 sm:w-36">
                <span className="absolute left-2 top-1 text-black text-xs font-bold">৳</span>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceDiscount}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setInvoiceDiscount(e.target.value)}
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
                  value={invoiceVat}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setInvoiceVat(e.target.value)}
                  className="w-full pl-5 pr-2 py-1 text-xs border border-gray-300 rounded text-right text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Transport / Freight Charge */}
            {challanSettings.showTransportCost && (
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] text-black font-semibold">Transport (৳):</label>
                <div className="relative w-32 sm:w-36">
                  <span className="absolute left-2 top-1 text-black text-xs font-bold  ">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    value={transportCost}
                    placeholder="0"
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setTransportCost(e.target.value)}
                    className="w-full pl-5 pr-2 py-1 text-xs border border-gray-300 rounded text-right   text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom of Left Box: Invoice Attachment & Purchase Notes Side by Side */}
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex flex-col sm:flex-row items-start gap-2">
            {/* Invoice Attachment (Fixed compact upload box) */}
            <div className="shrink-0 flex flex-col">
              <div className="h-5 flex items-center mb-1">
                <span className="text-[11px] font-semibold text-black">
                  Attachment
                </span>
              </div>
              <div className="h-[84px] flex items-center">
                <ImageUpload
                  value={attachment}
                  onChange={handleAttachmentChange}
                />
              </div>
            </div>

            {/* Purchase Notes / Remarks (Fills the remaining width seamlessly) */}
            <div className="relative flex-1 min-w-0 w-full flex flex-col" ref={notesDropdownRef}>
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

              {/* Textarea Input with matched height to ImageUpload */}
              <div className="relative h-[84px]">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type notes or click '+ Presets' to add..."
                  className="w-full h-[84px] p-2.5 text-xs border border-gray-300/80 rounded-xl focus:outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/15 resize-none text-black font-medium bg-slate-50/40 hover:bg-white focus:bg-white placeholder:text-gray-400 transition-all shadow-2xs leading-relaxed"
                />

                {/* Clean 1-Click Preset Dropdown Menu */}
                {isNotesDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 bg-gray-50 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-700">
                        Choose a preset to insert:
                      </span>
                      <span className="text-[10px] text-gray-400">Click to add</span>
                    </div>

                    <div className="flex flex-col py-1 divide-y divide-gray-50">
                      {[
                        "Goods received in good condition",
                        "Challan verified with physical stock",
                        "Standard order delivered",
                        "Packaging and seal verified",
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

        {/* Right Column: Financial Totals & Clean Split Payment Breakdown (7 cols) - Medium Compact */}
        <div className="lg:col-span-7 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
          {/* Detailed Financial Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-50/90 py-1.5 px-2.5 rounded-lg border border-gray-200/90 shadow-2xs">
            <div>
              <span className="text-[10px] text-black font-bold block tracking-wider leading-tight">Subtotal</span>
              <span className="text-xs font-bold text-black block text-right leading-tight mt-0.5">
                ৳ {formatMoney(rawSubtotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black font-bold block tracking-wider leading-tight">Discount</span>
              <span className="text-xs font-bold text-rose-600 block text-right leading-tight mt-0.5">
                - ৳ {formatMoney(totalDiscount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black font-bold block tracking-wider leading-tight">VAT + Transport</span>
              <span className="text-xs font-bold text-black block text-right leading-tight mt-0.5">
                + ৳ {formatMoney(totalVat + calculatedTransport)}
              </span>
            </div>
            <div className="bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded text-right flex flex-col justify-center">
              <span className="text-[10px] text-black font-bold block tracking-wider leading-tight">Grand Total</span>
              <span className="text-xs sm:text-[13px] font-extrabold text-[var(--color-primary)] block leading-tight mt-0.5">
                ৳ {formatMoney(grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Section */}
          <TradePaymentSection
            grandTotal={grandTotal}
            payment={payment}
            registeredBankAccounts={registeredBankAccounts}
            registeredMfsAccounts={registeredMfsAccounts}
            title="Payment Disbursed"
            bankLabel="CARD"
            showCashTenderedToggle={true}
          />

          {/* Bottom Totals: Total Paid & Due Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-gray-200/90 pt-1.5 items-center">
            <div className="bg-emerald-50/90 px-2.5 py-1 rounded-md border border-emerald-200/90 flex items-center justify-between shadow-2xs">
              <span className="text-[10.5px] font-bold text-emerald-950 tracking-wide">
                Total Paid (৳)
              </span>
              <span className="text-xs sm:text-[13px] font-extrabold text-emerald-800">
                ৳ {formatMoney(totalPaid)}
              </span>
            </div>

            <div
              className={`px-2.5 py-1 rounded-md border flex items-center justify-between transition-colors shadow-2xs ${
                dueAmount > 0 ? "bg-rose-50/90 border-rose-200/90" : "bg-gray-50 border-gray-200"
              }`}
            >
              <span
                className={`text-[10.5px] font-bold tracking-wide ${
                  dueAmount > 0 ? "text-rose-950" : "text-gray-700"
                }`}
              >
                Due Balance (৳)
              </span>
              <span
                className={`text-xs sm:text-[13px] font-extrabold ${
                  dueAmount > 0 ? "text-rose-600" : "text-black"
                }`}
              >
                ৳ {formatMoney(dueAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Modal */}
      {isPartyModalOpen && (
        <PartyModal
          isOpen={isPartyModalOpen}
          onClose={() => setIsPartyModalOpen(false)}
          defaultType="SUPPLIER"
          onSuccess={() => {
            setIsPartyModalOpen(false);
            queryClient.invalidateQueries({ queryKey: [partyListQueryKey] });
          }}
        />
      )}

      {/* Challan Settings Modal */}
      {isChallanSettingsOpen && (
        <ChallanSettingsModal
          isOpen={isChallanSettingsOpen}
          onClose={() => setIsChallanSettingsOpen(false)}
          onSaved={(newSettings) => setChallanSettings(newSettings)}
        />
      )}

      {/* Printable Invoice Modal after Save & Print */}
      {isPrintModalOpen && (
        <PurchaseInvoiceModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setShouldAutoPrint(false);
            navigate("/admin/purchases");
          }}
          purchase={savedPurchaseForPrint}
          autoPrint={shouldAutoPrint}
        />
      )}

      {/* Delete Line Item Modal */}
      {isDeleteLineModalOpen && (
        <DeleteModal
          isOpen={isDeleteLineModalOpen}
          onClose={() => {
            setIsDeleteLineModalOpen(false);
            setItemIndexToDelete(null);
          }}
          onDelete={() => {
            if (itemIndexToDelete !== null) {
              handleRemoveLineItem(itemIndexToDelete);
            }
            setIsDeleteLineModalOpen(false);
            setItemIndexToDelete(null);
          }}
          title="Remove Product"
          message={`Are you sure you want to remove "${itemIndexToDelete !== null && lineItems[itemIndexToDelete] ? lineItems[itemIndexToDelete]?.productName : 'this item'}" from the purchase list?`}
        />
      )}

      {/* Reset Form Modal */}
      {isResetModalOpen && (
        <DeleteModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onDelete={handleConfirmReset}
          title="Reset Purchase Form"
          message="Are you sure you want to reset the form? All unsaved data and added products will be cleared."
        />
      )}

      {/* Save / Update Confirmation Modal */}
      {isSaveConfirmModalOpen && (
        <ConfirmModal
          isOpen={isSaveConfirmModalOpen}
          onClose={() => setIsSaveConfirmModalOpen(false)}
          onConfirm={async () => {
            setIsSaveConfirmModalOpen(false);
            await handleSubmit(pendingSavePrint);
          }}
          isLoading={isSubmitting}
          title={isEditMode ? "Update Purchase Invoice" : pendingSavePrint ? "Save & Print Purchase" : "Save Purchase Invoice"}
          message={`Are you sure you want to ${isEditMode ? "update" : "save"} this purchase invoice (${invoiceNo || "Invoice"})?`}
          confirmText={isEditMode ? "Yes, Update" : pendingSavePrint ? "Save & Print" : "Yes, Save"}
          confirmButtonColor={pendingSavePrint ? "bg-emerald-600 hover:bg-emerald-700" : "bg-sky-600 hover:bg-sky-700"}
        />
      )}
    </div>
  );
};

export default CreatePurchaseForm;
