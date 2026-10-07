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
    return rawDetails.length;
  }
  return (
    Number(p.itemCount ?? p.item_count ?? p.totalItems ?? p.total_items ?? p.itemsCount ?? p.items_count ?? 0) ||
    Number(p.totalQty ?? p.total_qty ?? p.quantity ?? 0) ||
    1
  );
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
