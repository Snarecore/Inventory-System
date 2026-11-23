import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DeleteModal from "@/components/modal/DeleteModal";
import ConfirmModal from "@/components/modal/ConfirmModal";
import PartyModal from "@/pages/admin/people/parties/components/PartyModal";
import SaleInvoiceModal from "@/pages/admin/trade/sales/components/SaleInvoiceModal";
import DatePicker from "@/components/common/DatePicker";
import CurrencyInput from "@/components/form/CurrencyInput";
import { FormKeyboardNav } from "@/components/common/FormKeyboardNav";
import apiConfig from "@/config/api.json";
import {
  salesListQueryKey,
  productListQueryKey,
  partyListQueryKey,
  salesAndReturnQueryKey,
  customersDueQueryKey,
  customerInvoicesDueQueryKey,
  collectionReportQueryKey,
  cashBalanceQueryKey,
  bankInfoListQueryKey,
  mfsUserListQueryKey,
  dashboardQueryKey,
  financialTransactionQueryKey,
  financeDashboardQueryKey,
  productQueryKey,
} from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { getBusinessCode } from "@/utils/auth-storage";
import { makeInvoiceNo } from "@/utils/invoiceNo";
import { useAPI } from "@/hooks/useApi";
import { formatMoney } from "@/utils/formatters";
import { showErrorToast, showDeleteToast } from "@/utils/toast-utils";
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
import { useSalesQuery } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import { useFinancialLedger } from "@/hooks/useFinancialLedger";
import { useCustomerInvoicesDue } from "@/hooks/useCustomerInvoicesDue";
import { cashLeg, bankLeg, mfsLeg, type TradeTender } from "@/services/financial-ledger-service";
import { useTradeProducts } from "@/hooks/useTradeProducts";
import { useTradeParties } from "@/hooks/useTradeParties";
import { useTradeLineItems, type TradeLineItem } from "@/hooks/useTradeLineItems";
import { usePermission } from "@/hooks/usePermission";
import type { SaleItem, PartyItem } from "@/types";

