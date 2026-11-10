import moment from "moment";
import { formatMoney } from "@/utils/formatters";
import {
  buildAndDownloadExcel,
  exportSalesToExcel,
  resolveThemeArgb,
  argbToRgbTuple,
  formatReportDate,
  fetchLogoBase64,
} from "@/utils/excel-export";
import { useBusinessProfileQuery } from "@/hooks/useBusinessProfile";
import { getFileViewUrl } from "@/services/file-upload-service";
import { getUserInfo } from "@/utils/auth-storage";
import type { SaleItem } from "@/types";
import type { RowInput, Styles } from "jspdf-autotable";

export type ReportTab = "invoices" | "products" | "customers";

export interface ProductSummary {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  totalRevenue: number;
  totalDiscount: number;
  invoicesCount: number;
}

export interface CustomerSummary {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  invoicesCount: number;
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  lastDate: string;
}

export interface ReportCompanyMeta {
  businessName: string;
  businessAddress: string;
  businessLogoUrl: string;
  startDate?: string;
  endDate?: string;
}

export interface SaleReportMetrics {
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  saleDate: string;
  grandTotal: number;
  paid: number;
  due: number;
  subtotal: number;
  discount: number;
  vat: number;
  paymentType: string;
  details: any[];
  itemsCount: number;
  isFullyPaid: boolean;
  isPartial: boolean;
  status: "PAID" | "PARTIAL" | "DUE";
}

/**
 * Extracts transaction line items across all supported backend property names
 */
export function extractSaleLineItems(item: any): any[] {
  if (!item) return [];
  const candidates = [
    item.salesDetails,
    item.saleDetails,
    item.details,
    item.items,
    item.productsList,
  ];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  }
  return [];
}

/**
 * Single source of truth for normalizing sale transaction numbers, fields, and payment status
 */
export function extractSaleReportMetrics(
  item: any,
  fallbackIndex = 0
): SaleReportMetrics {
  const grandTotal = Number(
    item?.grandTotal ?? item?.grand_total ?? item?.totalAmount ?? 0
  );
  const paid = Number(item?.paidAmount ?? item?.paid_amount ?? 0);
  const due = Number(
    item?.dueAmount ?? item?.due_amount ?? Math.max(0, grandTotal - paid)
  );
  const subtotal = Number(
    item?.totalAmount ?? item?.total_amount ?? grandTotal
  );
  const discount = Number(item?.discount ?? 0);
  const vat = Number(item?.vat ?? 0);
  const paymentType = String(
    item?.paymentType || item?.payment_type || "CASH"
  ).toUpperCase();

  const details = extractSaleLineItems(item);
  const itemsCount =
    details.length > 0 ? details.length : Number(item?.itemsCount || 1);

  const isFullyPaid = due <= 0 && grandTotal > 0;
  const isPartial = due > 0 && paid > 0;
  const status = isFullyPaid ? "PAID" : isPartial ? "PARTIAL" : "DUE";

  return {
    orderNo:
      item?.orderNo ||
      item?.invoiceNo ||
      `ORD-${item?.id || fallbackIndex + 1}`,
    customerName:
      item?.customerName ||
      item?.customer_name ||
      item?.partyName ||
      "Walk-in Customer",
    customerPhone:
      item?.customerPhone ||
      item?.customer_phone ||
      item?.partyPhone ||
      "",
    customerAddress:
      item?.customerAddress ||
      item?.customer_address ||
      item?.partyAddress ||
      "",
    saleDate: item?.salesDate || item?.saleDate || item?.date || "",
    grandTotal,
    paid,
    due,
    subtotal,
    discount,
    vat,
    paymentType,
    details,
    itemsCount,
    isFullyPaid,
    isPartial,
    status,
  };
}

export function calculateProductTotals(products: ProductSummary[]) {
  return products.reduce(
    (acc, p) => {
      acc.totalQuantity += p.totalQuantity;
      acc.totalRevenue += p.totalRevenue;
      acc.totalDiscount += p.totalDiscount;
      return acc;
    },
    { totalQuantity: 0, totalRevenue: 0, totalDiscount: 0 }
  );
}

