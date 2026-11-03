import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FaSlidersH, FaCalculator } from "react-icons/fa";
import Button from "@/components/button/Button";
import DeleteModal from "@/components/modal/DeleteModal";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PartyModal from "@/pages/admin/people/parties/components/PartyModal";
import ChallanSettingsModal from "@/pages/admin/trade/purchases/components/ChallanSettingsModal";
import PurchaseInvoiceModal from "@/pages/admin/trade/purchases/components/PurchaseInvoiceModal";
import DatePicker from "@/components/common/DatePicker";
import TextInput from "@/components/form/TextInput";
import CurrencyInput from "@/components/form/CurrencyInput";
import ImageUpload from "@/components/image/ImageUpload";
import apiConfig from "@/config/api.json";
import {
  purchaseListQueryKey,
  productListQueryKey,
  partyListQueryKey,
  purchaseChallanSettingsQueryKey,
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
import TradeSettlementSummary from "@/components/trade/TradeSettlementSummary";
import TradeActionButtons from "@/components/trade/TradeActionButtons";
import TradeFormHeader from "@/components/trade/TradeFormHeader";
import TradeNotesInput from "@/components/trade/TradeNotesInput";
import { usePurchasesQuery } from "@/pages/admin/trade/purchases/hooks/usePurchaseQueries";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import { cashLeg, bankLeg, mfsLeg, type TradeTender } from "@/services/financial-ledger-service";
import type { PurchaseItem, ProductItem, PartyItem, PurchaseChallanSettings } from "@/types";
import { useTradeParties } from "@/hooks/useTradeParties";
import { useTradeProducts } from "@/hooks/useTradeProducts";
import { useTradeLineItems, type TradeLineItem } from "@/hooks/useTradeLineItems";

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
  showNotes: true,
  showTransportCost: true,
  enableAttachments: true,
  showAttachments: true,
};

const CreatePurchaseForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const queryClient = useQueryClient();
  const { postMutation, handleApiMutation } = useAPI();
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
  const [vatChallan, setVatChallan] = useState<string>("");
  const [vatChallanDate, setVatChallanDate] = useState<string>("");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [capacityCft, setCapacityCft] = useState<string>("");
  const [driverName, setDriverName] = useState<string>("");
  const [driverPhone, setDriverPhone] = useState<string>("");
  const [transportCost, setTransportCost] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [attachment, setAttachment] = useState<File | string | null>(null);

  // Invoice-level Financials
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>("");
  const [invoiceVat, setInvoiceVat] = useState<string>("");

  // Modals & Settings
  const [isChallanSettingsOpen, setIsChallanSettingsOpen] = useState<boolean>(false);
  const [challanSettings, setChallanSettings] = useState<PurchaseChallanSettings>(defaultChallanSettings);
  const [savedPurchaseForPrint, setSavedPurchaseForPrint] = useState<PurchaseItem | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [shouldAutoPrint, setShouldAutoPrint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState<boolean>(false);
  const [pendingSavePrint, setPendingSavePrint] = useState<boolean>(false);

  // 1. Fetch Products & Suppliers via shared trade hooks
  const { allProducts } = useTradeProducts();
  const { partyList: suppliersList } = useTradeParties("SUPPLIER");

  // 2. Line Items State & Operations
  const {
    lineItems,
    setLineItems,
    rawSubtotal,
    lineVatTotal,
    isProductAlreadyInList,
    handleToggleProductInList,
    handleAddProduct,
    handleUpdateLineItem,
    handleUpdatePrice,
    handleUpdateQuantity,
    handleRequestDelete,
    handleConfirmDelete,
    isDeleteModalOpen: isDeleteLineModalOpen,
    handleCloseDeleteModal,
    itemIndexToDelete,
  } = useTradeLineItems({
    mode: "purchase",
    allProducts,
  });

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
          showNotes: data.remarks ?? data.showNotes ?? true,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEditData, suppliersList, allProducts, routeId]);
  const productSearch = useTradeProductSearch({
    allProducts,
    mode: "purchase",
    onAddProduct: handleAddProduct,
    onToggleProduct: handleToggleProductInList,
  });

  const handleSelectSupplier = useCallback((supplier: PartyItem) => {
    setSelectedSupplier(supplier);
  }, []);

  const handleOpenPartyModal = useCallback(() => {
    setIsPartyModalOpen(true);
  }, []);

  // 3. Invoice-level Overall Discount (Fixed Amount)
  const calculatedInvoiceDiscount = Number(invoiceDiscount) || 0;

  // 4. Total Discount combined
  const totalDiscount = calculatedInvoiceDiscount;

  // 6. Invoice-level VAT (Fixed Amount)
  const calculatedInvoiceVat = Number(invoiceVat) || 0;

  // 7. Total VAT combined
  const totalVat = lineVatTotal + calculatedInvoiceVat;

  // 8. Transport / Freight
  const calculatedTransport = Number(transportCost) || 0;

  // 9. Grand Total
  const grandTotal = Math.max(0, Math.round((rawSubtotal - totalDiscount + totalVat + calculatedTransport) * 100) / 100);

  const payment = useTradePayment({
    grandTotal,
    registeredBankAccounts,
    registeredMfsAccounts,
  });

  const {
    bankAmount,
    mfsAmount,
    selectedBankId,
    selectedMfsId,
    numCash,
    numBank,
    numMfs,
    totalPaid,
    dueAmount,
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
    if (isSubmittingRef.current || isSubmitting) return;

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
    if (isSubmittingRef.current || isSubmitting) return;

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

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const accessUser = buildAccessUser();
      const insertUrl = apiConfig.purchase.insertPurchasesUrl;
      const updateUrl = apiConfig.purchase.updatePurchasesUrl;
      const targetUrl = isEditMode ? updateUrl : insertUrl;

      // Backend expects "CASH" (when any payment is made) or "CREDIT" (when 100% due)
      const paymentType = totalPaid > 0 ? "CASH" : "CREDIT";
      // Backend status is strictly "PAID" or "PENDING" in ALL CAPS
      const status = totalPaid >= grandTotal && grandTotal > 0 ? "PAID" : "PENDING";

      const purchaseDetailsPayload = lineItems.map((item) => {
        const p = Number(item.buyPrice) || 0;
        const q = Number(item.quantity) || 1;
        const v = Number(item.vat) || 0;
        const lineVat = Math.round((p * q * v) / 100 * 100) / 100;

        return {
          productId: String(item.productId || ""),
          productCode: String(item.productCode || ""),
          productName: item.productName || "",
          unit: item.unit || "pcs",
          quantity: q,
          buyPrice: p,
          discount: 0,
          total: Number(item.total),
          vat: lineVat,
          delivery_charge: 0,
          status: "PENDING",
          advenType: "PURCHASE",
        };
      });

      const supplierId = selectedSupplier.id ?? selectedSupplier.partyId ?? "";

      const purchasePayload: any = {
        accessUser,
        invoiceNo: invoiceNo.trim(),
        supplierId,
        supplierName: selectedSupplier.name || "",
        supplierPhone: selectedSupplier.phone || "",
        supplierAddress: selectedSupplier.address || "",
        purchaseDate,
        totalAmount: rawSubtotal,
        discount: totalDiscount,
        grandTotal,
        paidAmount: totalPaid,
        dueAmount,
        paymentType,
        status,
        note: notes.trim(),
        vat: totalVat,
        addedBy: accessUser.phone || "",
        osType: "WEB",
        delivery_charge: calculatedTransport,
        transportCost: calculatedTransport,
        challanNo: challanNo.trim() || null,
        challanRefNo: challanNo.trim() || null,
        challanDate: purchaseDate || null,
        vatChallan: vatChallan.trim() || null,
        vatChallanDate: vatChallanDate || null,
        vehicleNo: vehicleNo.trim() || null,
        vehicleNumber: vehicleNo.trim() || null,
        capacityCft: capacityCft.trim() || null,
        driverName: driverName.trim() || null,
        driverPhone: driverPhone.trim() || null,
        attachments: attachment || null,
      };

      const editId =
        effectiveEditData?.id ??
        effectiveEditData?.purchaseId ??
        stateEditData?.id ??
        stateEditData?.purchaseId ??
        routeId;

      if (isEditMode) {
        if (editId) {
          purchasePayload.id = editId;
          purchasePayload.purchaseId = editId;
        }
        purchasePayload.deliveryCharge = calculatedTransport;
        purchasePayload.details = purchaseDetailsPayload;
      } else {
        purchasePayload.purchaseDetails = purchaseDetailsPayload;
      }

      // Both insert and update operations in backend use JSON HTTP POST
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
              (b) => String(b.bankId ?? b.id) === String(selectedBankId)
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
      } else {
        // If save failed or duplicate invoice collided, generate a fresh invoice number in create mode
        if (!isEditMode && businessCode) {
          const fresh = makeInvoiceNo(businessCode);
          setInvoiceNo(fresh);
        }
      }
    } catch (err: any) {
      console.error("Save purchase exception:", err);
      showErrorToast(err?.message || "An error occurred while saving purchase");
      if (!isEditMode && businessCode) {
        setInvoiceNo(makeInvoiceNo(businessCode));
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
    setSelectedSupplier(null);
    setInvoiceDiscount("");
    setInvoiceVat("");
    setTransportCost("");
    resetPayment();
    setChallanNo("");
    setVatChallan("");
    setVatChallanDate("");
    setVehicleNo("");
    setCapacityCft("");
    setDriverName("");
    setDriverPhone("");
    setNotes("");
    setAttachment(null);
    if (businessCode) {
      setInvoiceNo(makeInvoiceNo(businessCode));
    } else {
      setInvoiceNo("");
    }
    setIsResetModalOpen(false);
    showDeleteToast("Purchase form reset successfully!");
  };

  const hasAnyChallanField = [
    challanSettings.showChallanRefNo,
    challanSettings.showVatChallan,
    challanSettings.showVatChallanDate,
    challanSettings.vehicleNumber,
    challanSettings.capacityCft,
    challanSettings.driverName,
    challanSettings.driverPhone,
  ].some(Boolean);

  return (
    <div className="flex flex-col gap-2 px-2 py-1.5 sm:px-3 sm:py-2 max-w-[1600px] mx-auto w-full">
      {/* Top Header Bar */}
      <TradeFormHeader
        title={isEditMode ? "Edit Purchase Invoice" : "Create New Purchase"}
        invoiceNo={invoiceNo}
        invoiceBadgeFallback="Draft"
        onReset={handleReset}
        onCancel={() => navigate("/admin/purchases")}
        extraActions={
          <button
            type="button"
            onClick={() => setIsChallanSettingsOpen(true)}
            className="ui-btn ui-btn-secondary h-[var(--ui-control-h-xs)] px-2.5 text-[length:var(--ui-font-size-xs)] font-normal flex items-center gap-1.5 cursor-pointer"
            title="Challan Settings"
          >
            <FaSlidersH size={12} />
            <span className="hidden sm:inline">Challan Settings</span>
          </button>
        }
      />

      {/* Workspace: entry flow on the left, pinned summary rail on the right */}
      <div className="grid grid-cols-1 items-start gap-2 xl:grid-cols-12">
        {/* ---------- Entry column (scrolls) ---------- */}
        <div className="flex flex-col gap-2 xl:col-span-8">
          {/* Supplier & invoice meta */}
          <div className="ui-card p-2 sm:p-2.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
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

              {/* Purchase Date */}
              <div>
                <label className="ui-label block mb-1">
                  Purchase Date <span className="text-[var(--ui-danger)]">*</span>
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
            </div>

            {/* Optional Challan fields (if enabled in settings) */}
            {hasAnyChallanField && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 mt-2.5">
                {/* Optional Challan Ref No */}
                {challanSettings.showChallanRefNo && (
                  <TextInput
                    label="Challan Ref No"
                    value={challanNo}
                    onChange={(val: any) => setChallanNo(typeof val === "string" ? val : val?.target?.value ?? "")}
                    placeholder="e.g. CH-98234"
                  />
                )}

                {/* Optional VAT Challan No */}
                {challanSettings.showVatChallan && (
                  <TextInput
                    label="VAT Challan No"
                    value={vatChallan}
                    onChange={(val: any) => setVatChallan(typeof val === "string" ? val : val?.target?.value ?? "")}
                    placeholder="e.g. VAT-98234"
                  />
                )}

                {/* Optional VAT Challan Date */}
                {challanSettings.showVatChallanDate && (
                  <div>
                    <label className="ui-label block mb-1">
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
                {challanSettings.vehicleNumber && (
                  <TextInput
                    label="Vehicle / Truck No"
                    value={vehicleNo}
                    onChange={(val: any) => setVehicleNo(typeof val === "string" ? val : val?.target?.value ?? "")}
                    placeholder="e.g. DHAKA-METRO-11-2233"
                  />
                )}

                {/* Optional Capacity (CFT) */}
                {challanSettings.capacityCft && (
                  <TextInput
                    label="Capacity (CFT)"
                    value={capacityCft}
                    onChange={(val: any) => setCapacityCft(typeof val === "string" ? val : val?.target?.value ?? "")}
                    placeholder="e.g. 500 CFT"
                  />
                )}

                {/* Optional Driver Name */}
                {challanSettings.driverName && (
                  <TextInput
                    label="Driver Name"
                    value={driverName}
                    onChange={(val: any) => setDriverName(typeof val === "string" ? val : val?.target?.value ?? "")}
                    placeholder="e.g. Rafiq Hossain"
                  />
                )}

                {/* Optional Driver Phone */}
                {challanSettings.driverPhone && (
                  <TextInput
                    label="Driver Phone"
                    value={driverPhone}
                    onChange={(val: any) => setDriverPhone(typeof val === "string" ? val : val?.target?.value ?? "")}
                    placeholder="017xxxxxxxx"
                  />
                )}
              </div>
            )}
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

          {/* Discounts, Extra Charges, Attachment & Remarks */}
          <div className="ui-card flex flex-col gap-2 p-2 sm:p-2.5">
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-[var(--ui-text)]">
                Discounts &amp; Extra Charges
              </h3>

              {/* Overall Invoice Discount (Fixed Amount) */}
              <CurrencyInput
                label="Overall Discount (৳):"
                value={invoiceDiscount}
                onChange={setInvoiceDiscount}
              />

              {/* Invoice VAT (Fixed Amount) */}
              <CurrencyInput
                label="Invoice VAT (৳):"
                value={invoiceVat}
                onChange={setInvoiceVat}
              />

              {/* Transport / Freight Charge */}
              {challanSettings.showTransportCost && (
                <CurrencyInput
                  label="Transport Cost (৳):"
                  value={transportCost}
                  onChange={setTransportCost}
                />
              )}
            </div>

            {/* Attachment & Notes Side by Side */}
            <div className="mt-1.5 pt-1.5 border-t border-[var(--ui-border)] flex flex-col sm:flex-row items-start gap-2">
              {(challanSettings.attachments ?? challanSettings.enableAttachments ?? true) && (
                <div className="shrink-0 flex flex-col">
                  <div className="h-5 flex items-center mb-1">
                    <span className="text-[11px] font-semibold text-[var(--ui-text)]">
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
              )}

              <TradeNotesInput
                value={notes}
                onChange={setNotes}
                mode="purchase"
                className="flex-1 min-w-0 w-full"
              />
            </div>
          </div>
        </div>

        {/* ---------- Summary rail (pinned on wide screens) ---------- */}
        <aside className="flex flex-col gap-2 xl:sticky xl:top-[3.5rem] xl:col-span-4">
          <div className="ui-card flex flex-col gap-2 p-2 sm:p-2.5">
            {/* Financial Ledger Summary */}
            <TradeLedgerSummary
              subtotal={rawSubtotal}
              discount={totalDiscount}
              extraLabel="VAT + Transport"
              extraAmount={totalVat + calculatedTransport}
              grandTotal={grandTotal}
            />

            {/* Unified Payment Section */}
            <TradePaymentSection
              grandTotal={grandTotal}
              payment={payment}
              registeredBankAccounts={registeredBankAccounts}
              registeredMfsAccounts={registeredMfsAccounts}
              title="Payment Disbursed"
              bankLabel="CARD"
              showCashTenderedToggle={true}
            />

            {/* Settlement summary: paid vs outstanding */}
            <TradeSettlementSummary
              showPartyInfo={false}
              totalPaid={totalPaid}
              grandTotal={grandTotal}
              dueAmount={dueAmount}
              paidLabel="Paid Amount"
              dueLabel="Outstanding"
            />
          </div>

          {/* Primary actions live with the totals they commit */}
          <TradeActionButtons
            isSubmitting={isSubmitting}
            isEditMode={isEditMode}
            saveLabel="Purchase"
            onSave={() => handlePreSubmit(false)}
            onSaveAndPrint={() => handlePreSubmit(true)}
          />
        </aside>
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
          onClose={handleCloseDeleteModal}
          onDelete={handleConfirmDelete}
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
          onClose={() => {
            if (!isSubmittingRef.current && !isSubmitting) {
              setIsSaveConfirmModalOpen(false);
            }
          }}
          onConfirm={async () => {
            if (isSubmittingRef.current || isSubmitting) return;
            setIsSaveConfirmModalOpen(false);
            await handleSubmit(pendingSavePrint);
          }}
          isLoading={isSubmitting}
          title={isEditMode ? "Update Purchase Invoice" : pendingSavePrint ? "Save & Print Purchase" : "Save Purchase Invoice"}
          message={`Are you sure you want to ${isEditMode ? "update" : "save"} this purchase invoice (${invoiceNo || "Invoice"})?`}
          confirmText={isEditMode ? "Yes, Update" : pendingSavePrint ? "Save & Print" : "Yes, Save"}
          confirmButtonColor={pendingSavePrint ? "bg-[var(--ui-success)] hover:bg-[var(--ui-success-dark)]" : "bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)]"}
        />
      )}
    </div>
  );
};

export default CreatePurchaseForm;
