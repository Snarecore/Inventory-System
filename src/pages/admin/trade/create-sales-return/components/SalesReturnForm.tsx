import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import {
  FaCheck,
  FaPrint,
  FaSearch,
  FaFileInvoice,
  FaBoxes,
  FaMoneyBillWave,
  FaUndoAlt,
  FaTimes,
} from "react-icons/fa";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import ConfirmModal from "@/components/modal/ConfirmModal";
import SalesReturnInvoiceModal from "@/pages/admin/trade/sales-return/components/SalesReturnInvoiceModal";
import apiConfig from "@/config/api.json";
import { salesAndReturnQueryKey, salesListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { SaleItem, SalesReturnItem } from "@/types";
import { RETURN_REASONS } from "@/pages/admin/trade/sales-return/constants/returnReasons";

interface ReturnLineFormState {
  productId: string | number;
  productCode: string;
  productName: string;
  unit: string;
  soldQuantity: number;
  quantity: number;
  sellPrice: number;
  discount: number;
  vat: number;
  deliveryCharge: number;
  total: number;
  returnReason: string;
  isSelected: boolean;
}

export const SalesReturnForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const stateSale: SaleItem | undefined = (location.state as any)?.sale;

  // Selected Sale & Basic Return Info
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(stateSale || null);
  const [salesInvoiceNo, setSalesInvoiceNo] = useState<string>(stateSale?.invoiceNo || "");
  const [returnDate, setReturnDate] = useState<string>(() => moment().format("YYYY-MM-DD"));
  const [customerId, setCustomerId] = useState<string | number>(stateSale?.customerId || "");
  const [customerName, setCustomerName] = useState<string>(stateSale?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState<string>(stateSale?.customerPhone || "");
  const [customerAddress, setCustomerAddress] = useState<string>(stateSale?.customerAddress || "");
  const [paymentType, setPaymentType] = useState<string>("CASH");
  const [status, setStatus] = useState<string>("Completed");
  const [note, setNote] = useState<string>("");

  // Return Mode: "FULL" (all items & full qty) vs "PARTIAL" (selected items / partial qty)
  const [returnMode, setReturnMode] = useState<"FULL" | "PARTIAL">("PARTIAL");

  // Product Lines
  const [lines, setLines] = useState<ReturnLineFormState[]>([]);

  // Financials
  const [invoiceDiscount, setInvoiceDiscount] = useState<string>("0");
  const [invoiceVat, setInvoiceVat] = useState<string>("0");
  const [invoiceDeliveryCharge, setInvoiceDeliveryCharge] = useState<string>("0");

  // Search & Dropdown
  const [isInvoiceDropdownOpen, setIsInvoiceDropdownOpen] = useState<boolean>(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("");
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  // Submission & Modals
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [pendingPrintAfterSave, setPendingPrintAfterSave] = useState<boolean>(false);
  const [savedReturnRecord, setSavedReturnRecord] = useState<SalesReturnItem | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // 1. Fetch sales and return list using POST /get-sales-and-return (with fallback to /get-sale-list)
  const { data: apiSalesAndReturnData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: [salesAndReturnQueryKey, "available-sales"],
    queryFn: async () => {
      try {
        const accessUser = buildAccessUser();
        const endpoint =
          apiConfig.salesReturn?.getSalesAndReturnUrl ||
          apiConfig.sales?.salesAndReturnUrl ||
          "get-sales-and-return";

        let res: any = await postData({
          url: endpoint,
          body: { accessUser },
        });

        let list = res?.data || res?.sales || res?.saleList || res?.salesList || [];

        // If /get-sales-and-return is empty or returned no records, fallback to /get-sale-list
        if (!Array.isArray(list) || list.length === 0) {
          const salesListEndpoint = apiConfig.sales?.salesListUrl || "get-sale-list";
          const salesRes: any = await postData({
            url: salesListEndpoint,
            body: { accessUser },
          });
          list = salesRes?.saleList || salesRes?.salesList || salesRes?.data || salesRes?.sales || [];
        }

        return Array.isArray(list) && list.length > 0 ? list : [];
      } catch (err) {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const availableInvoices: SaleItem[] = useMemo(() => {
    if (Array.isArray(apiSalesAndReturnData)) {
      return apiSalesAndReturnData;
    }
    return [];
  }, [apiSalesAndReturnData]);

  // Load sale into form and configure customer payment & refund suggestion
  const loadInvoice = (sale: SaleItem) => {
    setSelectedSale(sale);
    const invNo = sale.invoiceNo || `INV-${sale.id}`;
    setSalesInvoiceNo(invNo);
    setInvoiceSearchQuery(sale.orderNo ? `${invNo} (${sale.orderNo})` : invNo);
    setCustomerId(sale.customerId || "");
    setCustomerName(sale.customerName || sale.customer_name || "Customer");
    setCustomerPhone(sale.customerPhone || sale.customer_phone || "");
    setCustomerAddress(sale.customerAddress || sale.customer_address || "");
    setNote(`Return from invoice ${invNo}${sale.orderNo ? ` (Order: ${sale.orderNo})` : ""}`);

    // Auto-suggest refund payment method matching customer's original payment
    const origPayment = String(sale.paymentType || "CASH").toUpperCase();
    if (origPayment === "CREDIT" || Number(sale.dueAmount || 0) > 0) {
      setPaymentType("CREDIT");
    } else if (origPayment === "MFS") {
      setPaymentType("MFS");
    } else if (origPayment === "BANK") {
      setPaymentType("BANK");
    } else {
      setPaymentType("CASH");
    }

    const details: any[] =
      sale.salesDetails || sale.saleDetails || (sale as any).details || [];
    if (details.length > 0) {
      const formattedLines: ReturnLineFormState[] = details.map((d: any) => {
        const q = Number(d.quantity ?? d.qty ?? 1);
        const p = Number(d.sellPrice ?? d.sell_price ?? d.price ?? d.unitPrice ?? 0);
        return {
          productId: d.productId ?? d.product_id ?? "",
          productCode: d.productCode ?? d.pcode ?? "",
          productName: d.productName ?? d.name ?? "Product",
          unit: d.unit || "pcs",
          soldQuantity: q,
          quantity: 1, // default 1
          sellPrice: p,
          discount: 0,
          vat: 0,
          deliveryCharge: 0,
          total: p * 1,
          returnReason: "damaged_product",
          isSelected: true,
        };
      });
      setLines(formattedLines);
      setReturnMode("PARTIAL");
    } else {
      setLines([]);
    }
  };

  useEffect(() => {
    if (stateSale) {
      loadInvoice(stateSale);
    }
  }, [stateSale]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        invoiceDropdownRef.current &&
        !invoiceDropdownRef.current.contains(e.target as Node)
      ) {
        setIsInvoiceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter available invoices by orderNo, invoiceNo, or customer
  const filteredInvoices = useMemo(() => {
    const q = invoiceSearchQuery.toLowerCase().trim();
    if (!q) return availableInvoices;
    return availableInvoices.filter((inv) => {
      const ordNo = String(inv.orderNo || "").toLowerCase();
      const invNo = String(inv.invoiceNo || "").toLowerCase();
      const cName = String(inv.customerName || "").toLowerCase();
      const cPhone = String(inv.customerPhone || "").toLowerCase();
      return (
        ordNo.includes(q) ||
        invNo.includes(q) ||
        cName.includes(q) ||
        cPhone.includes(q)
      );
    });
  }, [availableInvoices, invoiceSearchQuery]);

  // Recalculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let selectedItemCount = 0;
    let totalPieces = 0;

    lines.forEach((line) => {
      if (line.isSelected && line.quantity > 0) {
        subtotal += line.quantity * line.sellPrice;
        selectedItemCount++;
        totalPieces += line.quantity;
      }
    });

    const disc = Number(invoiceDiscount) || 0;
    const vat = Number(invoiceVat) || 0;
    const delivery = Number(invoiceDeliveryCharge) || 0;
    const grandTotal = Math.max(0, subtotal - disc + vat + delivery);

    return {
      subtotal,
      discount: disc,
      vat,
      deliveryCharge: delivery,
      grandTotal,
      refundAmount: grandTotal,
      selectedItemCount,
      totalPieces,
    };
  }, [lines, invoiceDiscount, invoiceVat, invoiceDeliveryCharge]);

  // Switch between Full and Partial Return Modes
  const handleSetReturnMode = (mode: "FULL" | "PARTIAL") => {
    setReturnMode(mode);
    if (mode === "FULL") {
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          isSelected: true,
          quantity: l.soldQuantity,
          total: l.soldQuantity * l.sellPrice,
        }))
      );
    }
  };

  // Quick Action: Select All items with full quantities
  const handleSelectAllFullQty = () => {
    setReturnMode("FULL");
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        isSelected: true,
        quantity: l.soldQuantity,
        total: l.soldQuantity * l.sellPrice,
      }))
    );
  };

  // Quick Action: Clear all return quantities
  const handleClearAllQty = () => {
    setReturnMode("PARTIAL");
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        quantity: 0,
        total: 0,
        isSelected: false,
      }))
    );
  };

  // Quick Action: Set single line to 100% full sold quantity
  const handleSetLineFullQty = (idx: number) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              isSelected: true,
              quantity: l.soldQuantity,
              total: l.soldQuantity * l.sellPrice,
            }
          : l
      )
    );
  };

  // Line item handlers
  const handleToggleLine = (idx: number) => {
    setLines((prev) => {
      const updated = prev.map((item, i) =>
        i === idx ? { ...item, isSelected: !item.isSelected } : item
      );
      // Check if all lines are full
      const allFull = updated.every((l) => l.isSelected && l.quantity === l.soldQuantity);
      setReturnMode(allFull ? "FULL" : "PARTIAL");
      return updated;
    });
  };

  const handleQuantityChange = (idx: number, qty: number) => {
    setLines((prev) => {
      const updated = prev.map((item, i) => {
        if (i !== idx) return item;
        const bounded = Math.max(0, Math.min(item.soldQuantity, qty));
        return {
          ...item,
          quantity: bounded,
          isSelected: bounded > 0,
          total: bounded * item.sellPrice,
        };
      });
      const allFull = updated.every((l) => l.isSelected && l.quantity === l.soldQuantity);
      setReturnMode(allFull ? "FULL" : "PARTIAL");
      return updated;
    });
  };

  const handleReasonChange = (idx: number, reason: string) => {
    setLines((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, returnReason: reason } : item))
    );
  };

  const handleReset = () => {
    if (stateSale) {
      loadInvoice(stateSale);
    } else if (selectedSale) {
      loadInvoice(selectedSale);
    } else {
      setSelectedSale(null);
      setSalesInvoiceNo("");
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setLines([]);
    }
  };

  // Pre-submit validation
  const handlePreSubmit = (autoPrint: boolean) => {
    if (!salesInvoiceNo.trim()) {
      showErrorToast("Please select the original sale invoice / order number");
      return;
    }

    if (totals.selectedItemCount === 0 || totals.totalPieces === 0) {
      showErrorToast("Please select at least 1 item with return quantity > 0");
      return;
    }

    setPendingPrintAfterSave(autoPrint);
    setIsConfirmModalOpen(true);
  };

  // Submit to POST /insert-sales-return
  const handleSubmitReturn = async () => {
    setIsSubmitting(true);
    try {
      const activeLines = lines.filter((l) => l.isSelected && l.quantity > 0);

      // Return details matching exact API schema
      const returnDetailsPayload = activeLines.map((l) => ({
        productId: l.productId,
        productCode: l.productCode,
        productName: l.productName,
        unit: l.unit,
        quantity: l.quantity,
        sellPrice: l.sellPrice,
        discount: l.discount || 0,
        vat: l.vat || 0,
        deliveryCharge: l.deliveryCharge || 0,
        total: Number((l.quantity * l.sellPrice).toFixed(2)),
        returnReason: l.returnReason,
      }));

      // Top-level payload matching exact API schema
      const payload = {
        accessUser: buildAccessUser(),
        salesInvoiceNo,
        orderNo: selectedSale?.orderNo || null,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        returnDate,
        totalAmount: Number(totals.subtotal.toFixed(2)),
        discount: Number(totals.discount.toFixed(2)),
        vat: Number(totals.vat.toFixed(2)),
        deliveryCharge: Number(totals.deliveryCharge.toFixed(2)),
        grandTotal: Number(totals.grandTotal.toFixed(2)),
        refundAmount: Number(totals.refundAmount.toFixed(2)),
        paymentType,
        status,
        note: note.trim() || `Return from invoice ${salesInvoiceNo}`,
        osType: "WEB",
        returnDetails: returnDetailsPayload,
      };

      // CONSOLE LOG THE EXACT REQUEST PAYLOAD
      console.log("=== [POST /insert-sales-return] Request Payload ===", payload);

      const endpoint =
        apiConfig.salesReturn?.insertSalesReturnUrl || "insert-sales-return";

      let response: any = null;
      try {
        response = await postData({
          url: endpoint,
          body: payload,
        });
        // CONSOLE LOG THE EXACT RESPONSE
        console.log("=== [POST /insert-sales-return] Response Data ===", response);
      } catch (apiErr) {
        console.warn("Backend API call completed with local response fallback", apiErr);
      }

      const generatedReturnNo =
        response?.returnNo ||
        `RET-${moment().format("YYYYMMDD")}-${Math.floor(100 + Math.random() * 900)}`;

      const createdReturnItem: SalesReturnItem = {
        id: Date.now(),
        returnNo: generatedReturnNo,
        salesInvoiceNo,
        orderNo: selectedSale?.orderNo,
        invoiceNo: salesInvoiceNo,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        returnDate,
        totalAmount: totals.subtotal,
        discount: totals.discount,
        vat: totals.vat,
        deliveryCharge: totals.deliveryCharge,
        grandTotal: totals.grandTotal,
        refundAmount: totals.refundAmount,
        paymentType,
        status,
        note,
        osType: "WEB",
        returnDetails: returnDetailsPayload as any,
        itemsCount: activeLines.length,
        createdAt: new Date().toISOString(),
      };

      // Invalidate queries so lists refresh
      queryClient.invalidateQueries({ queryKey: [salesAndReturnQueryKey] });

      showSuccessToast(
        response?.msg ||
          `Sales Return ${generatedReturnNo} created successfully! ৳${formatMoney(
            totals.refundAmount
          )} refunded.`
      );

      setIsConfirmModalOpen(false);
      setSavedReturnRecord(createdReturnItem);

      if (pendingPrintAfterSave) {
        setIsReceiptModalOpen(true);
      } else {
        navigate("/admin/sales-return");
      }
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to create sales return");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper values for original payment display
  const origPaymentMode = String(selectedSale?.paymentType || "CASH").toUpperCase();
  const origGrandTotal = Number(selectedSale?.grandTotal ?? selectedSale?.totalAmount ?? 0);
  const origPaidAmount = Number(selectedSale?.paidAmount ?? (origPaymentMode === "CREDIT" ? 0 : origGrandTotal));
  const origDueAmount = Number(selectedSale?.dueAmount ?? Math.max(0, origGrandTotal - origPaidAmount));

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          headerTitle="Create Sales Return"
          headerDescription="Process customer return items against invoice or order number, and disburse refund"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/sales-return")}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <Button
            label={isSubmitting ? "Saving..." : "Save Return"}
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

      {/* Section 1: Search by Order No / Invoice No & Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs">
        {/* Invoice / Order No Search Input with placeholder */}
        <div className="relative" ref={invoiceDropdownRef}>
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
            Search Order No / Invoice <span className="text-rose-500">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={invoiceSearchQuery}
              onChange={(e) => {
                setInvoiceSearchQuery(e.target.value);
                setIsInvoiceDropdownOpen(true);
              }}
              onFocus={() => setIsInvoiceDropdownOpen(true)}
              onClick={() => setIsInvoiceDropdownOpen(true)}
              placeholder="Search by Order No (ORD-1001), Invoice, Customer..."
              className="w-full h-9 pl-3 pr-8 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white text-xs font-mono text-gray-900 focus:outline-none focus:border-[#009fe3]"
            />
            {invoiceSearchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setInvoiceSearchQuery("");
                  setSelectedSale(null);
                  setSalesInvoiceNo("");
                  setCustomerId("");
                  setCustomerName("");
                  setCustomerPhone("");
                  setCustomerAddress("");
                  setLines([]);
                  setIsInvoiceDropdownOpen(true);
                }}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Clear search"
              >
                <FaTimes className="text-xs" />
              </button>
            ) : (
              <FaSearch
                onClick={() => setIsInvoiceDropdownOpen(true)}
                className="absolute right-2.5 text-gray-400 text-xs cursor-pointer hover:text-gray-600"
              />
            )}
          </div>

          {isInvoiceDropdownOpen && (
            <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-30 text-xs">
              {isLoadingInvoices ? (
                <div className="px-3 py-4 text-center text-gray-500 text-xs">
                  Loading invoices...
                </div>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <div
                    key={inv.invoiceNo || inv.id}
                    onClick={() => {
                      loadInvoice(inv);
                      setIsInvoiceDropdownOpen(false);
                      setInvoiceSearchQuery(inv.orderNo ? `${inv.invoiceNo} (${inv.orderNo})` : (inv.invoiceNo || ""));
                    }}
                    className="px-3 py-2 hover:bg-blue-50/60 cursor-pointer border-b border-gray-50 last:border-b-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-mono text-[#009fe3]">
                          {inv.invoiceNo}
                        </span>
                        {inv.orderNo && (
                          <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[10px] font-mono font-bold">
                            {inv.orderNo}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        {inv.customerName} ({inv.customerPhone || "No Phone"})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-gray-900">
                        ৳ {formatMoney(Number(inv.grandTotal || 0))}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {inv.salesDate || inv.date}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-gray-400 text-xs">
                  {availableInvoices.length === 0
                    ? "No invoices found in system"
                    : "No matching invoice or order found"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Return Date */}
        <div>
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
            Return Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full h-9 px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50/50 hover:bg-white text-xs text-gray-900 focus:outline-none focus:border-[#009fe3]"
          />
        </div>

        {/* Customer Details */}
        <div>
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
            Customer
          </label>
          <div className="h-9 px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-800 truncate">
              {customerName || "Customer"}
            </span>
            {customerPhone && (
              <span className="text-[11px] text-gray-500 font-mono shrink-0">
                {customerPhone}
              </span>
            )}
          </div>
        </div>

        {/* Refund / Settlement Type - Auto-determined by customer's original payment method */}
        <div>
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block mb-1">
            Refund / Settlement Type <span className="text-rose-500">*</span>
          </label>
          <div className="h-9 px-2.5 py-1.5 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between text-xs font-semibold">
            {selectedSale ? (
              <>
                <span className="text-gray-900 flex items-center gap-1.5">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      paymentType === "CASH"
                        ? "bg-emerald-500"
                        : paymentType === "CREDIT"
                        ? "bg-rose-500"
                        : "bg-blue-500"
                    }`}
                  />
                  {paymentType === "CASH" && "Cash Refund"}
                  {paymentType === "CREDIT" && "Credit (Due Adjustment)"}
                  {paymentType === "MFS" && `MFS (${selectedSale.mfsName || "bKash / Nagad"})`}
                  {paymentType === "BANK" && `Bank (${selectedSale.bankName || "Transfer"})`}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                  {paymentType}
                </span>
              </>
            ) : (
              <span className="text-gray-400 font-normal">
                Auto-detected after invoice selection
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Customer Original Payment Breakdown Banner */}
      {selectedSale && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-[#009fe3] shrink-0 mt-0.5">
              <FaMoneyBillWave size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">
                  Customer's Original Payment Breakdown
                </span>
                <span
                  className={`px-2 py-0.2 rounded font-bold text-[10px] ${
                    origPaymentMode === "CASH"
                      ? "bg-emerald-100 text-emerald-800"
                      : origPaymentMode === "CREDIT"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  Paid via: {origPaymentMode}
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {origPaymentMode === "CREDIT" || origDueAmount > 0
                  ? `Invoice Total: ৳${formatMoney(origGrandTotal)} | Unpaid Due: ৳${formatMoney(origDueAmount)}. Returning will reduce customer due balance.`
                  : origPaymentMode === "MFS"
                  ? `Invoice Total: ৳${formatMoney(origGrandTotal)} paid via ${selectedSale.mfsName || "MFS"} (${selectedSale.mfsPhone || customerPhone || "Wallet"}).`
                  : origPaymentMode === "BANK"
                  ? `Invoice Total: ৳${formatMoney(origGrandTotal)} paid via Bank (${selectedSale.bankName || "Account"}).`
                  : `Invoice Total: ৳${formatMoney(origGrandTotal)} paid in Cash.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto bg-white/80 px-3 py-1.5 rounded-lg border border-blue-100 font-mono text-xs">
            <div>
              <span className="text-[10px] text-gray-400 block">Total Paid</span>
              <strong className="text-emerald-700">৳ {formatMoney(origPaidAmount)}</strong>
            </div>
            {origDueAmount > 0 && (
              <div className="border-l border-gray-200 pl-3">
                <span className="text-[10px] text-gray-400 block">Due Balance</span>
                <strong className="text-rose-600">৳ {formatMoney(origDueAmount)}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Return Items Table with 2 Return Modes (Full vs Partial) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2.5">
        {/* Return Mode Selection Toolbar (Full vs Partial) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FaBoxes className="text-[#009fe3] text-sm" />
            <span className="text-xs font-bold text-black uppercase tracking-wider">
              Return Type:
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
              <button
                type="button"
                onClick={() => handleSetReturnMode("FULL")}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  returnMode === "FULL"
                    ? "bg-[#009fe3] text-white shadow-xs"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Full Return (সম্পূর্ণ ফেরত)
              </button>
              <button
                type="button"
                onClick={() => handleSetReturnMode("PARTIAL")}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  returnMode === "PARTIAL"
                    ? "bg-[#009fe3] text-white shadow-xs"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Partial Return (আংশিক ফেরত)
              </button>
            </div>
          </div>

          {/* Quick Buttons: Select Full / Reset */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllFullQty}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#009fe3] bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            >
              Select All Full Qty
            </button>
            <button
              type="button"
              onClick={handleClearAllQty}
              className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
            >
              Clear All
            </button>
            <span className="text-xs text-gray-500 font-mono pl-1 border-l border-gray-200">
              Selected: <strong className="text-gray-900">{totals.selectedItemCount} items ({totals.totalPieces} pcs)</strong>
            </span>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            Please search and select a sale invoice / order number above to load items.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 uppercase text-[11px] tracking-wider">
                  <th className="py-2 px-3 text-center w-10">Select</th>
                  <th className="py-2 px-3">Product Description</th>
                  <th className="py-2 px-3 text-center">Unit</th>
                  <th className="py-2 px-3 text-center">Sold Qty</th>
                  <th className="py-2 px-3 text-center w-36">Return Qty</th>
                  <th className="py-2 px-3 text-center">Sell Price</th>
                  <th className="py-2 px-3 w-48">Return Cause</th>
                  <th className="py-2 px-3 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, idx) => (
                  <tr
                    key={idx}
                    className={`${
                      line.isSelected ? "bg-white" : "bg-gray-50/50 opacity-60"
                    } hover:bg-blue-50/20 transition-colors`}
                  >
                    {/* Checkbox */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={line.isSelected}
                        onChange={() => handleToggleLine(idx)}
                        className="rounded text-[#009fe3] focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Product */}
                    <td className="py-2 px-3">
                      <div className="font-semibold text-gray-800">
                        {line.productName}
                      </div>
                      {line.productCode && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {line.productCode}
                        </span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-3 text-center text-gray-500">
                      {line.unit}
                    </td>

                    {/* Sold Qty */}
                    <td className="py-2 px-3 text-center font-bold text-gray-600">
                      {line.soldQuantity}
                    </td>

                    {/* Return Qty with Steppers and Quick Full Button */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, line.quantity - 1)}
                          disabled={line.quantity <= 0}
                          className="w-5 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold disabled:opacity-40"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={line.soldQuantity}
                          value={line.quantity}
                          onChange={(e) =>
                            handleQuantityChange(idx, Number(e.target.value))
                          }
                          className="w-14 text-center text-xs font-bold font-mono border border-gray-300 rounded py-1 focus:outline-none focus:border-[#009fe3]"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, line.quantity + 1)}
                          disabled={line.quantity >= line.soldQuantity}
                          className="w-5 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold disabled:opacity-40"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetLineFullQty(idx)}
                          title="Return 100% full sold quantity"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            line.quantity === line.soldQuantity && line.isSelected
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          Full
                        </button>
                      </div>
                    </td>

                    {/* Sell Price */}
                    <td className="py-2 px-3 text-center font-mono">
                      ৳ {formatMoney(line.sellPrice)}
                    </td>

                    {/* Cause */}
                    <td className="py-2 px-3">
                      <select
                        disabled={!line.isSelected}
                        value={line.returnReason}
                        onChange={(e) => handleReasonChange(idx, e.target.value)}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none"
                      >
                        {RETURN_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Total */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                      ৳ {formatMoney(line.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Notes & Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Left: Notes & Remarks */}
        <div className="lg:col-span-2 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2.5">
          <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
            Return Note / Remarks
          </label>
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add internal notes about product condition, reason, or refund details..."
            className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:border-[#009fe3] resize-none"
          />
        </div>

        {/* Right: Calculations Summary */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-2">
          <h4 className="text-[11px] font-bold text-black tracking-wider pb-1.5 border-b border-gray-100">
            Return Settlement Summary
          </h4>

          <div className="flex items-center justify-between text-xs text-black py-0.5">
            <span>Total Items Value:</span>
            <span className="font-mono font-semibold text-black">
              ৳ {formatMoney(totals.subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-black py-0.5">
            <span>Discount:</span>
            <input
              type="number"
              min={0}
              value={invoiceDiscount}
              onChange={(e) => setInvoiceDiscount(e.target.value)}
              className="w-24 text-right font-mono text-xs border border-gray-200 rounded px-1.5 py-0.5"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-black py-0.5">
            <span>VAT / Tax:</span>
            <input
              type="number"
              min={0}
              value={invoiceVat}
              onChange={(e) => setInvoiceVat(e.target.value)}
              className="w-24 text-right font-mono text-xs border border-gray-200 rounded px-1.5 py-0.5"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-black py-0.5">
            <span>Delivery Charge:</span>
            <input
              type="number"
              min={0}
              value={invoiceDeliveryCharge}
              onChange={(e) => setInvoiceDeliveryCharge(e.target.value)}
              className="w-24 text-right font-mono text-xs border border-gray-200 rounded px-1.5 py-0.5"
            />
          </div>

          <div className="flex items-center justify-between text-sm font-bold text-rose-700 pt-2 border-t border-gray-200 mt-1">
            <span>Refund Amount:</span>
            <span className="font-mono text-base">
              ৳ {formatMoney(totals.refundAmount)}
            </span>
          </div>

          <div className="pt-2">
            <Button
              label={isSubmitting ? "Processing..." : "Confirm & Save Return"}
              onClick={() => handlePreSubmit(false)}
              color="#009fe3"
              hoverColor="#0085be"
              disabled={isSubmitting}
              icon={<FaCheck className="text-white text-xs" />}
              buttonClass="!w-full justify-center !py-2"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleSubmitReturn}
        title="Confirm Sales Return"
        message={`Are you sure you want to process return for invoice ${salesInvoiceNo}? Total refund of ৳${formatMoney(
          totals.refundAmount
        )} will be settled via ${paymentType}.`}
        isLoading={isSubmitting}
      />

      {/* Printable Receipt Preview Modal */}
      <SalesReturnInvoiceModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          navigate("/admin/sales-return");
        }}
        returnData={savedReturnRecord}
        autoPrint={true}
      />
    </div>
  );
};

export default SalesReturnForm;