export function calculateRevenueSharePct(
  revenue: number,
  totalRevenue: number
): string {
  return totalRevenue > 0
    ? ((revenue / totalRevenue) * 100).toFixed(1)
    : "0.0";
}

export function calculateCustomerTotals(customers: CustomerSummary[]) {
  return customers.reduce(
    (acc, c) => {
      acc.totalOrders += c.invoicesCount;
      acc.totalBilled += c.totalBilled;
      acc.totalPaid += c.totalPaid;
      acc.totalDue += c.totalDue;
      return acc;
    },
    { totalOrders: 0, totalBilled: 0, totalPaid: 0, totalDue: 0 }
  );
}

/**
 * Shared hook to resolve business name, address, and logo URL consistently across report tables
 */
export function useReportCompanyMeta(
  startDate?: string,
  endDate?: string
): ReportCompanyMeta {
  const { data: businessProfile } = useBusinessProfileQuery();
  const userInfo = getUserInfo();
  const logoKey =
    businessProfile?.businessLogo || businessProfile?.businessLogoRefNo || "";
  const businessLogoUrl =
    businessProfile?.businessLogoUrl ||
    (logoKey ? getFileViewUrl(logoKey) : "");

  return {
    businessName:
      businessProfile?.businessName ||
      userInfo?.orgName ||
      "Cash Boi Trade Ltd",
    businessAddress: businessProfile?.address || "",
    businessLogoUrl,
    startDate,
    endDate,
  };
}

/**
 * Aggregates transaction line items into unique Product-Wise Sales summaries
 */
export function aggregateProductSales(
  transactions: SaleItem[]
): ProductSummary[] {
  const map: Record<string, ProductSummary> = {};

  transactions.forEach((tx: any) => {
    const details = extractSaleLineItems(tx);

    details.forEach((line: any) => {
      const pId = String(
        line.productId || line.product_id || line.id || line.pcode || "unknown"
      );
      const pCode =
        line.productCode ||
        line.product_code ||
        line.pcode ||
        line.code ||
        "-";
      const pName =
        line.productName ||
        line.product_name ||
        line.name ||
        line.title ||
        "Unnamed Product";
      const unit = line.unit || "pcs";
      const qty = Number(line.quantity ?? line.qty ?? 1);
      const price = Number(
        line.sellPrice ?? line.sell_price ?? line.price ?? line.rate ?? 0
      );
      const lineTotal =
        Number(line.total ?? line.total_price ?? 0) || qty * price;
      const disc = Number(line.discount ?? 0);

      const key = pCode !== "-" ? pCode : pName;

      if (!map[key]) {
        map[key] = {
          productId: pId,
          productCode: pCode,
          productName: pName,
          unit,
          totalQuantity: 0,
          totalRevenue: 0,
          totalDiscount: 0,
          invoicesCount: 0,
        };
      }

      map[key].totalQuantity += qty;
      map[key].totalRevenue += lineTotal;
      map[key].totalDiscount += disc;
      map[key].invoicesCount += 1;
    });
  });

  return Object.values(map);
}

/**
 * Aggregates transactions into unique Customer-Wise Sales summaries
 */
export function aggregateCustomerSales(
  transactions: SaleItem[]
): CustomerSummary[] {
  const map: Record<string, CustomerSummary> = {};

  transactions.forEach((tx: any) => {
    const cId = String(
      tx.customerId || tx.customer_id || tx.partyId || "walkin"
    );
    const {
      customerName: cName,
      customerPhone: cPhone,
      customerAddress: cAddr,
      saleDate: date,
      grandTotal: gt,
      paid,
      due,
    } = extractSaleReportMetrics(tx);

    const key = cPhone ? `${cName}_${cPhone}` : cName;

    if (!map[key]) {
      map[key] = {
        customerId: cId,
        customerName: cName,
        customerPhone: cPhone,
        customerAddress: cAddr,
        invoicesCount: 0,
        totalBilled: 0,
        totalPaid: 0,
        totalDue: 0,
        lastDate: date,
      };
    }

    map[key].invoicesCount += 1;
    map[key].totalBilled += gt;
    map[key].totalPaid += paid;
    map[key].totalDue += due;

    if (
      date &&
      (!map[key].lastDate || moment(date).isAfter(moment(map[key].lastDate)))
    ) {
      map[key].lastDate = date;
    }
  });

  return Object.values(map);
}