type FormLineItem = TradeLineItem;

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const queryClient = useQueryClient();
  const { postMutation, handleApiMutation } = useAPI();
  const { recordTradeLedger } = useFinancialLedger();

  const stateEditData: SaleItem | undefined = (location.state as any)?.editData;
  const isEditMode = Boolean(routeId || stateEditData);
  const { canCreate, canUpdate } = usePermission();
  const hasPermission = isEditMode ? canUpdate("sales") : canCreate("sales");

  // Basic Information
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [salesDate, setSalesDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<PartyItem | null>(null);
  const [walkInName, setWalkInName] = useState<string>("");
  const [walkInPhone, setWalkInPhone] = useState<string>("");
  const [isPartyModalOpen, setIsPartyModalOpen] = useState<boolean>(false);

  // Live Previous Due fetched directly from backend
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
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState<boolean>(false);
  const [pendingSavePrint, setPendingSavePrint] = useState<boolean>(false);

  // 1. Fetch Customers & Products (Shared caches)
  const { partyList: customerList } = useTradeParties("CUSTOMER");
  const { allProducts } = useTradeProducts();

  // 2. Line Items State & Operations
  const {
    lineItems,
    setLineItems,
    rawSubtotal,
    isProductAlreadyInList,
    handleToggleProductInList,
    handleAddProduct,
    handleUpdateLineItem,
    handleUpdatePrice,
    handleUpdateQuantity,
    handleRequestDelete: handleRequestDeleteLineItem,
    handleConfirmDelete: handleConfirmDeleteLineItem,
    isDeleteModalOpen: isDeleteLineModalOpen,
    handleCloseDeleteModal,
    itemIndexToDelete,
  } = useTradeLineItems({
    mode: "sale",
    allProducts,
  });

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
              (pCode && String(prod.pcode || "").trim().toLowerCase() === pCode.toLowerCase())
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
            unit: item.unit || matchedProd?.unit || "pcs",
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

  // Financial Calculations
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

  const productSearch = useTradeProductSearch({
    allProducts,
    mode: "sale",
    onAddProduct: handleAddProduct,
    onToggleProduct: handleToggleProductInList,
  });

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



  // Pre-Submit validation & Modal Open
  const handlePreSubmit = (shouldPrint = false) => {
    if (isSubmittingRef.current || isSubmitting) return;
    if (!hasPermission) {
      showErrorToast(`You do not have permission to ${isEditMode ? "update" : "create"} sales!`);
      return;
    }
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

      const salesDetails = lineItems.map((item) => ({
        productId: String(item.productId || ""),
        productCode: String(item.productCode || ""),
        productName: item.productName || "",
        unit: item.unit || "pcs",
        quantity: Number(item.quantity) || 1,
        sellPrice: Number(item.sellPrice) || 0,
        discount: Number(item.discount) || 0,
        total: Number(item.total),
        status: "PENDING",
        advenType: "SALE",
        vat: Number(item.vat) || 0,
        delivery_charge: 0,
      }));

      const selectedMfsObj = numMfs > 0
        ? registeredMfsAccounts.find((m) => String(m.id) === String(selectedMfsId))
        : null;

      const selectedBankObj = numBank > 0
        ? registeredBankAccounts.find((b) => String(b.bankId ?? b.id) === String(selectedBankId))
        : null;

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
        note: notes.trim(),
        vat: totalVat,
        osType: "WEB",
        delivery_charge: calculatedDelivery,
        cashReceived: numCash,
        cardReceived: numBank,
        posName: null,
        mfsReceived: numMfs,
        mfsId: numMfs > 0 ? selectedMfsId : null,
        mfsName: numMfs > 0 ? (mfsName || null) : null,
        mfsPhone: numMfs > 0 ? (mfsPhone || null) : null,
        customerPaid: Number(cashGiven) || (numCash > 0 ? numCash : totalPaid),
        returnAmount: changeReturnAmount,
        bankId: numBank > 0 ? selectedBankId : null,
        bankName: numBank > 0 ? (bankName || null) : null,
        accountNo: numBank > 0 ? (accountNo || null) : null,
        bankAccountName: numBank > 0 ? (bankRef || null) : null,
        salesDetails,
        details: salesDetails,
      };

      const editId =
        effectiveEditData?.id ||
        (effectiveEditData as any)?.saleId ||
        stateEditData?.id ||
        (stateEditData as any)?.saleId ||
        routeId;

      const editOrderNo =
        effectiveEditData?.orderNo ||
        (stateEditData as any)?.orderNo ||
        (effectiveEditData as any)?.order_no;

      if (isEditMode) {
        if (editId) {
          payload.id = editId;
          payload.saleId = editId;
        }
        if (editOrderNo) {
          payload.orderNo = editOrderNo;
          payload.order_no = editOrderNo;
        }
        payload.orgId = accessUser.orgId;
        payload.branchId = accessUser.branchId;
        payload.invoice_no = invoiceNo.trim();
        payload.salesInvoiceNo = invoiceNo.trim();
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
          cashBalanceQueryKey,
          bankInfoListQueryKey,
          mfsUserListQueryKey,
          dashboardQueryKey,
        ],
        showSuccessMessage: true,
        showErrorMessage: true,
      });

      if (result?.success) {
        const res: any = (result.data as any)?.data !== undefined ? (result.data as any).data : result.data;
        const savedId = res?.id || res?.saleId || editId || invoiceNo;

        // Post financial transaction INCOME to update cash/bank balances ONLY for fresh sale creation.
        // In Edit mode, the backend updates the sale and recalibrates all balances and stock automatically.
        if (!isEditMode && totalPaid > 0) {
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

        // Invalidate all related caches actively so UI immediately displays fresh calculations from backend
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [salesListQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [productListQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [productQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [cashBalanceQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [bankInfoListQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [mfsUserListQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [dashboardQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [financeDashboardQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [financialTransactionQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [customersDueQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [customerInvoicesDueQueryKey], refetchType: "all" }),
          queryClient.invalidateQueries({ queryKey: [collectionReportQueryKey], refetchType: "all" }),
        ]);

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
    <FormKeyboardNav className="flex w-full flex-col gap-2 px-2 py-1.5 sm:px-3 sm:py-2">
      {/* Top Header Bar */}
      <TradeFormHeader
        title={isEditMode ? "Edit Sales Invoice" : "Create New Sale"}
        invoiceNo={invoiceNo}
        onReset={handleReset}
        onCancel={() => navigate("/admin/sales")}
      />

      {/* Workspace: entry flow on the left, pinned summary rail on the right.
          The rail keeps totals, payment and the save actions in view while the
          item list grows, so nothing critical falls below the fold. */}
      <div className="grid grid-cols-1 items-start gap-2 xl:grid-cols-12">
        {/* ---------- Entry column (scrolls) ---------- */}
        <div className="flex flex-col gap-2 xl:col-span-8">
      {/* Customer & invoice meta */}
      <div className="ui-card p-2 sm:p-2.5">
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
            {t("Invoice No")} <span className="text-[var(--ui-danger)]">*</span>
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
            {t("Sales Date")} <span className="text-[var(--ui-danger)]">*</span>
          </label>
          <DatePicker
            value={salesDate}
            onChange={(dateStr) => setSalesDate(dateStr || new Date().toISOString().substring(0, 10))}
            size="md"
            isClearable={false}
            displayFormat="DD MMM, YYYY"
            placeholder={t("Select sales date")}
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
              {t("Discounts & Extra Charges")}
            </h3>

            {/* Overall Invoice Discount (Fixed Amount) */}
            <CurrencyInput
              label={t("Overall Discount (৳):")}
              value={discountValue}
              onChange={setDiscountValue}
            />

            {/* Invoice VAT (Fixed Amount) */}
            <CurrencyInput
              label={t("Invoice VAT (৳):")}
              value={vatAmount}
              onChange={setVatAmount}
            />

            {/* Delivery Charge */}
            <CurrencyInput
              label={t("Delivery Charge (৳):")}
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
            bankLabel="CARD"
          />
          {/* Settlement summary: who, then paid vs outstanding */}
          <TradeSettlementSummary
            partyName={selectedCustomer?.name || selectedCustomer?.partyName}
            partyPhone={selectedCustomer?.phone || selectedCustomer?.phoneNumber}
            isWalkIn={isWalkIn}
            walkInName={walkInName}
            walkInPhone={walkInPhone}
            previousDue={customerApiId ? previousDue : null}
            totalPaid={totalPaid}
            grandTotal={grandTotal}
            dueAmount={dueAmount}
            changeReturnAmount={changeReturnAmount}
            dueLabel="Outstanding"
          />
        </div>

          {/* Primary actions live with the totals they commit */}
          <TradeActionButtons
            isSubmitting={isSubmitting}
            isEditMode={isEditMode}
            saveLabel="Sale"
            disabled={!hasPermission}
            onSave={() => handlePreSubmit(false)}
            onSaveAndPrint={() => handlePreSubmit(true)}
          />
        </aside>
      </div>

      {/* Save Confirm Modal */}
      {isSaveConfirmModalOpen && (
        <ConfirmModal
          isOpen={isSaveConfirmModalOpen}
          title={isEditMode ? t("Update Sale Invoice?") : t("Save Sale Invoice?")}
          message={`Are you sure you want to ${isEditMode ? "update" : "save"} this sale invoice with total amount ৳${formatMoney(grandTotal)}?`}
          confirmText={pendingSavePrint ? t("Save & Print") : t("Save Sale")}
          cancelText={t("Cancel")}
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
          onClose={handleCloseDeleteModal}
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
    </FormKeyboardNav>
  );
};

export default CreateSaleForm;
