import type { TradeInvoiceData, TradeInvoiceLineItem } from "./TradeInvoiceModal";
import { getCleanOrderNo } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
import {
  getReturnReasonLabel,
  extractReturnRemarks,
  getPurchaseReturnReasonLabel,
} from "@/pages/admin/trade/constants/returnReasons";

const resolveAttachmentUrl = (raw: any): string | null => {
  if (!raw) return null;
  let url = raw;

  if (typeof url === "string" && (url.startsWith("[") || url.startsWith("{"))) {
    try {
      url = JSON.parse(url);
    } catch {
      // ignore
    }
  }

  if (Array.isArray(url) && url.length > 0) {
    const first = url[0];
    url = typeof first === "string" ? first : (first?.url || first?.path || first?.image || null);
  } else if (typeof url === "object" && url !== null) {
    url = url.url || url.path || url.image || null;
  }

  if (!url || typeof url !== "string") return null;
  const clean = url.trim();
  if (clean === "" || clean === "1" || clean === "true" || clean === "null" || clean === "undefined") {
    return null;
  }
  if (clean.startsWith("data:") || clean.startsWith("blob:") || clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const serverHost = rawBaseUrl.replace(/\/api\/?$/, "");
  const path = clean.startsWith("/") ? clean.slice(1) : clean;
  return `${serverHost}/${path}`;
};

export const normalizeSaleInvoice = (sale: any): TradeInvoiceData => {
  const s = sale || {};
  const rawDetails =
    s.salesDetails ||
    s.saleDetails ||
    s.details ||
    s.items ||
    s.productsList ||
    [];
  const details: any[] = Array.isArray(rawDetails) ? rawDetails : [];

  const delivery = Number(s.deliveryCharge ?? s.delivery_charge ?? 0);
  const discount = Number(s.discount ?? 0);
  const vat = Number(s.vat ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.sellPrice ?? item.price ?? item.rate ?? item.unitPrice ?? 0);
    const qty = Number(item.quantity ?? item.qty ?? 1);
    const lineVat = Number(item.vat ?? 0);
    const lineDisc = Number(item.discount ?? 0);
    const total = Number(item.total ?? (price * qty + lineVat - lineDisc));

    return {
      id: item.id || idx,
      productName: item.productName || item.product_name || item.name || "Product",
      productCode: item.productCode || item.product_code || item.pcode,
      unit: item.secondary_unit || item.secondaryUnit || item.unit || "Pcs",
      price,
      quantity: qty,
      discount: lineDisc,
      vat: lineVat,
      total,
    };
  });

  const subtotal =
    Number(s.totalAmount ?? s.total_amount ?? 0) ||
    items.reduce((acc, it) => acc + it.total, 0);

  const grandTotal = Number(s.grandTotal ?? s.grand_total ?? (subtotal - discount + vat + delivery));
  const paid = Number(s.paidAmount ?? s.paid_amount ?? s.cashReceived ?? 0);
  const due = Number(s.dueAmount ?? s.due_amount ?? Math.max(0, grandTotal - paid));
  const previousDue = Number(s.previousDue ?? s.previous_due ?? 0);

  const isMulti =
    s.invType === "MULTI" ||
    String(s.paymentType || s.payment_type || "").toLowerCase() === "multi";

  return {
    type: "SALE",
    invoiceTitle: "Sales Invoice Details",
    invoiceNo: getCleanOrderNo(s.orderNo, s.invoiceNo, s.id) || s.invoiceNo || "",
    date: s.salesDate || s.saleDate || s.date || s.createdAt,
    status: s.status,
    partyTypeTitle: "Customer Information",
    partyName: s.customerName || s.customer_name || s.partyName || "Walk-in Customer",
    partyPhone: s.customerPhone || s.customer_phone || s.phone,
    partyAddress: s.customerAddress || s.customer_address || s.address,
    paymentMethod: isMulti ? "MULTI (SPLIT)" : (s.paymentType || s.payment_type || "CASH").toUpperCase(),
    cashAmount: Number(s.cashReceived || s.cashAmount || s.cash_received || 0),
    bankName: s.bankName || s.bank_name,
    bankAmount: Number(s.cardReceived || s.bankAmount || s.bank_received || 0),
    accountNo: s.accountNo || s.account_no,
    mfsName: s.mfsName || s.mfs_name,
    mfsAmount: Number(s.mfsReceived || s.mfsAmount || s.mfs_received || 0),
    mfsPhone: s.mfsPhone || s.mfs_phone,
    customerPaid: Number(s.customerPaid || 0),
    returnAmount: Number(s.returnAmount || 0),
    items,
    subtotal,
    discount,
    vat,
    deliveryCharge: delivery,
    grandTotal,
    paidAmount: paid,
    dueAmount: due,
    previousDue,
    totalDueWithCurrent: Number(due + previousDue),
    notes: s.note || s.notes || "",
  };
};

