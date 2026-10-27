import * as XLSX from "xlsx";
import type { PurchaseItem, PurchaseReturnItem, CategoryItem, ProductCategoryItem } from "@/types";
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";

export interface GenericExcelExportOptions {
  fileName?: string;
  sheetName?: string;
  businessName?: string;
}

export type ExportPurchasesOptions = GenericExcelExportOptions;
export type ExportSalesOptions = GenericExcelExportOptions;

/**
 * Extracts items count from purchase/sale object across all known schemas
 */
const getItemsCount = (p: any): number => {
  if (!p) return 0;
  const rawDetails = p.purchaseDetails || p.salesDetails || p.returnDetails;

  if (Array.isArray(rawDetails) && rawDetails.length > 0) {
    const uniqueKeys = new Set<string>();
    rawDetails.forEach((d: any) => {
      const k = String(
        d.productId ?? d.productCode ?? d.pcode ?? d.productName ?? ""
      )
        .trim()
        .toLowerCase();
      if (k) uniqueKeys.add(k);
    });
    return uniqueKeys.size > 0 ? uniqueKeys.size : rawDetails.length;
  }
  const explicitCount = Number(p.itemCount ?? p.totalItems ?? 0);
  return explicitCount > 0 ? explicitCount : 1;
};

/**
 * Senior Developer Standard: Unified Excel Builder & File Generator.
 * Handles worksheet transformation, auto-fitting column widths, workbook generation, and trigger download.
 */