export async function exportFilteredInvoicesExcel(
  invoices: SaleItem[],
  meta: ReportCompanyMeta
): Promise<number> {
  if (!invoices || invoices.length === 0) {
    throw new Error("No sales records available to export");
  }
  await exportSalesToExcel(invoices, {
    ...meta,
    fileName: `Sales_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Sales Report",
    reportTitle: "Sales Report",
  });
  return invoices.length;
}

export async function exportFilteredProductsExcel(
  products: ProductSummary[],
  meta: ReportCompanyMeta
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error("No product sales records available to export");
  }

  const { totalQuantity, totalRevenue, totalDiscount } =
    calculateProductTotals(products);
  const data = products.map((p, idx) => ({
    SL: idx + 1,
    "Product Code": p.productCode,
    "Product Name": p.productName,
    Unit: p.unit,
    "Quantity Sold": p.totalQuantity,
    "Invoices Sold": p.invoicesCount,
    "Total Revenue (BDT)": p.totalRevenue,
    "Discount (BDT)": p.totalDiscount,
    "Share of Sales": `${calculateRevenueSharePct(p.totalRevenue, totalRevenue)}%`,
  }));

  const totalRow = {
    SL: `TOTAL SUMMARY (${data.length} Products)`,
    "Product Code": "",
    "Product Name": "",
    Unit: "",
    "Quantity Sold": totalQuantity,
    "Invoices Sold": "",
    "Total Revenue (BDT)": Number(totalRevenue.toFixed(2)),
    "Discount (BDT)": Number(totalDiscount.toFixed(2)),
    "Share of Sales": "100.0%",
  };

  await buildAndDownloadExcel(data, totalRow, {
    ...meta,
    fileName: `Product_Sales_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Product Sales",
    reportTitle: "Product-Wise Sales Report",
    totalLabel: "Total Products",
    totalSummarySpan: 4,
    includeSignatures: true,
  });

  return data.length;
}