export const normalizePurchaseInvoice = (purchase: any): TradeInvoiceData => {
  const p = purchase || {};
  const rawDetails = p.purchaseDetails || p.details || [];
  const details: any[] = Array.isArray(rawDetails) ? rawDetails : [];

  const delivery = Number(p.transportCost ?? 0);
  const discount = Number(p.discount ?? 0);
  const vat = Number(p.vat ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.buyPrice ?? item.price ?? 0);
    const qty = Number(item.quantity ?? item.qty ?? 1);
    const lineDisc = Number(item.discount ?? 0);
    const lineVat = Number(item.vat ?? 0);
    const total = Number(item.total ?? (price * qty - lineDisc + lineVat));

    return {
      id: item.id || idx,
      productName: item.productName || item.name || "Product",
      productCode: item.productCode || item.pcode,
      unit: item.secondary_unit || item.secondaryUnit || item.unit || "PCS",
      price,
      quantity: qty,
      discount: lineDisc,
      vat: lineVat,
      total,
    };
  });

  const subtotal =
    Number(p.totalAmount ?? 0) ||
    items.reduce((acc, it) => acc + it.total, 0);

  const grandTotal = Number(p.grandTotal ?? (subtotal - discount + vat + delivery));
  const paid = Number(p.paidAmount ?? 0);
  const due = Number(p.dueAmount ?? 0);

  const rawAttachment =
    p.attachments ||
    p.attachment ||
    p.image;

  return {
    type: "PURCHASE",
    invoiceTitle: "Purchase Invoice Details",
    invoiceNo: getCleanOrderNo(p.orderNo, p.invoiceNo, p.id) || p.invoiceNo || "",
    date: p.purchaseDate || p.createdAt,
    status: p.status,
    partyTypeTitle: "Supplier Information",
    partyName: p.supplierName || "Direct Supplier",
    partyPhone: p.supplierPhone,
    partyAddress: p.supplierAddress,
    paymentMethod: p.paymentType || (paid > 0 ? "CASH" : "CREDIT"),
    cashAmount: paid,
    challanNo: p.challanNo,
    vehicleNo: p.vehicleNo,
    driverName: p.driverName,
    driverPhone: p.driverPhone,
    attachmentUrl: resolveAttachmentUrl(rawAttachment),
    items,
    subtotal,
    discount,
    vat,
    deliveryCharge: delivery,
    grandTotal,
    paidAmount: paid,
    dueAmount: due,
    notes: p.note || "",
  };
};

