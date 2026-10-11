import * as XLSX from "xlsx";
import type { PurchaseItem } from "@/types";
import { getUserInfo } from "./auth-storage";

export interface ExportPurchasesOptions {
  fileName?: string;
  sheetName?: string;
  businessName?: string;
}

/**
 * Extracts items count from purchase object across all known schemas
 */
const getItemsCount = (p: any): number => {
  if (!p) return 0;
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
    p.productsList;

  if (Array.isArray(rawDetails) && rawDetails.length > 0) {
    const uniqueKeys = new Set<string>();
    rawDetails.forEach((d: any) => {
      const k = String(d.productId ?? d.product_id ?? d.productCode ?? d.pcode ?? d.productName ?? d.name ?? "").trim().toLowerCase();
      if (k) uniqueKeys.add(k);
    });
    return uniqueKeys.size > 0 ? uniqueKeys.size : rawDetails.length;
  }
  const explicitCount = Number(
    p.itemCount ??
    p.item_count ??
    p.totalItems ??
    p.total_items ??
    p.itemsCount ??
    p.items_count ??
    p.productCount ??
    p.product_count ??
    0
  );
  return explicitCount > 0 ? explicitCount : 1;
};

/**
 * Enterprise standard Excel export for Purchases
 */
export function exportPurchasesToExcel(
  purchases: PurchaseItem[],
  options?: ExportPurchasesOptions
): void {
  if (!purchases || purchases.length === 0) {
    throw new Error("No purchase data available to export");
  }

  const userInfo = getUserInfo();
  const businessName =
    options?.businessName ||
    userInfo?.businessName ||
    "Cash Boi ERP";

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName =
    options?.fileName ||
    `Purchases_Report_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Purchases";

  let sumGrandTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumItems = 0;

  // Format purchase rows for Excel
  const rows = purchases.map((item: any, index: number) => {
    const grandTotal = Number(item.grandTotal ?? item.totalAmount ?? 0);
    const paidAmount = Number(item.paidAmount ?? 0);
    const dueAmount = Number(item.dueAmount ?? Math.max(0, grandTotal - paidAmount));
    const itemsCount = getItemsCount(item);
    const discount = Number(item.discount ?? item.discount_amount ?? 0);
    const vat = Number(item.vat ?? item.vat_amount ?? 0);
    const transport = Number(item.transportCost ?? item.transport_cost ?? item.delivery_charge ?? 0);

    sumGrandTotal += grandTotal;
    sumPaid += paidAmount;
    sumDue += dueAmount;
    sumItems += itemsCount;

    let status = "PAID";
    if (dueAmount > 0 && paidAmount > 0) status = "PARTIAL";
    else if (dueAmount > 0 && paidAmount === 0) status = "DUE";

    return {
      "SL": index + 1,
      "Invoice No": item.invoiceNo || `PUR-${item.id || index + 1}`,
      "Purchase Date": item.purchaseDate || (item.createdAt ? item.createdAt.substring(0, 10) : ""),
      "Supplier Name": item.supplierName || "Direct Supplier",
      "Supplier Phone": item.supplierPhone || "",
      "Supplier Address": item.supplierAddress || "",
      "Items Count": itemsCount,
      "Subtotal (BDT)": Number((item.totalAmount || (grandTotal - vat - transport + discount)).toFixed(2)),
      "Discount (BDT)": discount,
      "VAT (BDT)": vat,
      "Transport (BDT)": transport,
      "Grand Total (BDT)": grandTotal,
      "Paid Amount (BDT)": paidAmount,
      "Due Amount (BDT)": dueAmount,
      "Payment Method": (item.paymentType || "CASH").toUpperCase(),
      "Payment Status": status,
      "Challan No": item.challanNo || item.challan_no || "",
      "Vehicle No": item.vehicleNo || item.vehicle_no || "",
      "Driver Name": item.driverName || item.driver_name || "",
      "PO Number": item.poNumber || item.po_number || "",
      "Notes": item.note || item.notes || "",
    };
  });

  // Add Summary Total Row
  const totalRow = {
    "SL": "TOTAL",
    "Invoice No": `Total Invoices: ${purchases.length}`,
    "Purchase Date": "",
    "Supplier Name": "",
    "Supplier Phone": "",
    "Supplier Address": "",
    "Items Count": sumItems,
    "Subtotal (BDT)": "",
    "Discount (BDT)": "",
    "VAT (BDT)": "",
    "Transport (BDT)": "",
    "Grand Total (BDT)": Number(sumGrandTotal.toFixed(2)),
    "Paid Amount (BDT)": Number(sumPaid.toFixed(2)),
    "Due Amount (BDT)": Number(sumDue.toFixed(2)),
    "Payment Method": "",
    "Payment Status": "",
    "Challan No": "",
    "Vehicle No": "",
    "Driver Name": "",
    "PO Number": "",
    "Notes": "",
  };

  const fullData = [...rows, totalRow];

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(fullData, {
    header: Object.keys(rows[0]),
  });

  // Auto-calculate column widths
  const colKeys = Object.keys(rows[0]);
  const colWidths = colKeys.map((key) => {
    let maxLen = key.length;
    fullData.forEach((row: any) => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
  });
  worksheet["!cols"] = colWidths;

  // Create workbook and write file
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, fileName);
}

export interface ExportSalesOptions {
  fileName?: string;
  sheetName?: string;
  businessName?: string;
}

/**
 * Enterprise standard Excel export for Sales Invoices / Orders
 */
export function exportSalesToExcel(
  sales: any[],
  options?: ExportSalesOptions
): void {
  if (!sales || sales.length === 0) {
    throw new Error("No sales data available to export");
  }

  const userInfo = getUserInfo();
  const businessName =
    options?.businessName ||
    userInfo?.businessName ||
    "Cash Boi ERP";

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName =
    options?.fileName ||
    `Sales_Report_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Sales";

  let sumGrandTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumItems = 0;

  const rows = sales.map((item: any, index: number) => {
    const grandTotal = Number(item.grandTotal ?? item.totalAmount ?? item.total_amount ?? 0);
    const paidAmount = Number(item.paidAmount ?? item.paid_amount ?? 0);
    const dueAmount = Number(item.dueAmount ?? item.due_amount ?? Math.max(0, grandTotal - paidAmount));
    const itemsCount = getItemsCount(item);
    const discount = Number(item.discount ?? 0);
    const vat = Number(item.vat ?? 0);
    const delivery = Number(item.delivery_charge ?? item.deliveryCharge ?? 0);

    sumGrandTotal += grandTotal;
    sumPaid += paidAmount;
    sumDue += dueAmount;
    sumItems += itemsCount;

    let status = String(item.status || "").toUpperCase();
    if (!status) {
      if (dueAmount <= 0) status = "PAID";
      else if (paidAmount > 0) status = "PARTIAL";
      else status = "PENDING";
    }

    return {
      "SL": index + 1,
      "Invoice No": item.invoiceNo || item.invoice_no || `INV-${item.id || index + 1}`,
      "Sales Date": item.salesDate || item.saleDate || item.date || todayStr,
      "Customer Name": item.customerName || item.customer_name || "Walk-in Customer",
      "Customer Phone": item.customerPhone || item.customer_phone || "-",
      "Customer Address": item.customerAddress || item.customer_address || "-",
      "Items Count": itemsCount,
      "Subtotal (BDT)": Number((item.totalAmount ?? item.total_amount ?? grandTotal).toFixed(2)),
      "Discount (BDT)": discount,
      "VAT (BDT)": vat,
      "Delivery (BDT)": delivery,
      "Grand Total (BDT)": grandTotal,
      "Paid Amount (BDT)": paidAmount,
      "Due Amount (BDT)": dueAmount,
      "Payment Type": (item.paymentType || item.payment_type || "CASH").toUpperCase(),
      "Status": status,
      "Notes": item.note || item.remarks || "",
    };
  });

  const totalRow = {
    "SL": "TOTAL",
    "Invoice No": `Total Invoices: ${sales.length}`,
    "Sales Date": "",
    "Customer Name": "",
    "Customer Phone": "",
    "Customer Address": "",
    "Items Count": sumItems,
    "Subtotal (BDT)": "",
    "Discount (BDT)": "",
    "VAT (BDT)": "",
    "Delivery (BDT)": "",
    "Grand Total (BDT)": Number(sumGrandTotal.toFixed(2)),
    "Paid Amount (BDT)": Number(sumPaid.toFixed(2)),
    "Due Amount (BDT)": Number(sumDue.toFixed(2)),
    "Payment Type": "",
    "Status": "",
    "Notes": "",
  };

  const fullData = [...rows, totalRow];
  const worksheet = XLSX.utils.json_to_sheet(fullData, {
    header: Object.keys(rows[0]),
  });

  const colKeys = Object.keys(rows[0]);
  const colWidths = colKeys.map((key) => {
    let maxLen = key.length;
    fullData.forEach((row: any) => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

/**
 * Enterprise standard Excel export for Sales Returns
 */
export function exportSalesReturnToExcel(
  returns: any[],
  options?: { fileName?: string; sheetName?: string }
): void {
  if (!returns || returns.length === 0) {
    throw new Error("No sales return data available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Sales_Returns_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Sales Returns";

  let sumReturnAmount = 0;
  let sumRefundAmount = 0;
  let sumItems = 0;

  const rows = returns.map((item: any, index: number) => {
    const returnAmount = Number(item.returnTotalAmount ?? item.totalAmount ?? 0);
    const refundAmount = Number(item.refundAmount ?? returnAmount);
    const details = item.returnDetails || item.details || [];
    const itemsCount = details.length > 0 ? details.length : Number(item.itemsCount || 1);

    sumReturnAmount += returnAmount;
    sumRefundAmount += refundAmount;
    sumItems += itemsCount;

    return {
      "SL": index + 1,
      "Return No": item.returnNo || `RET-${item.id || index + 1}`,
      "Return Date": item.returnDate || item.date || todayStr,
      "Original Invoice": item.invoiceNo || "-",
      "Customer Name": item.customerName || item.customer_name || "Walk-in Customer",
      "Customer Phone": item.customerPhone || item.customer_phone || "-",
      "Items Count": itemsCount,
      "Return Reason": item.returnReason || "Product Return",
      "Refund Channel": (item.paymentType || "CASH").toUpperCase(),
      "Return Value (BDT)": Number(returnAmount.toFixed(2)),
      "Refunded Amount (BDT)": Number(refundAmount.toFixed(2)),
      "Status": (item.status || "COMPLETED").toUpperCase(),
      "Remarks": item.note || item.remarks || "",
    };
  });

  const totalRow = {
    "SL": "TOTAL",
    "Return No": `Total Returns: ${returns.length}`,
    "Return Date": "",
    "Original Invoice": "",
    "Customer Name": "",
    "Customer Phone": "",
    "Items Count": sumItems,
    "Return Reason": "",
    "Refund Channel": "",
    "Return Value (BDT)": Number(sumReturnAmount.toFixed(2)),
    "Refunded Amount (BDT)": Number(sumRefundAmount.toFixed(2)),
    "Status": "",
    "Remarks": "",
  };

  const fullData = [...rows, totalRow];
  const worksheet = XLSX.utils.json_to_sheet(fullData, {
    header: Object.keys(rows[0]),
  });

  const colKeys = Object.keys(rows[0]);
  const colWidths = colKeys.map((key) => {
    let maxLen = key.length;
    fullData.forEach((row: any) => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

