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
  const rawDetails =
    s.salesDetails ||
    s.saleDetails ||
    s.details ||
    s.items ||
    s.products ||
    s.productsList ||
    [];
  const details: any[] = Array.isArray(rawDetails) ? rawDetails : [];

  const delivery = Number(s.delivery_charge ?? s.deliveryCharge ?? s.transportCost ?? 0);
  const discount = Number(s.discount ?? s.discount_amount ?? s.discountAmount ?? 0);
  const vat = Number(s.vat ?? s.vat_amount ?? s.vatAmount ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.sellPrice ?? item.sell_price ?? item.price ?? item.unitPrice ?? 0);
    const qty = Number(item.quantity ?? item.qty ?? 1);
    const lineVat = Number(item.vat ?? item.vat_amount ?? 0);
    const lineDisc = Number(item.discount ?? item.discount_amount ?? 0);
    const total = Number(item.total ?? (price * qty + lineVat - lineDisc));

    return {
      id: item.id || idx,
      productName: item.productName || item.product_name || item.name || "Product",
      productCode: item.productCode || item.product_code || item.pcode || item.code,
      unit: item.unit || item.unitName || "pcs",
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

  const isMulti =
    s.inv_type === "MULTI" ||
    s.invType === "MULTI" ||
    String(s.paymentType || s.payment_type).toLowerCase() === "multi";

  return {
    type: "SALE",
    invoiceTitle: "Sales Invoice Details",
    invoiceNo: s.invoiceNo || s.invoice_no || `INV-${s.id || ""}`,
    date: s.salesDate || s.saleDate || s.date || s.createdAt || s.created_at,
    status: s.status,
    partyTypeTitle: "Customer Information",
    partyName: s.customerName || s.customer_name || s.partyName || "Walk-in Customer",
    partyPhone: s.customerPhone || s.customer_phone || s.partyPhone,
    partyAddress: s.customerAddress || s.customer_address || s.partyAddress,
    paymentMethod: isMulti ? "MULTI (SPLIT)" : s.paymentType || s.payment_type || "CASH",
    cashAmount: Number(s.cashReceived || s.cash_amount || 0),
    bankName: s.bankName,
    bankAmount: Number(s.cardReceived || s.bankAmount || s.bank_amount || 0),
    accountNo: s.accountNo,
    mfsName: s.mfsName,
    mfsAmount: Number(s.mfsReceived || s.mfsAmount || s.mfs_amount || 0),
    mfsPhone: s.mfsPhone || s.mfsPhoneNumber,
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
    notes: s.note || s.notes || s.remarks,
  };
};

export const normalizePurchaseInvoice = (purchase: any): TradeInvoiceData => {
  const p = purchase || {};
  const rawDetails =
    p.purchaseDetails ||
    p.purchasesDetails ||
    p.purchase_details ||
    p.details ||
    p.items ||
    p.products ||
    p.purchaseListDetails ||
    p.salesDetails ||
    p.saleDetails ||
    p.productList ||
    p.productsList ||
    [];
  const details: any[] = Array.isArray(rawDetails) ? rawDetails : [];

  const delivery = Number(p.transportCost ?? p.transport_cost ?? p.delivery_charge ?? p.deliveryCharge ?? 0);
  const discount = Number(p.discount ?? p.discount_amount ?? p.discountAmount ?? 0);
  const vat = Number(p.vat ?? p.vat_amount ?? p.vatAmount ?? p.invoiceVat ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.buyPrice ?? item.buy_price ?? item.price ?? item.rate ?? item.unitPrice ?? item.sellPrice ?? 0);
    const qty = Number(item.quantity ?? item.qty ?? item.count ?? 1);
    const lineDisc = Number(item.discount ?? item.discount_amount ?? 0);
    const lineVat = Number(item.vat ?? item.vat_amount ?? 0);
    const total = Number(item.total ?? item.total_price ?? item.subtotal ?? (price * qty - lineDisc + lineVat));

    return {
      id: item.id || idx,
      productName: item.productName || item.product_name || item.name || "Product",
      productCode: item.productCode || item.product_code || item.pcode || item.code,
      unit: item.unit || item.unitName || "PCS",
      price,
      quantity: qty,
      discount: lineDisc,
      vat: lineVat,
      total,
    };
  });

  const subtotal =
    Number(p.totalAmount ?? p.total_amount ?? p.subtotal ?? 0) ||
    items.reduce((acc, it) => acc + it.total, 0);

  const grandTotal = Number(p.grandTotal ?? p.grand_total ?? p.total ?? (subtotal - discount + vat + delivery));
  const paid = Number(p.paidAmount ?? p.paid_amount ?? p.paid ?? p.cashReceived ?? 0);
  const due = Number(p.dueAmount ?? p.due_amount ?? p.due ?? Math.max(0, grandTotal - paid));

  const rawAttachment =
    p.attachments ||
    p.attachment ||
    p.image ||
    p.file ||
    p.attachmentUrl ||
    p.documentUrl;

  return {
    type: "PURCHASE",
    invoiceTitle: "Purchase Invoice Details",
    invoiceNo: p.invoiceNo || p.invoice_no || p.billNo || `PUR-${p.id || ""}`,
    date: p.purchaseDate || p.salesDate || p.date || p.created_at || p.createdAt,
    status: p.status,
    partyTypeTitle: "Supplier Information",
    partyName: p.supplierName || p.supplier_name || p.partyName || p.party_name || p.customerName || "Direct Supplier",
    partyPhone: p.supplierPhone || p.supplier_phone || p.partyPhone || p.party_phone || p.customerPhone,
    partyAddress: p.supplierAddress || p.supplier_address || p.partyAddress || p.party_address || p.customerAddress,
    paymentMethod: p.paymentType || p.payment_type || (paid > 0 ? "CASH" : "CREDIT"),
    cashAmount: Number(p.cashReceived || p.paidAmount || p.paid || 0),
    challanNo: p.challanNo || p.challan_no || p.challanRefNo,
    vehicleNo: p.vehicleNo || p.vehicle_no || p.truckNo || p.truck_no,
    driverName: p.driverName || p.driver_name,
    driverPhone: p.driverPhone || p.driver_phone,
    attachmentUrl: resolveAttachmentUrl(rawAttachment),
    items,
    subtotal,
    discount,
    vat,
    deliveryCharge: delivery,
    grandTotal,
    paidAmount: paid,
    dueAmount: due,
    notes: p.note || p.notes || p.remarks,
  };
};

