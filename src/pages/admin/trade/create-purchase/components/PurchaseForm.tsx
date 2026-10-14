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
  FaTimes,
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
import { useAPI } from "@/hooks/useApi";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast, showDeleteToast } from "@/utils/toast-utils";
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
  const [isNotesDropdownOpen, setIsNotesDropdownOpen] = useState<boolean>(false);
  const notesDropdownRef = useRef<HTMLDivElement>(null);
  const [attachment, setAttachment] = useState<File | string | null>(null);

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
      if (notesDropdownRef.current && !notesDropdownRef.current.contains(e.target as Node)) {
        setIsNotesDropdownOpen(false);
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
      setInvoiceNo(data.invoiceNo || data.invoice_no || data.billNo || "");
      setPurchaseDate(data.purchaseDate || data.salesDate || data.date || new Date().toISOString().substring(0, 10));
      setChallanNo(data.challanRefNo || data.challan_ref_no || data.challanNo || data.challan_no || "");
      setVatChallan(data.vatChallan || data.vat_challan || data.vatChallanNo || "");
      setVatChallanDate(data.vatChallanDate || data.vat_challan_date || "");
      setVehicleNo(data.vehicleNumber || data.vehicle_number || data.vehicleNo || data.vehicle_no || data.truckNo || "");
      setCapacityCft(data.capacityCft || data.capacity_cft || "");
      setDriverName(data.driverName || data.driver_name || "");
      setDriverPhone(data.driverPhone || data.driver_phone || "");

      let rawAttach =
        data.attachments ??
        data.attachment ??
        data.image ??
        data.attachmentUrl ??
        data.file ??
        null;

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
              : (first?.url || first?.path || first?.image || null);
        }
      } else if (typeof rawAttach === "object" && rawAttach !== null) {
        cleanAttach = rawAttach.url || rawAttach.path || rawAttach.image || null;
      } else if (typeof rawAttach === "string" && rawAttach.trim() !== "" && rawAttach !== "null" && rawAttach !== "undefined") {
        cleanAttach = rawAttach.trim();
      }

      setAttachment(cleanAttach);

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
        (Array.isArray(data.details) && data.details.length > 0)
          ? data.details
          : (Array.isArray(data.purchaseDetails) && data.purchaseDetails.length > 0)
          ? data.purchaseDetails
          : (Array.isArray(data.purchasesDetails) && data.purchasesDetails.length > 0)
          ? data.purchasesDetails
          : (Array.isArray(data.purchase_details) && data.purchase_details.length > 0)
          ? data.purchase_details
          : (Array.isArray(data.items) && data.items.length > 0)
          ? data.items
          : (Array.isArray(data.purchaseListDetails) && data.purchaseListDetails.length > 0)
          ? data.purchaseListDetails
          : [];

      if (Array.isArray(rawDetails) && rawDetails.length > 0) {
        const seenProductKeys = new Set<string>();
        const loadedItems: FormLineItem[] = [];

        rawDetails.forEach((item: any) => {
          const pId = item.productId ?? item.product_id ?? item.id ?? item.prodId ?? "";
          const pCode = item.productCode || item.product_code || item.pcode || item.code || "";
          const pName = item.productName || item.product_name || item.name || item.title || "";
          const key = String(pId || pCode || pName || "").trim().toLowerCase();

          // Deduplicate: If product was already processed in this invoice, skip duplicate without summing
          if (key && seenProductKeys.has(key)) {
            return;
          }

          if (key) seenProductKeys.add(key);

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
            item.total !== undefined && item.total !== null && !isNaN(Number(item.total)) && Number(item.total) > 0
              ? Number(item.total)
              : item.subtotal !== undefined && item.subtotal !== null && !isNaN(Number(item.subtotal)) && Number(item.subtotal) > 0
              ? Number(item.subtotal)
              : item.total_price !== undefined && item.total_price !== null && !isNaN(Number(item.total_price)) && Number(item.total_price) > 0
              ? Number(item.total_price)
              : item.totalAmount !== undefined && item.totalAmount !== null && !isNaN(Number(item.totalAmount)) && Number(item.totalAmount) > 0
              ? Number(item.totalAmount)
              : Number(buyP) * Number(q);

          // Match with allProducts to get current stock and fallback name/code
          const matchedProd = allProducts.find((p) => {
            const pIdStr = String(pId ?? "").trim().toLowerCase();
            const pCodeStr = String(pCode ?? "").trim().toLowerCase();
            const pNameStr = String(item.productName || item.product_name || item.name || "").trim().toLowerCase();

            const idMatch = Boolean(pIdStr && (String(p.id ?? "").toLowerCase() === pIdStr || String(p.productId ?? "").toLowerCase() === pIdStr || String((p as any).product_id ?? "").toLowerCase() === pIdStr));
            const codeMatch = Boolean(pCodeStr && (String(p.pcode || p.productCode || (p as any).code || "").trim().toLowerCase() === pCodeStr));
            const nameMatch = Boolean(pNameStr && (String(p.name || p.productName || "").trim().toLowerCase() === pNameStr));

            return idMatch || codeMatch || nameMatch;
          });

          const currentLiveStock = matchedProd
            ? Number(matchedProd.quantity ?? matchedProd.stock ?? (matchedProd as any).stockQuantity ?? (matchedProd as any).currentStock ?? (matchedProd as any).current_stock ?? (matchedProd as any).totalQuantity ?? (matchedProd as any).qty ?? 0)
            : Number(item.stock ?? 0);

          const detailId = item.id ?? item.purchaseDetailId ?? item.purchase_detail_id ?? item.detailId ?? item.detail_id;

          loadedItems.push({
            id: detailId,
            purchaseDetailId: detailId,
            purchase_detail_id: detailId,
            productId: pId || (matchedProd?.id ?? matchedProd?.productId ?? (matchedProd as any)?.product_id ?? ""),
            productCode: pCode || matchedProd?.pcode || matchedProd?.productCode || (matchedProd as any)?.code || "",
            productName: item.productName || item.product_name || item.name || item.title || matchedProd?.name || matchedProd?.productName || "Product",
            unit: item.unit || item.unitName || matchedProd?.unit || "pcs",
            buyPrice: String(buyP),
            quantity: String(q),
            vat: v ? String(v) : "",
            total: Number(tot),
            stock: currentLiveStock,
          });
        });

        setLineItems(loadedItems);
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
            const pIdStr = String(item.productId ?? "").trim().toLowerCase();
            const pCodeStr = String(item.productCode ?? "").trim().toLowerCase();
            const pNameStr = String(item.productName ?? "").trim().toLowerCase();

            const idMatch = Boolean(pIdStr && (String(p.id ?? "").toLowerCase() === pIdStr || String(p.productId ?? "").toLowerCase() === pIdStr || String((p as any).product_id ?? "").toLowerCase() === pIdStr));
            const codeMatch = Boolean(pCodeStr && (String(p.pcode || p.productCode || (p as any).code || "").trim().toLowerCase() === pCodeStr));
            const nameMatch = Boolean(pNameStr && (String(p.name || p.productName || "").trim().toLowerCase() === pNameStr));

            return idMatch || codeMatch || nameMatch;
          });

          if (matchedProd) {
            const liveStock = Number(matchedProd.quantity ?? matchedProd.stock ?? (matchedProd as any).stockQuantity ?? (matchedProd as any).currentStock ?? (matchedProd as any).current_stock ?? 0);
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

  // Filtered Products for Search Dropdown (Instant O(N) in-memory filter)
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

  // Filtered Suppliers for Supplier Dropdown (Instant O(N) in-memory filter)
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

  // Helper to check if a product is already added in the purchase line items list
  const isProductAlreadyInList = (product: ProductItem) => {
    const pId = product.id ?? product.productId;
    const pCode = product.pcode || product.productCode;

    return lineItems.some((item) => {
      if (pId !== undefined && pId !== null && pId !== "" && item.productId !== undefined && item.productId !== null && item.productId !== "") {
        if (String(item.productId) === String(pId)) return true;
      }
      if (pCode && item.productCode) {
        if (String(item.productCode).trim().toLowerCase() === String(pCode).trim().toLowerCase()) return true;
      }
      return false;
    });
  };

  // Toggle adding or removing a product from line items directly
  const handleToggleProductInList = (product: ProductItem) => {
    const pId = product.id ?? product.productId ?? "";
    const pCode = product.pcode || product.productCode || "";
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
      const prodName = product.name || product.productName || "Product";
      const prodUnit = product.unit || "pcs";
      const buyPrice = Number(product.buy_price ?? product.buyPrice ?? 0);
      const currentStock = Number(product.stock ?? product.quantity ?? 0);

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
        const name = (p.name || p.productName || "").toLowerCase();
        const code = (p.pcode || p.productCode || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        return name.includes(q) || code.includes(q) || barcode.includes(q) || sku.includes(q);
      });
      if (immediateMatches.length === 1) {
        handleToggleProductInList(immediateMatches[0]);
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
        handleSelectRegisteredBank(bId);
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
        handleSelectRegisteredMfs(mId);
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
    setCashAmount("0");
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
      if (bankAmount) {
        setBankAmount("");
        const remCash = Math.max(0, grandTotal - (Number(mfsAmount) || 0));
        setCashAmount(remCash > 0 ? String(remCash) : "");
      }
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
      if (mfsAmount) {
        setMfsAmount("");
        const remCash = Math.max(0, grandTotal - (Number(bankAmount) || 0));
        setCashAmount(remCash > 0 ? String(remCash) : "");
      }
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
      const insertUrl = apiConfig.purchase?.insertPurchasesUrl || "insert-purchases";
      const updateUrl = apiConfig.purchase?.updatePurchasesUrl || "update-purchases";
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
        orgId: accessUser.orgId,
        branchId: accessUser.branchId,
        invoiceNo: invoiceNo.trim(),
        invoice_no: invoiceNo.trim(),
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
        remarks: notes.trim() || null,
        note: notes.trim() || null,
        attachments: attachment || null,
        createdAt: isEditMode ? (effectiveEditData?.createdAt || effectiveEditData?.created_at || new Date().toISOString()) : new Date().toISOString(),
        created_at: isEditMode ? (effectiveEditData?.createdAt || effectiveEditData?.created_at || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        operation: isEditMode ? "update" : "insert",
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
        details: purchaseDetailsPayload,
        purchaseDetails: purchaseDetailsPayload,
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
        purchasePayload.purchase_no = editId;
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
        const savedId = res?.id || res?.purchaseId || res?.purchase_id || editId || invoiceNo;

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
        <div className="relative" ref={supplierRef}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-black tracking-wider">
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
            <div className="absolute left-0 right-0 sm:right-auto sm:w-96 max-w-[calc(100vw-32px)] mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-30">
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
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--primary-color)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 bg-gray-50/40 focus:bg-white font-medium text-black placeholder:text-gray-400 placeholder:text-xs h-9 transition-all"
            />
          </div>

          {/* Dynamic Button: Cancel (when open) / Add Your Product (when closed) */}
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
              <span className="hidden sm:inline">Add Your Product</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {/* Product Search Results Dropdown */}
        {isProductDropdownOpen && (
          <div className="absolute left-2.5 right-2.5 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-72 overflow-y-auto z-20 divide-y divide-gray-100">
            {/* Helpful Quick Guide Header Bar */}
            <div className="px-3 py-1.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
              <span>Select Product</span>
              <div className="flex items-center gap-6 pr-2">
                <span>Stock</span>
                <span>Buy Rate</span>
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const prodKey = String(p.id ?? p.productId ?? p.pcode ?? p.productCode ?? "");
                const isAlreadyInList = isProductAlreadyInList(p);
                const defaultBuyPrice = Number(p.buy_price ?? p.buyPrice ?? 0);
                const stock = Number(p.stock ?? p.quantity ?? 0);
                const existingLineIdx = lineItems.findIndex(
                  (item) =>
                    (p.id && item.productId && String(item.productId) === String(p.id)) ||
                    (p.pcode && item.productCode && String(item.productCode).trim().toLowerCase() === String(p.pcode).trim().toLowerCase()) ||
                    (p.productCode && item.productCode && String(item.productCode).trim().toLowerCase() === String(p.productCode).trim().toLowerCase())
                );

                return (
                  <div
                    key={prodKey}
                    onClick={() => handleToggleProductInList(p)}
                    className={`p-2 sm:p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors select-none cursor-pointer ${
                      isAlreadyInList
                        ? "bg-sky-50/70 hover:bg-sky-100/70 border-l-4 border-l-[var(--color-primary)]"
                        : "hover:bg-gray-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                          isAlreadyInList
                            ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                            : "border-gray-300 bg-white hover:border-[var(--color-primary)]"
                        }`}
                        title={isAlreadyInList ? "Click to remove from list" : "Click to add to list"}
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
                              Added in list
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500">
                          Code: <span className="text-black font-medium">{p.pcode || p.productCode || "N/A"}</span> | Unit: <span className="text-black font-medium">{p.unit || "pcs"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Stock & Buy Price Badges - Clean Single Line (1-Line) */}
                    <div
                      className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-center"
                      onClick={(e) => {
                        // Prevent row toggle if clicking interactive elements
                        if (isAlreadyInList) e.stopPropagation();
                      }}
                    >
                      {/* Current Stock (1 line) */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                          Stock:
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {stock} <span className="text-[10px] font-normal text-gray-600">{p.unit || "pcs"}</span>
                        </span>
                      </div>

                      {/* Buy Rate & Purchase Qty (1 line - editable when added in list) */}
                      {isAlreadyInList && existingLineIdx !== -1 ? (
                        <div className="flex items-center gap-2">
                          {/* Editable Purchase Qty */}
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-300 shadow-2xs">
                            <span className="text-[10px] font-bold text-sky-800">
                              Qty:
                            </span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={lineItems[existingLineIdx].quantity}
                              placeholder="1"
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => {
                                handleUpdateLineItem(existingLineIdx, "quantity", e.target.value);
                              }}
                              className="w-12 sm:w-14 px-1 py-0.5 text-xs font-bold text-sky-950 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 text-center"
                              title="Edit Purchase Quantity"
                            />
                            <span className="text-[10px] text-sky-700 font-medium">
                              {p.unit || "pcs"}
                            </span>
                          </div>

                          {/* Editable Buy Rate */}
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 shadow-2xs">
                            <span className="text-[10px] font-bold text-amber-800">
                              Rate: ৳
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={lineItems[existingLineIdx].buyPrice}
                              placeholder="0"
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => {
                                handleUpdateLineItem(existingLineIdx, "buyPrice", e.target.value);
                              }}
                              className="w-16 sm:w-20 px-1 py-0.5 text-xs font-bold text-amber-950 bg-white border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 text-right"
                              title="Edit Buy Price for purchase"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200">
                          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                            Buy Rate:
                          </span>
                          <span className="text-xs font-bold text-amber-950">
                            ৳ {formatMoney(defaultBuyPrice)}
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

      {/* Dynamic Line Items Table (Dense, Right-Aligned Money Inputs, No Spinners) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-2.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-black tracking-wider">
            Purchase Items List ({lineItems.length})
          </h2>
          <span className="text-[11px] text-black font-medium">
            Subtotal: <span className="  font-bold text-black">৳ {formatMoney(rawSubtotal)}</span>
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
                <th className="py-2 px-2 text-right w-28 min-w-[100px] whitespace-nowrap">Buy Price (৳)</th>
                <th className="py-2 px-2 text-center w-28 min-w-[110px] whitespace-nowrap">Quantity</th>
                <th className="py-2 px-3 text-right w-28 min-w-[100px] whitespace-nowrap">Total (৳)</th>
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
                          placeholder="0"
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

                    {/* Total (Right Aligned Display) */}
                    <td className="py-2 px-3 text-right font-bold text-black whitespace-nowrap">
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

          {/* Payment Collected Section */}
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-bold text-black tracking-wider flex items-center gap-1.5">
              <FaWallet size={11} className="text-black" />
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

          {/* Payment Cards: Cash, Card, MFS */}
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
                className={`flex items-center h-6.5 rounded border bg-white overflow-hidden w-26 xs:w-30 sm:w-34 shrink-0 transition-colors shadow-2xs ${
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

            {/* Optional Change Tendered Toggle */}
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
                  <div className="relative w-26 xs:w-30 sm:w-32">
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
                <span className="font-bold text-[11px] text-gray-800 tracking-wider shrink-0">CARD</span>
                <select
                  value={selectedBankId}
                  onChange={(e) => handleSelectRegisteredBank(e.target.value)}
                  className="h-6.5 w-full max-w-[115px] xs:max-w-[155px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-300 rounded bg-white text-black font-medium focus:outline-none focus:border-sky-500 cursor-pointer truncate"
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
                onClick={() => {
                  if (!selectedBankId) {
                    showErrorToast("Please select a bank first");
                  }
                }}
                className={`flex items-center h-6.5 rounded border overflow-hidden w-26 xs:w-30 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                  !selectedBankId
                    ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                    : Number(bankAmount) > 0
                    ? "border-sky-500 bg-white ring-1 ring-sky-500/50"
                    : "border-gray-300 bg-white focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500"
                }`}
              >
                <span
                  className={`text-[11px] font-bold px-1.5 h-full flex items-center border-r border-gray-200 select-none ${
                    !selectedBankId ? "text-gray-400 bg-gray-100" : "text-gray-600 bg-gray-50"
                  }`}
                >
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
                  className={`w-full text-right px-1.5 text-xs font-bold outline-none bg-transparent h-full ${
                    !selectedBankId
                      ? "text-gray-400 cursor-not-allowed placeholder:text-gray-300"
                      : "text-black placeholder:text-gray-400"
                  }`}
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
                  onChange={(e) => handleSelectRegisteredMfs(e.target.value)}
                  className="h-6.5 w-full max-w-[115px] xs:max-w-[155px] sm:max-w-[215px] px-1.5 text-[11px] border border-gray-300 rounded bg-white text-black font-medium focus:outline-none focus:border-purple-500 cursor-pointer truncate"
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
                onClick={() => {
                  if (!selectedMfsId) {
                    showErrorToast("Please select an MFS provider first");
                  }
                }}
                className={`flex items-center h-6.5 rounded border overflow-hidden w-26 xs:w-30 sm:w-34 shrink-0 transition-colors shadow-2xs ${
                  !selectedMfsId
                    ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                    : Number(mfsAmount) > 0
                    ? "border-purple-500 bg-white ring-1 ring-purple-500/50"
                    : "border-gray-300 bg-white focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500"
                }`}
              >
                <span
                  className={`text-[11px] font-bold px-1.5 h-full flex items-center border-r border-gray-200 select-none ${
                    !selectedMfsId ? "text-gray-400 bg-gray-100" : "text-gray-600 bg-gray-50"
                  }`}
                >
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
                  className={`w-full text-right px-1.5 text-xs font-bold outline-none bg-transparent h-full ${
                    !selectedMfsId
                      ? "text-gray-400 cursor-not-allowed placeholder:text-gray-300"
                      : "text-black placeholder:text-gray-400"
                  }`}
                />
              </div>
            </div>
          </div>

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