export async function exportFilteredCustomersExcel(
  customers: CustomerSummary[],
  meta: ReportCompanyMeta
): Promise<number> {
  if (!customers || customers.length === 0) {
    throw new Error("No customer sales records available to export");
  }

  const data = customers.map((c, idx) => ({
    SL: idx + 1,
    "Customer Name": c.customerName,
    Phone: c.customerPhone || "-",
    Address: c.customerAddress || "-",
    "Total Orders": c.invoicesCount,
    "Total Billed (BDT)": c.totalBilled,
    "Total Paid (BDT)": c.totalPaid,
    "Outstanding Due (BDT)": c.totalDue,
    "Last Order Date": c.lastDate
      ? moment(c.lastDate).format("DD MMM YYYY")
      : "-",
    Status: c.totalDue > 0 ? "Has Due" : "Settled",
  }));

  const { totalBilled, totalPaid, totalDue } =
    calculateCustomerTotals(customers);

  const totalRow = {
    SL: `TOTAL SUMMARY (${data.length} Customers)`,
    "Customer Name": "",
    Phone: "",
    Address: "",
    "Total Orders": "",
    "Total Billed (BDT)": Number(totalBilled.toFixed(2)),
    "Total Paid (BDT)": Number(totalPaid.toFixed(2)),
    "Outstanding Due (BDT)": Number(totalDue.toFixed(2)),
    "Last Order Date": "",
    Status: "",
  };

  await buildAndDownloadExcel(data, totalRow, {
    ...meta,
    fileName: `Customer_Sales_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Customer Sales",
    reportTitle: "Customer-Wise Sales Report",
    totalLabel: "Total Customers",
    totalSummarySpan: 4,
    includeSignatures: true,
  });

  return data.length;
}
interface PdfLogoResult {
  dataUri: string;
  format: "PNG" | "JPEG";
  w: number;
  h: number;
}

async function getLogoForPdf(url?: string): Promise<PdfLogoResult | null> {
  const logo = await fetchLogoBase64(url);
  if (!logo) return null;
  const dataUri = `data:image/${logo.extension};base64,${logo.base64}`;
  const format = logo.extension === "jpeg" ? "JPEG" : "PNG";

  try {
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const natW = img.naturalWidth || 100;
        const natH = img.naturalHeight || 40;
        const maxH = 10.5; // mm
        const maxW = 28; // mm
        let w = (natW / natH) * maxH;
        let h = maxH;
        if (w > maxW) {
          h = (natH / natW) * maxW;
          w = maxW;
        }
        resolve({ w, h });
      };
      img.onerror = () => resolve({ w: 11, h: 10.5 });
      img.src = dataUri;
    });
    return { dataUri, format, w: dims.w, h: dims.h };
  } catch {
    return { dataUri, format, w: 11, h: 10.5 };
  }
}

interface CorporatePdfConfig {
  fileName: string;
  reportTitle: string;
  metaRightLabel: string;
  headers: string[];
  bodyRows: RowInput[];
  columnStyles: { [key: string]: Partial<Styles> };
  meta: ReportCompanyMeta;
}

async function generateAndDownloadCorporatePdf(
  config: CorporatePdfConfig
): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 10;
  const rightEdge = pageWidth - marginX;
  const themeRgb = argbToRgbTuple(resolveThemeArgb());

  const { businessName, businessAddress, businessLogoUrl, startDate, endDate } =
    config.meta;

  const printDate = formatReportDate(new Date().toISOString());
  const fromStr = startDate ? formatReportDate(startDate) : "ALL";
  const toStr = endDate ? formatReportDate(endDate) : printDate;

  // ── Top Corporate Header (Compact, No Phone Number) ──
  const logo = await getLogoForPdf(businessLogoUrl);
  let textStartX = marginX;

  if (logo) {
    try {
      doc.addImage(logo.dataUri, logo.format, marginX, 7.5, logo.w, logo.h);
      textStartX = marginX + logo.w + 3;
    } catch (err) {
      console.warn("Could not embed logo in PDF:", err);
    }
  }

  // Company Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(businessName || "Cash Boi Trade Ltd", textStartX, 11.5);

  // Company Address
  if (businessAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(businessAddress, textStartX, 16);
  }

  // Print Date (Top Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Print Date: ${printDate}`, rightEdge, 11.5, { align: "right" });

  // Centered Report Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(config.reportTitle.toUpperCase(), pageWidth / 2, 22, {
    align: "center",
  });

  // Meta Filter Row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`From Date: ${fromStr}   To Date: ${toStr}`, marginX, 27);
  doc.text(config.metaRightLabel, rightEdge, 27, { align: "right" });

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.line(marginX, 29, rightEdge, 29);

  // ── Data Table (Global Theme Color Header + Last-Page Summary Row) ──
  autoTable(doc, {
    head: [config.headers],
    body: config.bodyRows,
    startY: 31,
    margin: { top: 10, right: marginX, bottom: 14, left: marginX },
    theme: "grid",
    showHead: "everyPage",
    headStyles: {
      fillColor: themeRgb,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      valign: "middle",
      lineWidth: 0.2,
      lineColor: [148, 163, 184],
      cellPadding: { top: 2.2, right: 1.8, bottom: 2.2, left: 1.8 },
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [15, 23, 42],
      valign: "middle",
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
      cellPadding: { top: 1.8, right: 1.8, bottom: 1.8, left: 1.8 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: config.columnStyles,
    didParseCell: (hookData) => {
      // Match header horizontal alignment with its column alignment
      if (hookData.section === "head") {
        const colStyle = config.columnStyles[String(hookData.column.index)];
        if (colStyle?.halign) {
          hookData.cell.styles.halign = colStyle.halign;
        }
      }
    },
  });

  // ── Signatures Block on Last Page ──
  let sigY = ((doc as any).lastAutoTable?.finalY || 45) + 18;
  if (sigY > pageHeight - 16) {
    doc.addPage();
    sigY = 26;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const sigBlocks = [
    { x1: 20, x2: 68, cx: 44, label: "Prepared By" },
    { x1: 124.5, x2: 172.5, cx: 148.5, label: "Checked By" },
    { x1: 229, x2: 277, cx: 253, label: "Authorized Signatory" },
  ];
  sigBlocks.forEach((b) => {
    doc.line(b.x1, sigY, b.x2, sigY);
    doc.text(b.label, b.cx, sigY + 4.5, { align: "center" });
  });

  // ── Page Numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${p} of ${totalPages}`, rightEdge, pageHeight - 6, {
      align: "right",
    });
  }

  // Trigger direct PDF download
  doc.save(config.fileName);
}

