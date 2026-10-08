import React, { useState, useEffect, useMemo, useRef } from "react";
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
  FaPrint,
  FaCalculator,
  FaMoneyBillWave,
  FaCreditCard,
  FaMobileAlt,
  FaUniversity,
  FaWallet,
} from "react-icons/fa";
import Button from "@/components/button/Button";
import DeleteModal from "@/components/modal/DeleteModal";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PartyModal from "@/pages/admin/people/parties/components/PartyModal";
import ChallanSettingsModal from "@/pages/admin/trade/purchases/components/ChallanSettingsModal";
import PurchaseInvoiceModal from "@/pages/admin/trade/purchases/components/PurchaseInvoiceModal";
import ImageUpload from "@/components/image/ImageUpload";
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
import { getBusinessCode, setBusinessCode, getUserInfo, setUserInfo, getStoredUser } from "@/utils/auth-storage";
import { makeInvoiceNo } from "@/utils/invoiceNo";
import { postData } from "@/services/api-service";
import { showSuccessToast, showErrorToast, showDeleteToast } from "@/utils/toast-utils";
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

interface SelectedProductEntry {
  product: ProductItem;
  quantity: string;
  buyPrice: string;
}

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

  const stateEditData: PurchaseItem | undefined = (location.state as any)?.editData;
  const isEditMode = Boolean(routeId || stateEditData);

  // Form Basic Info
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Supplier
  const [selectedSupplier, setSelectedSupplier] = useState<PartyItem | null>(null);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState<boolean>(false);
  const supplierRef = useRef<HTMLDivElement>(null);

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
  const [attachment, setAttachment] = useState<string | null>(null);

  // Product Selection & Line Items
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [selectedProductsMap, setSelectedProductsMap] = useState<Record<string, SelectedProductEntry>>({});
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
  const [shouldAutoPrint, setShouldAutoPrint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null);
  const [isDeleteLineModalOpen, setIsDeleteLineModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState<boolean>(false);
  const [pendingSavePrint, setPendingSavePrint] = useState<boolean>(false);

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

  // Business Code for Auto-Invoice Generation
  const [businessCode, setBusinessCodeState] = useState<string>(() => {
    return getBusinessCode() || buildAccessUser().businessCode || "";
  });

  // Fetch and sync business code if missing in storage
  useEffect(() => {
    const existing = getBusinessCode() || buildAccessUser().businessCode;
    if (existing) {
      if (existing !== businessCode) {
        setBusinessCodeState(existing);
      }
      return;
    }

    const userInfo = getUserInfo();
    const phone = userInfo?.phone || userInfo?.phoneNumber || getStoredUser()?.id || "";
    if (!phone) return;

    postData<any>({
      url: "authorization-check-user",
      body: {
        authentication: {
          phone_number: phone,
        },
      },
    })
      .then((res) => {
        if (res && res.businessCode) {
          const code = String(res.businessCode);
          setBusinessCode(code);
          setBusinessCodeState(code);
          if (userInfo) {
            setUserInfo({ ...userInfo, businessCode: code });
          }
          if (!isEditMode && (!invoiceNo || invoiceNo.startsWith("1001-") || !invoiceNo.startsWith(code))) {
            setInvoiceNo(makeInvoiceNo(code));
          }
        }
      })
      .catch(() => {});
  }, [isEditMode, businessCode, invoiceNo]);

  // Auto-generate invoice number in format: <businessCode>-<YYYY><MM><DD><HH><mm><ss><ms>
  useEffect(() => {
    if (!isEditMode && !invoiceNo && businessCode) {
      setInvoiceNo(makeInvoiceNo(businessCode));
    }
  }, [isEditMode, invoiceNo, businessCode]);

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
          id: data.id ?? null,
          showChallanRefNo: data.showChallanRefNo ?? data.show_challan_ref_no ?? data.showChallanNo ?? data.show_challan_no ?? true,
          showChallanDate: data.showChallanDate ?? data.show_challan_date ?? data.showDeliveryDate ?? data.show_delivery_date ?? true,
          showVatChallan: data.showVatChallan ?? data.show_vat_challan ?? false,
          showVatChallanDate: data.showVatChallanDate ?? data.show_vat_challan_date ?? false,
          attachments: data.attachments ?? data.enableAttachments ?? data.enable_attachments ?? data.showAttachments ?? true,
          remarks: data.remarks ?? data.showNotes ?? data.show_notes ?? true,
          vehicleNumber: data.vehicleNumber ?? data.showVehicleNo ?? data.show_vehicle_no ?? true,
          capacityCft: data.capacityCft ?? data.capacity_cft ?? true,
          driverName: data.driverName ?? data.showDriverName ?? data.show_driver_name ?? true,
          driverPhone: data.driverPhone ?? data.showDriverPhone ?? data.show_driver_phone ?? true,
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
    if (!routeId || !rawPurchaseData) return null;

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

    const found = list.find((p: any) => {
      if (!p) return false;
      const id = String(p.id ?? p.purchaseId ?? p.purchase_id ?? p.purId ?? "");
      const inv = String(p.invoiceNo ?? p.invoice_no ?? p.billNo ?? "");
      return id === String(routeId) || inv === String(routeId);
    });

    return found || null;
  }, [stateEditData, routeId, rawPurchaseData]);

  // Prefill in Edit Mode
  useEffect(() => {
    if (effectiveEditData) {
      const data: any = effectiveEditData;
      setInvoiceNo(data.invoiceNo || data.invoice_no || data.billNo || "");
      setPurchaseDate(data.purchaseDate || data.salesDate || data.date || new Date().toISOString().substring(0, 10));
      setChallanNo(data.challanRefNo || data.challan_ref_no || data.challanNo || data.challan_no || "");
      setVatChallan(data.vatChallan || data.vat_challan || data.vatChallanNo || "");
      setVatChallanDate(data.vatChallanDate || data.vat_challan_date || "");
      setVehicleNo(data.vehicleNumber || data.vehicle_number || data.vehicleNo || data.vehicle_no || data.truckNo || "");
      setCapacityCft(data.capacityCft || data.capacity_cft || "");
      setDriverName(data.driverName || data.driver_name || "");
      setDriverPhone(data.driverPhone || data.driver_phone || "");

      const existingAttach = data.attachments || data.attachment || data.attachmentUrl || data.challanImage || data.documentUrl || null;
      setAttachment(existingAttach);

      const transport = data.transportCost ?? data.transport_cost ?? data.delivery_charge ?? data.deliveryCharge ?? "";
      setTransportCost(transport !== "" && transport !== null && Number(transport) > 0 ? String(transport) : "");

      setNotes(data.remarks || data.note || data.notes || "");

      const disc = data.discount ?? data.discountAmount ?? data.discount_amount ?? "";
      setInvoiceDiscount(disc !== "" && disc !== null && Number(disc) > 0 ? String(disc) : "");
      setInvoiceDiscountType(data.discountType === "PERCENT" || data.discount_type === "PERCENT" ? "PERCENT" : "FLAT");

      const vatVal = data.vat ?? data.vatAmount ?? data.vat_amount ?? data.invoiceVat ?? "";
      setInvoiceVat(vatVal !== "" && vatVal !== null && Number(vatVal) > 0 ? String(vatVal) : "");

      // Split payments
      const cash =
        data.cashReceived ??
        data.cash_received ??
        data.cashAmount ??
        (data.paymentType === "CASH" && !data.bankId && !data.mfsId ? data.paidAmount : "");
      const bank =
        data.cardReceived ??
        data.card_received ??
        data.bankAmount ??
        (data.bankId || data.bank_id ? data.paidAmount : "");
      const mfs =
        data.mfsReceived ??
        data.mfs_received ??
        data.mfsAmount ??
        (data.mfsId || data.mfs_id ? data.paidAmount : "");

      setCashAmount(cash !== "" && cash !== null && Number(cash) > 0 ? String(cash) : "");
      setBankAmount(bank !== "" && bank !== null && Number(bank) > 0 ? String(bank) : "");
      setMfsAmount(mfs !== "" && mfs !== null && Number(mfs) > 0 ? String(mfs) : "");

      if (data.bankId || data.bank_id) setSelectedBankId(String(data.bankId || data.bank_id));
      setBankName(data.bankName || data.bank_name || "");
      setAccountNo(data.accountNo || data.account_no || "");
      setBankRef(data.bankAccountName || data.bank_account_name || data.branchName || "");

      if (data.mfsId || data.mfs_id) setSelectedMfsId(String(data.mfsId || data.mfs_id));
      setMfsName(data.mfsName || data.mfs_name || "bKash");
      setMfsPhone(data.mfsPhone || data.mfs_phone || "");

      // Supplier
      const suppId = data.supplierId || data.supplier_id || data.customerId || data.customer_id;
      const suppName = data.supplierName || data.supplier_name || data.customerName || data.customer_name;
      const suppPhone = data.supplierPhone || data.supplier_phone || data.customerPhone || data.customer_phone;
      const suppAddress = data.supplierAddress || data.supplier_address || data.customerAddress || data.customer_address;

      if (suppId || suppName) {
        const found = suppliersList.find(
          (s) =>
            (suppId && (String(s.id) === String(suppId) || String(s.partyId) === String(suppId))) ||
            (suppName && (s.name === suppName || s.partyName === suppName))
        );
        if (found) {
          setSelectedSupplier(found);
        } else {
          setSelectedSupplier({
            id: suppId,
            name: suppName,
            phone: suppPhone,
            address: suppAddress,
          });
        }
      }

      // Line Items (Purchase Details)
      const rawDetails =
        data.purchaseDetails ||
        data.purchasesDetails ||
        data.purchase_details ||
        data.details ||
        data.items ||
        data.products ||
        data.purchaseListDetails ||
        data.salesDetails ||
        [];

      if (Array.isArray(rawDetails) && rawDetails.length > 0) {
        const loadedItems: FormLineItem[] = rawDetails.map((item: any) => {
          const buyP =
            item.buyPrice ??
            item.buy_price ??
            item.price ??
            item.rate ??
            item.sellPrice ??
            item.unitPrice ??
            item.unit_price ??
            0;
          const q = item.quantity ?? item.qty ?? item.quantity_count ?? item.count ?? 1;
          const v = item.vat ?? item.vat_percent ?? item.vatPercent ?? 0;
          const tot =
            item.total ??
            item.total_price ??
            item.subtotal ??
            item.totalAmount ??
            Number(buyP) * Number(q);

          return {
            productId: item.productId ?? item.product_id ?? item.id ?? item.prodId ?? "",
            productCode: item.productCode || item.product_code || item.pcode || item.code || "",
            productName: item.productName || item.product_name || item.name || item.title || "Product",
            unit: item.unit || item.unitName || "pcs",
            buyPrice: String(buyP),
            quantity: String(q),
            vat: v ? String(v) : "",
            total: Number(tot),
          };
        });
        setLineItems(loadedItems);
      }
    }
  }, [effectiveEditData, suppliersList]);

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
    if (!supplierSearchQuery.trim()) return suppliersList.slice(0, 10);
    const q = supplierSearchQuery.toLowerCase().trim();
    return suppliersList.filter((s) => {
      const name = (s.name || s.partyName || "").toLowerCase();
      const phone = (s.phone || s.partyPhone || "").toLowerCase();
      const address = (s.address || s.partyAddress || s.city || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || address.includes(q);
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

  const selectedProductCount = useMemo(
    () => Object.keys(selectedProductsMap).length,
    [selectedProductsMap]
  );

  // Toggle selection for a product in dropdown
  const handleToggleSelectProduct = (product: ProductItem) => {
    const key = String(product.id ?? product.productId ?? product.pcode ?? product.productCode ?? "");
    if (!key) return;
    setSelectedProductsMap((prev) => {
      const copy = { ...prev };
      if (copy[key]) {
        delete copy[key];
      } else {
        const bp = Number(product.buy_price ?? product.buyPrice ?? 0);
        copy[key] = {
          product,
          quantity: "1",
          buyPrice: bp > 0 ? String(bp) : "",
        };
      }
      return copy;
    });
  };

  // Inline update for selected product in dropdown
  const handleUpdateDropdownItem = (key: string, field: "quantity" | "buyPrice", value: string) => {
    setSelectedProductsMap((prev) => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: value,
        },
      };
    });
  };

  // Done button handler: Add all selected / checked products to line items
  const handleDoneSelectProducts = () => {
    const selectedEntries = Object.values(selectedProductsMap);
    if (selectedEntries.length === 0) {
      setIsProductDropdownOpen(false);
      return;
    }

    setLineItems((prev) => {
      const updated = [...prev];

      selectedEntries.forEach(({ product, quantity, buyPrice }) => {
        const prodId = product.id ?? product.productId ?? "";
        const prodCode = product.pcode || product.productCode || "";
        const prodName = product.name || product.productName || "Product";
        const prodUnit = product.unit || "pcs";
        const currentStock = Number(product.stock ?? product.quantity ?? 0);
        const addQty = Number(quantity) || 1;
        const numBuyPrice = Number(buyPrice) || 0;

        const existingIdx = updated.findIndex((item) => String(item.productId) === String(prodId));
        if (existingIdx >= 0) {
          const item = updated[existingIdx];
          const existingQty = Number(item.quantity) || 0;
          const newQty = String(existingQty + addQty);
          const finalBuyPrice = buyPrice || item.buyPrice;
          const total = computeLineTotal(finalBuyPrice, newQty, item.vat);
          updated[existingIdx] = { ...item, buyPrice: finalBuyPrice, quantity: newQty, total };
        } else {
          const finalBuyPrice = buyPrice || (numBuyPrice > 0 ? String(numBuyPrice) : "");
          const newLine: FormLineItem = {
            productId: prodId,
            productCode: prodCode,
            productName: prodName,
            unit: prodUnit,
            buyPrice: finalBuyPrice,
            quantity: String(addQty),
            vat: "",
            total: computeLineTotal(finalBuyPrice, String(addQty), ""),
            stock: currentStock,
          };
          updated.push(newLine);
        }
      });

      return updated;
    });

    setSelectedProductsMap({});
    setProductSearchQuery("");
    setIsProductDropdownOpen(false);
  };

  // Add Single Product to line items (or toggle)
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

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const selectedList = Object.values(selectedProductsMap);
      if (selectedList.length > 0) {
        handleDoneSelectProducts();
      } else if (filteredProducts.length === 1) {
        handleAddProduct(filteredProducts[0]);
      }
    }
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
    const item = lineItems[index];
    const name = item?.productName || "Product";
    setLineItems((prev) => prev.filter((_, i) => i !== index));
    showDeleteToast(`"${name}" removed from purchase list!`);
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

      const isAttachmentsEnabled = Boolean(challanSettings.enableAttachments || challanSettings.showAttachments);

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
        showChallanRefNo: (challanSettings.showChallanRefNo ?? challanSettings.showChallanNo) ? true : false,
        challanRefNo: (challanSettings.showChallanRefNo ?? challanSettings.showChallanNo) ? (challanNo.trim() || null) : null,
        challanNo: (challanSettings.showChallanRefNo ?? challanSettings.showChallanNo) ? (challanNo.trim() || null) : null,
        challan_no: (challanSettings.showChallanRefNo ?? challanSettings.showChallanNo) ? (challanNo.trim() || null) : null,
        challanDate: purchaseDate,
        challan_date: purchaseDate,
        vatChallan: challanSettings.showVatChallan ? (vatChallan.trim() || null) : null,
        vat_challan: challanSettings.showVatChallan ? (vatChallan.trim() || null) : null,
        vatChallanNo: challanSettings.showVatChallan ? (vatChallan.trim() || null) : null,
        vatChallanDate: challanSettings.showVatChallanDate ? (vatChallanDate || purchaseDate) : null,
        vat_challan_date: challanSettings.showVatChallanDate ? (vatChallanDate || purchaseDate) : null,
        vehicleNumber: (challanSettings.vehicleNumber ?? challanSettings.showVehicleNo) ? (vehicleNo.trim() || null) : null,
        vehicle_number: (challanSettings.vehicleNumber ?? challanSettings.showVehicleNo) ? (vehicleNo.trim() || null) : null,
        vehicleNo: (challanSettings.vehicleNumber ?? challanSettings.showVehicleNo) ? (vehicleNo.trim() || null) : null,
        vehicle_no: (challanSettings.vehicleNumber ?? challanSettings.showVehicleNo) ? (vehicleNo.trim() || null) : null,
        capacityCft: challanSettings.capacityCft ? (capacityCft.trim() || null) : null,
        capacity_cft: challanSettings.capacityCft ? (capacityCft.trim() || null) : null,
        driverName: (challanSettings.driverName ?? challanSettings.showDriverName) ? (driverName.trim() || null) : null,
        driver_name: (challanSettings.driverName ?? challanSettings.showDriverName) ? (driverName.trim() || null) : null,
        driverPhone: (challanSettings.driverPhone ?? challanSettings.showDriverPhone) ? (driverPhone.trim() || null) : null,
        driver_phone: (challanSettings.driverPhone ?? challanSettings.showDriverPhone) ? (driverPhone.trim() || null) : null,
        deliveryDate: purchaseDate,
        delivery_date: purchaseDate,
        transportCost: challanSettings.showTransportCost ? calculatedTransport : 0,
        transport_cost: challanSettings.showTransportCost ? calculatedTransport : 0,
        delivery_charge: challanSettings.showTransportCost ? calculatedTransport : 0,
        deliveryCharge: challanSettings.showTransportCost ? calculatedTransport : 0,
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
        remarks: (challanSettings.remarks ?? challanSettings.showNotes) ? (notes.trim() || null) : null,
        note: (challanSettings.remarks ?? challanSettings.showNotes) ? (notes.trim() || null) : null,
        attachments: isAttachmentsEnabled ? (attachment || null) : null,
        attachment: isAttachmentsEnabled ? (attachment || null) : null,
        attachmentUrl: isAttachmentsEnabled ? (attachment || null) : null,
        challanImage: isAttachmentsEnabled ? (attachment || null) : null,
        documentUrl: isAttachmentsEnabled ? (attachment || null) : null,
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
        details: purchaseDetailsPayload,
        purchasesDetails: purchaseDetailsPayload,
        purchase_details: purchaseDetailsPayload,
        items: purchaseDetailsPayload,
        itemCount: lineItems.length,
        totalItems: lineItems.length,
        itemsCount: lineItems.length,
        totalQty: lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      };

      const editId =
        effectiveEditData?.id ??
        effectiveEditData?.purchaseId ??
        effectiveEditData?.purchase_id ??
        stateEditData?.id ??
        stateEditData?.purchaseId ??
        routeId;

      if (isEditMode && editId) {
        purchasePayload.id = editId;
        purchasePayload.purchaseId = editId;
        purchasePayload.purchase_id = editId;
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
        id: res?.id || res?.purchaseId || res?.purchase_id || editId || invoiceNo,
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

      queryClient.invalidateQueries({ queryKey: [purchaseListQueryKey] });
      queryClient.invalidateQueries({ queryKey: [productListQueryKey] });

      // Always open Invoice Modal after save so user can view/print invoice
      setShouldAutoPrint(shouldPrint);
      setSavedPurchaseForPrint({
        ...purchasePayload,
        id: res?.id || invoiceNo,
      });
      setIsPrintModalOpen(true);
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
    setCashAmount("");
    setBankAmount("");
    setMfsAmount("");
    setCashGiven("");
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
    const code = businessCode || getBusinessCode() || buildAccessUser().businessCode || "1001";
    setInvoiceNo(makeInvoiceNo(code));
    setIsResetModalOpen(false);
    showDeleteToast("Purchase form reset successfully!");
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-[#F6F6F6] py-2 sm:py-2.5 -mt-2 sm:-mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-black flex items-center gap-2">
            <FaCalculator className="text-[var(--color-primary)]" size={18} />
            {isEditMode ? "Edit Purchase Invoice" : "Create New Purchase"}
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800   font-semibold">
            {invoiceNo || "INV"}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsChallanSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <FaSlidersH className="text-black" size={12} />
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
            onClick={() => handlePreSubmit(false)}
            color="#009fe3"
            hoverColor="#0085be"
            disabled={isSubmitting}
            icon={<FaCheck className="text-white text-xs" />}
          />
          <Button
            label="Save & Print"
            onClick={() => handlePreSubmit(true)}
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
            <label className="text-[11px] font-bold text-black uppercase tracking-wider">
              Supplier <span className="text-rose-500">*</span>
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
            onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
            className="flex items-center justify-between h-9 px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white cursor-pointer text-xs"
          >
            {selectedSupplier ? (
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="font-bold text-black truncate">
                  {selectedSupplier.name || selectedSupplier.partyName}
                </span>
                {(selectedSupplier.phone || selectedSupplier.partyPhone) && (
                  <span className="text-[11px] text-gray-700 shrink-0">
                    ({selectedSupplier.phone || selectedSupplier.partyPhone})
                  </span>
                )}
                {(selectedSupplier.address || selectedSupplier.partyAddress || selectedSupplier.city) && (
                  <span className="text-[11px] text-black truncate">
                    - {selectedSupplier.address || selectedSupplier.partyAddress || selectedSupplier.city}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-400">Select or search supplier...</span>
            )}
            <FiChevronDown className="text-gray-500 text-xs ml-1 shrink-0" size={14} />
          </div>

          {/* Supplier Dropdown Panel */}
          {isSupplierDropdownOpen && (
            <div className="absolute left-0 mt-1 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-20">
              <div className="relative mb-2">
                <FaSearch className="absolute left-2.5 top-2.5 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search supplier name, phone, address..."
                  value={supplierSearchQuery}
                  onChange={(e) => setSupplierSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-[var(--color-primary)] text-black"
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
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-black">{s.name || s.partyName}</span>
                          {(s.phone || s.partyPhone) && (
                            <span className="text-[11px] text-black">({s.phone || s.partyPhone})</span>
                          )}
                        </div>
                        {(s.address || s.partyAddress || s.city) && (
                          <span className="text-[10px] text-black truncate mt-0.5">
                            {s.address || s.partyAddress || s.city}
                          </span>
                        )}
                      </div>
                      {(s.balance || s.openingBalance || s.dueAmount) && (
                        <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0 ml-1">
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

        {/* Purchase Date */}
        <div>
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
            Purchase Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
          />
        </div>

        {/* Optional Challan Ref No */}
        {(challanSettings.showChallanRefNo ?? challanSettings.showChallanNo) && (
          <div>
            <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
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

        {/* PO Number (UI / Design Only) */}
        <div>
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
            PO Number
          </label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
            placeholder="e.g. PO-98234"
          />
        </div>

        {/* Optional VAT Challan No */}
        {challanSettings.showVatChallan && (
          <div>
            <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
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
            <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
              VAT Challan Date
            </label>
            <input
              type="date"
              value={vatChallanDate}
              onChange={(e) => setVatChallanDate(e.target.value)}
              className="w-full h-9 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] font-semibold text-black"
            />
          </div>
        )}

        {/* Optional Vehicle No */}
        {(challanSettings.vehicleNumber ?? challanSettings.showVehicleNo) && (
          <div>
            <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
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
            <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
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
            <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
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
            <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
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
      </div>

      {/* Product Live Search & Add Bar */}
      <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs relative" ref={productSearchRef}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search product name, code, or scan barcode to add..."
              value={productSearchQuery}
              onChange={(e) => {
                setProductSearchQuery(e.target.value);
                setIsProductDropdownOpen(true);
              }}
              onFocus={() => setIsProductDropdownOpen(true)}
              onKeyDown={handleKeyDownSearch}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#0F365C] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-gray-50/40 focus:bg-white font-medium text-black placeholder:text-gray-400 placeholder:text-xs h-9 transition-all"
            />
          </div>

          {/* Dynamic Button: Add Your Product (when 0) / Done (when >0) */}
          <button
            type="button"
            onClick={selectedProductCount > 0 ? handleDoneSelectProducts : () => setIsProductDropdownOpen(true)}
            className={`px-3.5 h-9 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
              selectedProductCount > 0
                ? "bg-[var(--color-primary)] text-white   ring-2 ring-[var(--color-primary)]/20"
                : "bg-[#0F365C] text-white border-gray-200"
            }`}
          >
            {selectedProductCount > 0 ? (
              <>
                <FaCheck size={11} />
                <span>Done ({selectedProductCount})</span>
              </>
            ) : (
              <>
                <FaPlus size={10} className="text-white" />
                <span>Add Your Product</span>
              </>
            )}
          </button>
        </div>

        {/* Product Search Results Dropdown */}
        {isProductDropdownOpen && (
          <div className="absolute left-2.5 right-2.5 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-20 divide-y divide-gray-100">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const prodKey = String(p.id ?? p.productId ?? p.pcode ?? p.productCode ?? "");
                const selectedEntry = selectedProductsMap[prodKey];
                const isSelected = Boolean(selectedEntry);
                const defaultBuyPrice = Number(p.buy_price ?? p.buyPrice ?? 0);
                const stock = Number(p.stock ?? p.quantity ?? 0);

                return (
                  <div
                    key={prodKey}
                    onClick={() => handleToggleSelectProduct(p)}
                    className={`p-2 sm:p-2.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors select-none ${
                      isSelected ? "bg-sky-50/90 border-l-4 border-l-[var(--color-primary)]" : "hover:bg-gray-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                            : "border-gray-300 bg-white hover:border-[var(--color-primary)]"
                        }`}
                      >
                        {isSelected && <FaCheck size={9} />}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className={`font-bold truncate ${isSelected ? "text-[var(--color-primary)]" : "text-black"}`}>
                          {p.name || p.productName}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Code: <span className="text-black font-medium">{p.pcode || p.productCode || "N/A"}</span> | Unit: <span className="text-black font-medium">{p.unit || "pcs"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Interactive inputs if selected, or read-only summary if not */}
                    {isSelected ? (
                      <div
                        className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Current Stock Badge */}
                        <span className="text-[11px] px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-gray-700 font-medium">
                          Stock: <span className="font-bold text-black">{stock}</span>
                        </span>

                        {/* Quantity Stepper Input */}
                        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white h-7 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => {
                              const q = Math.max(1, (Number(selectedEntry.quantity) || 1) - 1);
                              handleUpdateDropdownItem(prodKey, "quantity", String(q));
                            }}
                            className="px-2 bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs h-full flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={selectedEntry.quantity}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => handleUpdateDropdownItem(prodKey, "quantity", e.target.value)}
                            className="w-12 text-center font-bold text-xs text-black focus:outline-none h-full border-x border-gray-200"
                            title="Purchase Quantity"
                            placeholder="Qty"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const q = (Number(selectedEntry.quantity) || 0) + 1;
                              handleUpdateDropdownItem(prodKey, "quantity", String(q));
                            }}
                            className="px-2 bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs h-full flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Editable Buy Price Input */}
                        <div className="relative inline-block w-24">
                          <span className="absolute left-1.5 top-1.5 text-black font-bold text-[11px]">৳</span>
                          <input
                            type="number"
                            step="0.01"
                            value={selectedEntry.buyPrice}
                            placeholder="0.00"
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => handleUpdateDropdownItem(prodKey, "buyPrice", e.target.value)}
                            className="w-full pl-4 pr-1.5 py-1 text-xs border border-gray-300 rounded-md bg-white text-right font-bold text-black focus:outline-none focus:border-[var(--color-primary)] h-7 shadow-2xs"
                            title="Buy Price for this purchase"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          Stock: <span className="font-semibold">{stock}</span>
                        </span>
                        <span className="font-bold text-black text-right min-w-[70px]">
                          ৳ {formatMoney(defaultBuyPrice)}
                        </span>
                      </div>
                    )}
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
          <span className="text-[11px] text-black font-medium">
            Subtotal: <span className="  font-bold text-black">৳ {formatMoney(rawSubtotal)}</span>
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#41bef3] border-b border-gray-200 text-[11px] font-semibold text-black shadow-md">
                <th className="py-2 px-2 text-center w-8 whitespace-nowrap">SL</th>
                <th className="py-2 px-3 min-w-[170px]">Product</th>
                <th className="py-2 px-2 text-center w-14 whitespace-nowrap">Unit</th>
                <th className="py-2 px-2 text-center w-20 whitespace-nowrap">Stock</th>
                <th className="py-2 px-2 text-right w-28 min-w-[100px] whitespace-nowrap">Buy Price (৳)</th>
                <th className="py-2 px-2 text-center w-28 min-w-[110px] whitespace-nowrap">Quantity</th>
                <th className="py-2 px-2 text-right w-20 min-w-[70px] whitespace-nowrap">VAT (%)</th>
                <th className="py-2 px-3 text-right w-32 min-w-[120px] whitespace-nowrap">Total (৳)</th>
                <th className="py-2 px-2 text-center w-10 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.length > 0 ? (
                lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    {/* SL */}
                    <td className="py-2 px-2 text-center text-gray-700   text-[11px] whitespace-nowrap">
                      {idx + 1}
                    </td>

                    {/* Product Name & Code */}
                    <td className="py-2 px-3">
                      <span className="font-semibold text-black block">{item.productName}</span>
                      {item.productCode && (
                        <span className="text-[10px] text-black  ">Code: {item.productCode}</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="text-black font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                        {item.unit || "pcs"}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {Number(item.stock) || 0}
                      </span>
                    </td>

                    {/* Buy Price (Right Aligned Money Input, No Wheel/Spinners) */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <div className="relative inline-block w-full">
                        <span className="absolute left-1.5 top-1.5 text-black font-bold text-[11px]">৳</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.buyPrice}
                          placeholder="0.00"
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => handleUpdateLineItem(idx, "buyPrice", e.target.value)}
                          className="w-full pl-5 pr-1.5 py-1 text-xs border border-gray-300 rounded text-right   font-bold text-black focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    </td>

                    {/* Quantity (Stepper) */}
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
                          className="w-12 py-1 text-xs text-center   font-bold text-black focus:outline-none border-x border-gray-300"
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

                    {/* Line VAT % */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.01"
                        value={item.vat}
                        placeholder="0"
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => handleUpdateLineItem(idx, "vat", e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded text-right   font-bold text-black focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </td>

                    {/* Total (Right Aligned Display) */}
                    <td className="py-2 px-3 text-right font-bold text-black   whitespace-nowrap">
                      ৳ {formatMoney(item.total)}
                    </td>

                    {/* Delete Action */}
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
                  <td colSpan={9} className="py-8 text-center text-gray-400">
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
        <div className="lg:col-span-5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between gap-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-black uppercase tracking-wider">
              Discounts & Extra Charges
            </h3>

            {/* Overall Invoice Discount */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-black font-semibold">Overall Discount:</label>
                <div className="inline-flex rounded border border-gray-300 overflow-hidden text-[10px]">
                  <button
                    type="button"
                    onClick={() => setInvoiceDiscountType("FLAT")}
                    className={`px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                      invoiceDiscountType === "FLAT"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-gray-100 text-black hover:bg-gray-200"
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
                  value={invoiceDiscount}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setInvoiceDiscount(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-right   text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Invoice VAT % */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-black font-semibold">Invoice VAT (%):</label>
              <div className="relative w-32 sm:w-36">
                <input
                  type="number"
                  step="0.01"
                  value={invoiceVat}
                  placeholder="0"
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setInvoiceVat(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-right   text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Transport / Freight Charge */}
            {challanSettings.showTransportCost && (
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-black font-semibold">Transport (৳):</label>
                <div className="relative w-32 sm:w-36">
                  <span className="absolute left-2 top-1 text-black text-xs font-bold  ">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    value={transportCost}
                    placeholder="0.00"
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setTransportCost(e.target.value)}
                    className="w-full pl-5 pr-2 py-1 text-xs border border-gray-300 rounded text-right   text-black font-bold focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {challanSettings.showNotes && (
            <div className="mt-0.5">
              <label className="text-[10px] font-bold text-black uppercase tracking-wider block mb-0.5">
                Purchase Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special terms, batch notes, or delivery remarks..."
                className="w-full p-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[var(--color-primary)] resize-none text-black font-medium"
              />
            </div>
          )}

          {/* Challan / Invoice Document & Image Attachment */}
          {(challanSettings.enableAttachments || challanSettings.showAttachments) && (
            <div className="mt-1 pt-2 border-t border-gray-100">
              <label className="text-[10px] font-bold text-black uppercase tracking-wider block mb-1">
                Challan / Invoice Attachment (চালানের ছবি/ডকুমেন্ট)
              </label>
              <ImageUpload
                value={attachment}
                onChange={handleAttachmentChange}
              />
            </div>
          )}
        </div>

        {/* Right Column: Financial Totals & Clean Split Payment Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between gap-2">
          {/* Detailed Financial Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-50/80 p-2 rounded-lg border border-gray-200">
            <div>
              <span className="text-[10px] text-black uppercase font-bold block">Subtotal</span>
              <span className="text-xs font-bold   text-black block text-right">
                ৳ {formatMoney(rawSubtotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black uppercase font-bold block">Discount</span>
              <span className="text-xs font-bold   text-rose-600 block text-right">
                - ৳ {formatMoney(totalDiscount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-black uppercase font-bold block">VAT + Transport</span>
              <span className="text-xs font-bold   text-black block text-right">
                + ৳ {formatMoney(totalVat + calculatedTransport)}
              </span>
            </div>
            <div className="bg-sky-100/70 p-1 px-1.5 rounded text-right flex flex-col justify-center">
              <span className="text-[10px] text-sky-950 uppercase font-bold block">Grand Total</span>
              <span className="text-xs sm:text-sm font-extrabold   text-[var(--color-primary)] block">
                ৳ {formatMoney(grandTotal)}
              </span>
            </div>
          </div>

          {/* Payment Collected Section (Matching cash-boi_v2) */}
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <span className="text-[11px] font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
              <FaWallet size={12} className="text-black" />
              Payment Collected
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePayFullCash}
                className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Cash
              </button>
              <button
                type="button"
                onClick={handlePayFullBank}
                className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Bank
              </button>
              <button
                type="button"
                onClick={handlePayFullMfs}
                className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 text-purple-800 border border-purple-300 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                MFS
              </button>
              <button
                type="button"
                onClick={handlePayFullCredit}
                className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                Credit
              </button>
            </div>
          </div>

          {/* Payment Cards: Cash, Card, MFS */}
          <div className="flex flex-col gap-1.5">
            {/* 1. Cash Card */}
            <div
              className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                Number(cashAmount) > 0
                  ? "border-emerald-400 bg-emerald-50/20 shadow-2xs"
                  : "border-gray-200 bg-gray-50/50 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0">
                  <FaMoneyBillWave size={13} />
                </div>
                <span className="font-bold text-xs text-black tracking-wider">CASH</span>
              </div>

              <div
                className={`flex items-center h-7 rounded-md border bg-white overflow-hidden w-28 sm:w-36 shrink-0 transition-colors ${
                  Number(cashAmount) > 0
                    ? "border-emerald-500 ring-1 ring-emerald-500/50"
                    : "border-gray-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
                }`}
              >
                <span className="text-[11px] text-black font-bold px-2 bg-gray-50 h-full flex items-center border-r border-gray-200   select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cashAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full text-right px-1.5 text-xs   font-bold text-black outline-none bg-transparent placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Optional Change Tendered Toggle */}
            {numCash > 0 && (
              <div className="flex items-center justify-end gap-2 text-[10px] px-1 -mt-0.5">
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
              <div className="flex items-center justify-between gap-2 bg-emerald-50/60 px-2.5 py-1.5 rounded-lg border border-emerald-200 -mt-0.5">
                <span className="text-[11px] text-black font-semibold">Cash Tendered:</span>
                <div className="flex items-center gap-2">
                  <div className="relative w-28 sm:w-32">
                    <span className="absolute left-2 top-0.5 text-black text-xs font-bold  ">৳</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={cashGiven}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="w-full pl-5 pr-1.5 py-0.5 text-xs border border-gray-300 rounded text-right   font-bold text-black bg-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  {changeReturnAmount > 0 && (
                    <span className="text-[11px] text-black   font-bold">
                      Return: ৳{formatMoney(changeReturnAmount)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 2. Card / Bank Card */}
            <div
              className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                Number(bankAmount) > 0
                  ? "border-sky-400 bg-sky-50/20 shadow-2xs"
                  : "border-gray-200 bg-gray-50/50 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-1 sm:mr-2">
                <div className="w-7 h-7 rounded-md bg-sky-100/90 text-sky-700 flex items-center justify-center shrink-0">
                  <FaCreditCard size={13} />
                </div>
                <span className="font-bold text-xs text-black tracking-wider shrink-0">CARD</span>
                <select
                  value={selectedBankId}
                  onChange={(e) => handleSelectRegisteredBank(e.target.value)}
                  className="h-6.5 w-full max-w-[150px] sm:max-w-[220px] px-2 text-[11px] border border-gray-300 rounded-md bg-white text-black font-medium focus:outline-none focus:border-sky-500 cursor-pointer truncate"
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
                className={`flex items-center h-7 rounded-md border bg-white overflow-hidden w-28 sm:w-36 shrink-0 transition-colors ${
                  Number(bankAmount) > 0
                    ? "border-sky-500 ring-1 ring-sky-500/50"
                    : "border-gray-300 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500"
                }`}
              >
                <span className="text-[11px] text-black font-bold px-2 bg-gray-50 h-full flex items-center border-r border-gray-200   select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={bankAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setBankAmount(e.target.value)}
                  className="w-full text-right px-1.5 text-xs   font-bold text-black outline-none bg-transparent placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* 3. MFS Card */}
            <div
              className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                Number(mfsAmount) > 0
                  ? "border-amber-400 bg-amber-50/20 shadow-2xs"
                  : "border-gray-200 bg-gray-50/50 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-1 sm:mr-2">
                <div className="w-7 h-7 rounded-md bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0">
                  <FaWallet size={13} />
                </div>
                <span className="font-bold text-xs text-black tracking-wider shrink-0">MFS</span>
                <select
                  value={selectedMfsId}
                  onChange={(e) => handleSelectRegisteredMfs(e.target.value)}
                  className="h-6.5 w-full max-w-[150px] sm:max-w-[220px] px-2 text-[11px] border border-gray-300 rounded-md bg-white text-black font-medium focus:outline-none focus:border-amber-500 cursor-pointer truncate"
                >
                  <option value="" className="text-black">
                    {registeredMfsAccounts.length ? "Select MFS..." : "No MFS registered"}
                  </option>
                  {registeredMfsAccounts.map((m) => (
                    <option key={m.id || m.mfsId || m._id} value={m.id || m.mfsId || m._id} className="text-black">
                      {m.mfsName || m.name}
                      {m.method || m.mfsMethod || m.mobileNo
                        ? ` – ${m.method || m.mfsMethod || m.mobileNo}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={`flex items-center h-7 rounded-md border bg-white overflow-hidden w-28 sm:w-36 shrink-0 transition-colors ${
                  Number(mfsAmount) > 0
                    ? "border-amber-500 ring-1 ring-amber-500/50"
                    : "border-gray-300 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500"
                }`}
              >
                <span className="text-[11px] text-black font-bold px-2 bg-gray-50 h-full flex items-center border-r border-gray-200   select-none">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mfsAmount}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setMfsAmount(e.target.value)}
                  className="w-full text-right px-1.5 text-xs   font-bold text-black outline-none bg-transparent placeholder:text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Bottom Totals: Total Paid & Due Balance */}
          <div className="grid grid-cols-2 gap-2 border-t border-gray-200 pt-1.5 items-center">
            <div className="bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-black uppercase tracking-wide">
                Total Paid (৳)
              </span>
              <span className="text-xs sm:text-sm font-extrabold   text-emerald-800">
                ৳ {formatMoney(totalPaid)}
              </span>
            </div>

            <div
              className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-colors ${
                dueAmount > 0 ? "bg-rose-50/80 border-rose-200" : "bg-gray-50 border-gray-200"
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  dueAmount > 0 ? "text-rose-900" : "text-black"
                }`}
              >
                Due Balance (৳)
              </span>
              <span
                className={`text-xs sm:text-sm font-extrabold   ${
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
          setShouldAutoPrint(false);
          navigate("/admin/purchases");
        }}
        purchase={savedPurchaseForPrint}
        autoPrint={shouldAutoPrint}
      />

      {/* Delete Line Item Modal */}
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

      {/* Reset Form Modal */}
      <DeleteModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onDelete={handleConfirmReset}
        title="Reset Purchase Form"
        message="Are you sure you want to reset the form? All unsaved data and added products will be cleared."
      />

      {/* Save / Update Confirmation Modal */}
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
    </div>
  );
};

export default CreatePurchaseForm;