export const normalizeSalesReturnInvoice = (returnData: any): TradeInvoiceData => {
  const r = returnData || {};
  const details: any[] = Array.isArray(r.returnDetails) ? r.returnDetails : [];

  const discount = Number(r.discount ?? 0);
  const vat = Number(r.vat ?? 0);
  const delivery = Number(r.deliveryCharge ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.price ?? item.sellPrice ?? 0);
    const qty = Number(item.returnQuantity ?? item.quantity ?? 1);
    const lineVat = Number(item.vat ?? 0);
    const lineDisc = Number(item.discount ?? 0);
    const total = Number(item.total ?? (price * qty + lineVat - lineDisc));

    return {
      id: item.id || idx,
      productName: item.productName || item.name || "Product",
      productCode: item.productCode || item.pcode,
      unit: item.secondary_unit || item.secondaryUnit || item.unit || "pcs",
      price,
      quantity: qty,
      discount: lineDisc,
      vat: lineVat,
      total,
      returnReason: getReturnReasonLabel(item.returnReason || item.reason),
      returnRemarks: extractReturnRemarks(item),
    };
  });

  const subtotal =
    Number(r.totalAmount ?? 0) ||
    items.reduce((acc, it) => acc + it.total, 0);

  const grandTotal = Number(r.grandTotal ?? (subtotal - discount + vat + delivery));
  const refund = Number(r.refundAmount ?? grandTotal);

  return {
    type: "SALES_RETURN",
    invoiceTitle: "Sales Return Invoice",
    invoiceNo: r.returnNo || r.invoiceNo || `SR-${r.id || ""}`,
    date: r.returnDate || r.createdAt,
    status: r.status || "RETURNED",
    partyTypeTitle: "Customer Information",
    partyName: r.customerName || "N/A",
    partyPhone: r.customerPhone,
    partyAddress: r.customerAddress,
    paymentMethod: r.paymentType || "REFUND",
    items,
    subtotal,
    discount,
    vat,
    deliveryCharge: delivery,
    grandTotal,
    paidAmount: refund,
    refundAmount: refund,
    notes: r.note || "",
  };
};

export const normalizePurchaseReturnInvoice = (returnData: any): TradeInvoiceData => {
  const r = returnData || {};
  const details: any[] = Array.isArray(r.returnDetails)
    ? r.returnDetails
    : Array.isArray(r.purchaseReturnDetails)
    ? r.purchaseReturnDetails
    : Array.isArray(r.details)
    ? r.details
    : [];

  const discount = Number(r.discount ?? 0);
  const vat = Number(r.vat ?? 0);
  const delivery = Number(r.deliveryCharge ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.price ?? item.buyPrice ?? 0);
    const qty = Number(item.returnQuantity ?? item.quantity ?? 1);
    const lineVat = Number(item.vat ?? 0);
    const lineDisc = Number(item.discount ?? 0);
    const total = Number(item.total ?? (price * qty + lineVat - lineDisc));

    return {
      id: item.id || idx,
      productName: item.productName || item.name || "Product",
      productCode: item.productCode || item.pcode,
      unit: item.secondary_unit || item.secondaryUnit || item.unit || "pcs",
      price,
      quantity: qty,
      discount: lineDisc,
      vat: lineVat,
      total,
      returnReason: getPurchaseReturnReasonLabel(item.returnReason || item.reason),
      returnRemarks: item.note || "",
    };
  });

  const subtotal =
    Number(r.totalAmount ?? 0) ||
    items.reduce((acc, it) => acc + it.total, 0);

  const grandTotal = Number(r.grandTotal ?? (subtotal - discount + vat + delivery));
  const refund = Number(r.refundAmount ?? grandTotal);

  return {
    type: "PURCHASE_RETURN",
    invoiceTitle: "Purchase Return Invoice",
    invoiceNo: r.returnNo || r.invoiceNo || `PR-${r.id || ""}`,
    date: r.returnDate || r.createdAt,
    status: r.status || "RETURNED",
    partyTypeTitle: "Supplier Information",
    partyName: r.supplierName || "N/A",
    partyPhone: r.supplierPhone,
    partyAddress: r.supplierAddress,
    paymentMethod: r.paymentType || "REFUND",
    items,
    subtotal,
    discount,
    vat,
    deliveryCharge: delivery,
    grandTotal,
    paidAmount: refund,
    refundAmount: refund,
    notes: r.note || "",
  };
};