const SUMMARY_FILL: [number, number, number] = [241, 245, 249];
const EMERALD_RGB: [number, number, number] = [4, 120, 87];
const ROSE_RGB: [number, number, number] = [185, 28, 28];
const AMBER_RGB: [number, number, number] = [217, 119, 6];
const DARK_RGB: [number, number, number] = [15, 23, 42];
const MUTED_RGB: [number, number, number] = [100, 116, 139];

export async function downloadFilteredInvoicesPdf(
  invoices: SaleItem[],
  meta: ReportCompanyMeta
): Promise<void> {
  if (!invoices || invoices.length === 0) {
    throw new Error("No sales records available to download PDF");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  let sumSub = 0;
  let sumDisc = 0;
  let sumVat = 0;
  let sumGt = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumItems = 0;

  const dataRows: RowInput[] = invoices.map((t: any, idx: number) => {
    const m = extractSaleReportMetrics(t, idx);
    const dateStr = m.saleDate
      ? moment(m.saleDate).format("DD-MMM-YYYY").toUpperCase()
      : "-";

    sumSub += m.subtotal;
    sumDisc += m.discount;
    sumVat += m.vat;
    sumGt += m.grandTotal;
    sumPaid += m.paid;
    sumDue += m.due;
    sumItems += m.itemsCount;

    const statusColor =
      m.status === "PAID"
        ? EMERALD_RGB
        : m.status === "PARTIAL"
        ? AMBER_RGB
        : ROSE_RGB;

    return [
      idx + 1,
      {
        content: m.orderNo,
        styles: { fontStyle: "bold" },
      },
      dateStr,
      m.customerName,
      m.customerPhone || "-",
      m.itemsCount,
      formatMoney(m.subtotal),
      m.discount > 0 ? formatMoney(m.discount) : "-",
      m.vat > 0 ? formatMoney(m.vat) : "-",
      { content: formatMoney(m.grandTotal), styles: { fontStyle: "bold" } },
      {
        content: formatMoney(m.paid),
        styles: { fontStyle: "bold", textColor: EMERALD_RGB },
      },
      {
        content: m.due > 0 ? formatMoney(m.due) : "-",
        styles: {
          fontStyle: "bold",
          textColor: m.due > 0 ? ROSE_RGB : MUTED_RGB,
        },
      },
      m.paymentType,
      {
        content: m.status,
        styles: { fontStyle: "bold", textColor: statusColor },
      },
    ];
  });

  const summaryRow: RowInput = [
    {
      content: `TOTAL SUMMARY (${invoices.length} Invoices)`,
      colSpan: 5,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: DARK_RGB,
      },
    },
    {
      content: sumItems,
      styles: { halign: "center", fontStyle: "bold", fillColor: SUMMARY_FILL },
    },
    {
      content: formatMoney(sumSub),
      styles: { halign: "right", fontStyle: "bold", fillColor: SUMMARY_FILL },
    },
    {
      content: sumDisc > 0 ? formatMoney(sumDisc) : "-",
      styles: { halign: "right", fontStyle: "bold", fillColor: SUMMARY_FILL },
    },
    {
      content: sumVat > 0 ? formatMoney(sumVat) : "-",
      styles: { halign: "right", fontStyle: "bold", fillColor: SUMMARY_FILL },
    },
    {
      content: formatMoney(sumGt),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: themeRgb,
      },
    },
    {
      content: formatMoney(sumPaid),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: EMERALD_RGB,
      },
    },
    {
      content: sumDue > 0 ? formatMoney(sumDue) : "-",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: sumDue > 0 ? ROSE_RGB : MUTED_RGB,
      },
    },
    {
      content: "",
      colSpan: 2,
      styles: { fillColor: SUMMARY_FILL },
    },
  ];

  await generateAndDownloadCorporatePdf({
    fileName: `Sales_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Sales Report",
    metaRightLabel: `Total Invoices: ${invoices.length}`,
    headers: [
      "SL",
      "Order ID",
      "Date",
      "Customer Name",
      "Phone",
      "Items",
      "Subtotal (BDT)",
      "Discount (BDT)",
      "VAT (BDT)",
      "Grand Total (BDT)",
      "Paid (BDT)",
      "Due (BDT)",
      "Method",
      "Status",
    ],
    bodyRows: [...dataRows, summaryRow],
    columnStyles: {
      "0": { halign: "center", cellWidth: 10 },
      "1": { halign: "left" },
      "2": { halign: "center" },
      "3": { halign: "left" },
      "4": { halign: "center" },
      "5": { halign: "center", cellWidth: 12 },
      "6": { halign: "right" },
      "7": { halign: "right" },
      "8": { halign: "right" },
      "9": { halign: "right" },
      "10": { halign: "right" },
      "11": { halign: "right" },
      "12": { halign: "center" },
      "13": { halign: "center" },
    },
    meta,
  });
}

export async function downloadFilteredProductsPdf(
  products: ProductSummary[],
  meta: ReportCompanyMeta
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error("No product sales records available to download PDF");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const { totalQuantity, totalRevenue, totalDiscount } =
    calculateProductTotals(products);

  const dataRows: RowInput[] = products.map((p, idx) => {
    const avgRate = p.totalQuantity > 0 ? p.totalRevenue / p.totalQuantity : 0;
    const share = calculateRevenueSharePct(p.totalRevenue, totalRevenue);

    return [
      idx + 1,
      { content: p.productCode, styles: { fontStyle: "bold" } },
      p.productName,
      p.unit,
      p.invoicesCount,
      { content: p.totalQuantity, styles: { fontStyle: "bold" } },
      formatMoney(avgRate),
      p.totalDiscount > 0 ? formatMoney(p.totalDiscount) : "-",
      { content: formatMoney(p.totalRevenue), styles: { fontStyle: "bold" } },
      `${share}%`,
    ];
  });

  const summaryRow: RowInput = [
    {
      content: `TOTAL SUMMARY (${products.length} Products)`,
      colSpan: 5,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: DARK_RGB,
      },
    },
    {
      content: totalQuantity,
      styles: { halign: "right", fontStyle: "bold", fillColor: SUMMARY_FILL },
    },
    { content: "", styles: { fillColor: SUMMARY_FILL } },
    {
      content: totalDiscount > 0 ? formatMoney(totalDiscount) : "-",
      styles: { halign: "right", fontStyle: "bold", fillColor: SUMMARY_FILL },
    },
    {
      content: formatMoney(totalRevenue),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: themeRgb,
      },
    },
    {
      content: "100.0%",
      styles: { halign: "right", fontStyle: "bold", fillColor: SUMMARY_FILL },
    },
  ];

  await generateAndDownloadCorporatePdf({
    fileName: `Product_Sales_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Product-Wise Sales Report",
    metaRightLabel: `Total Products: ${products.length}`,
    headers: [
      "SL",
      "Product Code",
      "Product Description",
      "Unit",
      "Orders",
      "Qty Sold",
      "Avg Rate (BDT)",
      "Discounts (BDT)",
      "Net Revenue (BDT)",
      "Share (%)",
    ],
    bodyRows: [...dataRows, summaryRow],
    columnStyles: {
      "0": { halign: "center", cellWidth: 10 },
      "1": { halign: "left" },
      "2": { halign: "left" },
      "3": { halign: "center" },
      "4": { halign: "center" },
      "5": { halign: "right" },
      "6": { halign: "right" },
      "7": { halign: "right" },
      "8": { halign: "right" },
      "9": { halign: "right" },
    },
    meta,
  });
}

