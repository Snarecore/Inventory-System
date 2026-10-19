import type { TradeInvoiceData, TradeInvoiceLineItem } from "./TradeInvoiceModal";
import { getReturnReasonLabel, extractReturnRemarks } from "@/pages/admin/trade/sales-return/constants/returnReasons";
import { getPurchaseReturnReasonLabel } from "@/pages/admin/trade/purchase-return/constants/returnReasons";

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
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://itouch.stepserp.com/cash-boi-v4/api";
  const serverHost = rawBaseUrl.replace(/\/api\/?$/, "");
  const path = clean.startsWith("/") ? clean.slice(1) : clean;
  return `${serverHost}/${path}`;
};

export const normalizeSaleInvoice = (sale: any): TradeInvoiceData => {
  const s = sale || {};
  const rawDetails = s.salesDetails || s.details || [];
  const details: any[] = Array.isArray(rawDetails) ? rawDetails : [];

  const delivery = Number(s.deliveryCharge ?? 0);
  const discount = Number(s.discount ?? 0);
  const vat = Number(s.vat ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.sellPrice ?? item.price ?? 0);
    const qty = Number(item.quantity ?? item.qty ?? 1);
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
    };
  });

  const subtotal =
    Number(s.totalAmount ?? 0) ||
    items.reduce((acc, it) => acc + it.total, 0);

  const grandTotal = Number(s.grandTotal ?? (subtotal - discount + vat + delivery));
  const paid = Number(s.paidAmount ?? s.cashReceived ?? 0);
  const due = Number(s.dueAmount ?? 0);
  const previousDue = Number(s.previousDue ?? 0);

  const isMulti =
    s.invType === "MULTI" ||
    String(s.paymentType || "").toLowerCase() === "multi";

  return {
    type: "SALE",
    invoiceTitle: "Sales Invoice Details",
    invoiceNo: s.invoiceNo || `INV-${s.id || ""}`,
    date: s.salesDate || s.createdAt,
    status: s.status,
    partyTypeTitle: "Customer Information",
    partyName: s.customerName || "Walk-in Customer",
    partyPhone: s.customerPhone,
    partyAddress: s.customerAddress,
    paymentMethod: isMulti ? "MULTI (SPLIT)" : s.paymentType || "CASH",
    cashAmount: Number(s.cashReceived || 0),
    bankName: s.bankName,
    bankAmount: Number(s.cardReceived || s.bankAmount || 0),
    accountNo: s.accountNo,
    mfsName: s.mfsName,
    mfsAmount: Number(s.mfsReceived || s.mfsAmount || 0),
    mfsPhone: s.mfsPhone,
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
    notes: s.note || "",
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
    invoiceNo: p.invoiceNo || `PUR-${p.id || ""}`,
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