export function buildAndDownloadExcel<T extends Record<string, any>>(
  rows: T[],
  totalRow: T,
  options: GenericExcelExportOptions
): void {
  if (!rows || rows.length === 0) {
    throw new Error("No data available to export");
  }

  const fullData = [...rows, totalRow];
  const headers = Object.keys(rows[0]);
  const worksheet = XLSX.utils.json_to_sheet(fullData, { header: headers });

  // Auto-calculate column widths based on maximum content length
  worksheet["!cols"] = headers.map((key) => {
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

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || "Sheet1");
  XLSX.writeFile(workbook, options.fileName || "export.xlsx");
}

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

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Purchases_Report_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Purchases";

  let sumGrandTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumItems = 0;

  const rows = purchases.map((item: any, index: number) => {
    const grandTotal = Number(item.grandTotal ?? item.totalAmount ?? 0);
    const paidAmount = Number(item.paidAmount ?? 0);
    const dueAmount = Number(item.dueAmount ?? 0);
    const itemsCount = getItemsCount(item);
    const discount = Number(item.discount ?? 0);
    const vat = Number(item.vat ?? 0);
    const transport = Number(item.transportCost ?? 0);

    sumGrandTotal += grandTotal;
    sumPaid += paidAmount;
    sumDue += dueAmount;
    sumItems += itemsCount;

    let status = "PAID";
    if (dueAmount > 0 && paidAmount > 0) status = "PARTIAL";
    else if (dueAmount > 0 && paidAmount === 0) status = "DUE";

    return {
      SL: index + 1,
      "Order ID": item.orderNo || "",
      "Purchase Date":
        item.purchaseDate || (item.createdAt ? item.createdAt.substring(0, 10) : ""),
      "Supplier Name": item.supplierName || "Direct Supplier",
      "Supplier Phone": item.supplierPhone || "",
      "Supplier Address": item.supplierAddress || "",
      "Items Count": itemsCount,
      "Subtotal (BDT)": Number(
        (item.totalAmount || grandTotal - vat - transport + discount).toFixed(2)
      ),
      "Discount (BDT)": discount,
      "VAT (BDT)": vat,
      "Transport (BDT)": transport,
      "Grand Total (BDT)": grandTotal,
      "Paid Amount (BDT)": paidAmount,
      "Due Amount (BDT)": dueAmount,
      "Payment Method": (item.paymentType || "CASH").toUpperCase(),
      "Payment Status": status,
      "Challan No": item.challanNo || "",
      "Vehicle No": item.vehicleNo || "",
      "Driver Name": item.driverName || "",
      Notes: item.note || "",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Order ID": `Total Invoices: ${purchases.length}`,
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
    Notes: "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
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

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Sales_Report_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Sales";

  let sumGrandTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumItems = 0;

  const rows = sales.map((item: any, index: number) => {
    const grandTotal = Number(item.grandTotal ?? item.totalAmount ?? 0);
    const paidAmount = Number(item.paidAmount ?? 0);
    const dueAmount = Number(item.dueAmount ?? 0);
    const itemsCount = getItemsCount(item);
    const discount = Number(item.discount ?? 0);
    const vat = Number(item.vat ?? 0);
    const delivery = Number(item.deliveryCharge ?? 0);

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
      SL: index + 1,
      "Order ID": item.orderNo || "",
      "Sales Date": item.salesDate || todayStr,
      "Customer Name": item.customerName || "Walk-in Customer",
      "Customer Phone": item.customerPhone || "-",
      "Customer Address": item.customerAddress || "-",
      "Items Count": itemsCount,
      "Subtotal (BDT)": Number((item.totalAmount ?? grandTotal).toFixed(2)),
      "Discount (BDT)": discount,
      "VAT (BDT)": vat,
      "Delivery (BDT)": delivery,
      "Grand Total (BDT)": grandTotal,
      "Paid Amount (BDT)": paidAmount,
      "Due Amount (BDT)": dueAmount,
      "Payment Type": (item.paymentType || "CASH").toUpperCase(),
      Status: status,
      Notes: item.note || "",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Order ID": `Total Invoices: ${sales.length}`,
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
    Status: "",
    Notes: "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
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
      SL: index + 1,
      "Order ID": item.orderNo || "",
      "Return No": item.returnNo || "",
      "Return Date": item.returnDate || todayStr,
      "Original Invoice": item.salesInvoiceNo || item.invoiceNo || "",
      "Customer Name": item.customerName || "Walk-in Customer",
      "Customer Phone": item.customerPhone || "",
      "Items Count": itemsCount,
      "Refund Channel": (item.paymentType || "CASH").toUpperCase(),
      "Return Value (BDT)": Number(returnAmount.toFixed(2)),
      "Refunded Amount (BDT)": Number(refundAmount.toFixed(2)),
      Status: (item.status || "COMPLETED").toUpperCase(),
      Remarks: item.note || item.remarks || "",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Order ID": `Total Returns: ${returns.length}`,
    "Return No": "",
    "Return Date": "",
    "Original Invoice": "",
    "Customer Name": "",
    "Customer Phone": "",
    "Items Count": sumItems,
    "Refund Channel": "",
    "Return Value (BDT)": Number(sumReturnAmount.toFixed(2)),
    "Refunded Amount (BDT)": Number(sumRefundAmount.toFixed(2)),
    Status: "",
    Remarks: "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Enterprise standard Excel export for Purchase Returns
 */
export function exportPurchaseReturnToExcel(
  returns: PurchaseReturnItem[],
  options?: { fileName?: string; sheetName?: string }
): void {
  if (!returns || returns.length === 0) {
    throw new Error("No purchase return data available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Purchase_Returns_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Purchase Returns";

  let sumReturnAmount = 0;
  let sumRefundAmount = 0;
  let sumItems = 0;

  const rows = returns.map((item: any, index: number) => {
    const returnAmount = Number(item.totalAmount ?? 0);
    const refundAmount = Number(item.refundAmount ?? returnAmount);
    const details = item.returnDetails ?? [];
    const itemsCount = details.length > 0 ? details.length : Number(item.itemsCount || 1);

    sumReturnAmount += returnAmount;
    sumRefundAmount += refundAmount;
    sumItems += itemsCount;

    return {
      SL: index + 1,
      "Order ID": item.orderNo || "",
      "Return No": item.returnNo || "",
      "Return Date": item.returnDate || todayStr,
      "Original Invoice": item.purchaseInvoiceNo || item.invoiceNo || "",
      "Supplier Name": item.supplierName || "Direct Supplier",
      "Supplier Phone": item.supplierPhone || "",
      "Items Count": itemsCount,
      "Refund Channel": (item.paymentType || "CASH").toUpperCase(),
      "Return Value (BDT)": Number(returnAmount.toFixed(2)),
      "Refunded Amount (BDT)": Number(refundAmount.toFixed(2)),
      Status: (item.status || "COMPLETED").toUpperCase(),
      Remarks: item.note || item.remarks || "",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Order ID": `Total Returns: ${returns.length}`,
    "Return No": "",
    "Return Date": "",
    "Original Invoice": "",
    "Supplier Name": "",
    "Supplier Phone": "",
    "Items Count": sumItems,
    "Refund Channel": "",
    "Return Value (BDT)": Number(sumReturnAmount.toFixed(2)),
    "Refunded Amount (BDT)": Number(sumRefundAmount.toFixed(2)),
    Status: "",
    Remarks: "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Enterprise standard Excel export for Categories
 */
export function exportCategoriesToExcel(
  categories: CategoryItem[],
  options?: GenericExcelExportOptions
): void {
  if (!categories || categories.length === 0) {
    throw new Error("No category records available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Expense_Income_Categories_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Categories";

  const rows = categories.map((item, index) => {
    return {
      SL: index + 1,
      "Category Name": item.categoryName || "",
      Type: normalizeCategoryType(item.type),
      Status: item.status || "Active",
      "System Default": isCategoryAdmin(item) ? "Yes" : "No",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Category Name": `Total Categories: ${categories.length}`,
    Type: "",
    Status: "",
    "System Default": "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Enterprise standard Excel export for Product Categories
 */
export function exportProductCategoriesToExcel(
  categories: ProductCategoryItem[],
  options?: GenericExcelExportOptions
): void {
  if (!categories || categories.length === 0) {
    throw new Error("No product category records available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Product_Categories_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Product Categories";

  const rows = categories.map((item, index) => {
    return {
      SL: index + 1,
      "Category Name": item.name || "",
      Description: item.description || "—",
      Status: item.status || "Active",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Category Name": `Total Categories: ${categories.length}`,
    Description: "",
    Status: "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}