export async function downloadFilteredCustomersPdf(
  customers: CustomerSummary[],
  meta: ReportCompanyMeta
): Promise<void> {
  if (!customers || customers.length === 0) {
    throw new Error("No customer sales records available to download PDF");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const { totalOrders, totalBilled, totalPaid, totalDue } =
    calculateCustomerTotals(customers);

  const dataRows: RowInput[] = customers.map((c, idx) => {
    const hasDue = c.totalDue > 0;
    const status = hasDue ? "Has Due" : "Settled";
    const lastStr = c.lastDate
      ? moment(c.lastDate).format("DD-MMM-YYYY").toUpperCase()
      : "-";

    return [
      idx + 1,
      { content: c.customerName, styles: { fontStyle: "bold" } },
      c.customerPhone || "-",
      c.customerAddress || "-",
      c.invoicesCount,
      { content: formatMoney(c.totalBilled), styles: { fontStyle: "bold" } },
      {
        content: formatMoney(c.totalPaid),
        styles: { fontStyle: "bold", textColor: EMERALD_RGB },
      },
      {
        content: hasDue ? formatMoney(c.totalDue) : "-",
        styles: {
          fontStyle: "bold",
          textColor: hasDue ? ROSE_RGB : MUTED_RGB,
        },
      },
      lastStr,
      {
        content: status,
        styles: {
          fontStyle: "bold",
          textColor: hasDue ? ROSE_RGB : EMERALD_RGB,
        },
      },
    ];
  });

  const summaryRow: RowInput = [
    {
      content: `TOTAL SUMMARY (${customers.length} Customers)`,
      colSpan: 4,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: DARK_RGB,
      },
    },
    {
      content: totalOrders,
      styles: { halign: "center", fontStyle: "bold", fillColor: SUMMARY_FILL },
    },
    {
      content: formatMoney(totalBilled),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: themeRgb,
      },
    },
    {
      content: formatMoney(totalPaid),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: EMERALD_RGB,
      },
    },
    {
      content: totalDue > 0 ? formatMoney(totalDue) : "-",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL,
        textColor: totalDue > 0 ? ROSE_RGB : MUTED_RGB,
      },
    },
    {
      content: "",
      colSpan: 2,
      styles: { fillColor: SUMMARY_FILL },
    },
  ];

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Sales_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Customer-Wise Sales Report",
    metaRightLabel: `Total Customers: ${customers.length}`,
    headers: [
      "SL",
      "Customer Name",
      "Phone",
      "Address",
      "Orders",
      "Gross Billed (BDT)",
      "Total Paid (BDT)",
      "Outstanding Due (BDT)",
      "Last Order",
      "Status",
    ],
    bodyRows: [...dataRows, summaryRow],
    columnStyles: {
      "0": { halign: "center", cellWidth: 10 },
      "1": { halign: "left" },
      "2": { halign: "center" },
      "3": { halign: "left" },
      "4": { halign: "center" },
      "5": { halign: "right" },
      "6": { halign: "right" },
      "7": { halign: "right" },
      "8": { halign: "center" },
      "9": { halign: "center" },
    },
    meta,
  });
}