export const normalizeSalesReturnInvoice = (returnData: any): TradeInvoiceData => {
  const r = returnData || {};
  const details: any[] = Array.isArray(r.returnDetails) ? r.returnDetails : [];

  const discount = Number(r.discount ?? 0);
  const vat = Number(r.vat ?? 0);
  const delivery = Number(r.deliveryCharge ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.price ?? item.sellPrice ?? item.unitPrice ?? 0);
    const qty = Number(item.returnQuantity ?? item.quantity ?? item.qty ?? 1);
    const lineVat = Number(item.vat ?? 0);
    const lineDisc = Number(item.discount ?? 0);
    const total = Number(item.total ?? (price * qty + lineVat - lineDisc));

    return {
      id: item.id || idx,
      productName: item.productName || item.product_name || item.name || "Product",
      productCode: item.productCode || item.product_code || item.pcode,
      unit: item.unit || item.unitName || "pcs",
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
    invoiceNo: r.returnNo || r.return_no || r.invoiceNo || `SR-${r.id || ""}`,
    date: r.returnDate || r.date || r.createdAt || r.created_at,
    status: r.status || "RETURNED",
    partyTypeTitle: "Customer Information",
    partyName: r.customerName || r.partyName || "N/A",
    partyPhone: r.customerPhone || r.partyPhone,
    partyAddress: r.customerAddress || r.partyAddress,
    paymentMethod: r.paymentType || r.payment_type || "REFUND",
    items,
    subtotal,
    discount,
    vat,
    deliveryCharge: delivery,
    grandTotal,
    paidAmount: refund,
    refundAmount: refund,
    notes: r.note || r.notes || r.remarks,
  };
};

export const normalizePurchaseReturnInvoice = (returnData: any): TradeInvoiceData => {
  const r = returnData || {};
  const details: any[] = Array.isArray(r.returnDetails || r.purchaseReturnDetails)
    ? (r.returnDetails || r.purchaseReturnDetails)
    : [];

  const discount = Number(r.discount ?? 0);
  const vat = Number(r.vat ?? 0);
  const delivery = Number(r.deliveryCharge ?? 0);

  const items: TradeInvoiceLineItem[] = details.map((item: any, idx: number) => {
    const price = Number(item.price ?? item.buyPrice ?? item.unitPrice ?? 0);
    const qty = Number(item.returnQuantity ?? item.quantity ?? item.qty ?? 1);
    const lineVat = Number(item.vat ?? 0);
    const lineDisc = Number(item.discount ?? 0);
    const total = Number(item.total ?? (price * qty + lineVat - lineDisc));

    return {
      id: item.id || idx,
      productName: item.productName || item.product_name || item.name || "Product",
      productCode: item.productCode || item.product_code || item.pcode,
      unit: item.unit || item.unitName || "pcs",
      price,
      quantity: qty,
      discount: lineDisc,
      vat: lineVat,
      total,
      returnReason: getPurchaseReturnReasonLabel(item.returnReason || item.reason),
      returnRemarks: item.note || item.remarks || "",
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
    invoiceNo: r.returnNo || r.return_no || r.invoiceNo || `PR-${r.id || ""}`,
    date: r.returnDate || r.date || r.createdAt || r.created_at,
    status: r.status || "RETURNED",
    partyTypeTitle: "Supplier Information",
    partyName: r.supplierName || r.partyName || "N/A",
    partyPhone: r.supplierPhone || r.partyPhone,
    partyAddress: r.supplierAddress || r.partyAddress,
    paymentMethod: r.paymentType || r.payment_type || "REFUND",
    items,
    subtotal,
    discount,
    vat,
    deliveryCharge: delivery,
    grandTotal,
    paidAmount: refund,
    refundAmount: refund,
    notes: r.note || r.notes || r.remarks,
  };
};
