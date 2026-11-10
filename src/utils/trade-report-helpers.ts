import { useState } from "react";
import moment from "moment";
import { formatMoney } from "@/utils/formatters";
import {
  buildAndDownloadExcel,
  resolveThemeArgb,
  argbToRgbTuple,
  formatReportDate,
  fetchLogoBase64,
} from "@/utils/excel-export";
import { useBusinessProfileQuery } from "@/hooks/useBusinessProfile";
import { getFileViewUrl } from "@/services/file-upload-service";
import { getUserInfo } from "@/utils/auth-storage";
import { getPurchaseDateString } from "@/pages/admin/trade/purchases/hooks/usePurchaseTableFilter";
import type { RowInput, Styles } from "jspdf-autotable";

export type TradeDomain = "sale" | "purchase";
export type TradeReportTab = "invoices" | "products" | "parties";

export interface ReportCompanyMeta {
  businessName: string;
  businessAddress: string;
  businessLogoUrl: string;
  startDate?: string;
  endDate?: string;
}

export interface TradeRecordMetrics {
  orderNo: string;
  partyId: string;
  partyName: string;
  partyPhone: string;
  partyAddress: string;
  tradeDate: string;
  grandTotal: number;
  paid: number;
  due: number;
  subtotal: number;
  discount: number;
  vat: number;
  transportCost: number;
  paymentType: string;
  details: any[];
  itemsCount: number;
  isFullyPaid: boolean;
  isPartial: boolean;
  status: "PAID" | "PARTIAL" | "DUE";
}

export interface ProductTradeSummary {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  totalAmount: number;
  totalDiscount: number;
  invoicesCount: number;
}

export interface PartyTradeSummary {
  partyId: string;
  partyName: string;
  partyPhone: string;
  partyAddress: string;
  invoicesCount: number;
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  lastDate: string;
}

export const REPORT_RGB = {
  summaryFill: [241, 245, 249] as [number, number, number],
  emerald: [4, 120, 87] as [number, number, number],
  rose: [185, 28, 28] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
};

/**
 * Shared hook to manage preset + custom date range synchronized with DateRangePicker
 */
export function useReportDateRange() {
  const [dateRange, setDateRange] = useState<string>("this_month");
  const [startDate, setStartDate] = useState<string>(() =>
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(() =>
    moment().endOf("month").format("YYYY-MM-DD")
  );

  const handleDateChange = ({
    startDate: s,
    endDate: e,
    label,
  }: {
    startDate: string;
    endDate: string;
    label?: string;
  }) => {
    if (label === "all") {
      setStartDate("");
      setEndDate("");
      setDateRange("all");
      return;
    }
    if (label === "custom") {
      if (s && e) {
        setStartDate(s);
        setEndDate(e);
      }
      setDateRange("custom");
      return;
    }
    setStartDate(s);
    setEndDate(e);
    if (label) setDateRange(label);
  };

  return {
    dateRange,
    setDateRange,
    startDate,
    endDate,
    handleDateChange,
  };
}

/**
 * Shared hook to resolve business name, address, and logo URL consistently across report views
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
 * Extracts transaction line items across all supported backend property names
 */
export function extractTradeLineItems(
  item: any,
  domain: TradeDomain = "sale"
): any[] {
  if (!item) return [];
  const candidates =
    domain === "purchase"
      ? [
          item.purchaseDetails,
          item.purchasesDetails,
          item.details,
          item.items,
          item.productsList,
        ]
      : [
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
 * Single source of truth for normalizing sale or purchase record fields, metrics, and status
 */
export function extractTradeRecordMetrics(
  item: any,
  domain: TradeDomain = "sale",
  fallbackIndex = 0
): TradeRecordMetrics {
  const isPurchase = domain === "purchase";
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
  const transportCost = Number(
    item?.transportCost ?? item?.transport_cost ?? item?.delivery_charge ?? item?.deliveryCharge ?? 0
  );
  const paymentType = String(
    item?.paymentType || item?.payment_type || "CASH"
  ).toUpperCase();

  const details = extractTradeLineItems(item, domain);
  const itemsCount =
    details.length > 0 ? details.length : Number(item?.itemsCount || 1);

  const isFullyPaid = due <= 0 && grandTotal > 0;
  const isPartial = due > 0 && paid > 0;
  const status = isFullyPaid ? "PAID" : isPartial ? "PARTIAL" : "DUE";

  const partyId = String(
    isPurchase
      ? item?.supplierId ?? item?.supplier_id ?? item?.partyId ?? "direct"
      : item?.customerId ?? item?.customer_id ?? item?.partyId ?? "walkin"
  );

  const partyName = isPurchase
    ? item?.supplierName ||
      item?.supplier_name ||
      item?.partyName ||
      item?.supplier ||
      "Direct Supplier"
    : item?.customerName ||
      item?.customer_name ||
      item?.partyName ||
      "Walk-in Customer";

  const partyPhone = isPurchase
    ? item?.supplierPhone ||
      item?.supplier_phone ||
      item?.partyPhone ||
      item?.phone ||
      ""
    : item?.customerPhone ||
      item?.customer_phone ||
      item?.partyPhone ||
      "";

  const partyAddress = isPurchase
    ? item?.supplierAddress ||
      item?.supplier_address ||
      item?.partyAddress ||
      item?.address ||
      ""
    : item?.customerAddress ||
      item?.customer_address ||
      item?.partyAddress ||
      "";

  const tradeDate = isPurchase
    ? getPurchaseDateString(item) ||
      item?.purchaseDate ||
      item?.date ||
      item?.createdAt ||
      ""
    : item?.salesDate || item?.saleDate || item?.date || "";

  return {
    orderNo:
      item?.orderNo ||
      item?.invoiceNo ||
      `${isPurchase ? "PO" : "ORD"}-${item?.id || fallbackIndex + 1}`,
    partyId,
    partyName,
    partyPhone,
    partyAddress,
    tradeDate,
    grandTotal,
    paid,
    due,
    subtotal,
    discount,
    vat,
    transportCost,
    paymentType,
    details,
    itemsCount,
    isFullyPaid,
    isPartial,
    status,
  };
}

/**
 * Computes KPI totals for TradeInvoiceStats across sales & purchases
 */
export function computeTradeKpiTotals(
  records: any[],
  domain: TradeDomain
): { totalAmount: number; totalPaid: number; totalDue: number } {
  let totalAmount = 0;
  let totalPaid = 0;
  let totalDue = 0;

  records.forEach((record) => {
    const metrics = extractTradeRecordMetrics(record, domain);
    totalAmount += metrics.grandTotal;
    totalPaid += metrics.paid;
    totalDue += metrics.due;
  });

  return { totalAmount, totalPaid, totalDue };
}

/**
 * Filters records by inclusive date range and assigns deterministic fallback order numbers
 */
export function filterAndNormalizeReportTransactions<T extends Record<string, any>>(
  records: T[],
  options: {
    startDate?: string;
    endDate?: string;
    domain: TradeDomain;
    orderPrefix: "SO" | "PO";
  }
): T[] {
  const { startDate, endDate, domain, orderPrefix } = options;

  let filtered = records;
  if (startDate && endDate) {
    const start = moment(startDate).startOf("day");
    const end = moment(endDate).endOf("day");
    filtered = records.filter((item) => {
      const dStr =
        domain === "purchase"
          ? getPurchaseDateString(item) || item.purchaseDate || item.createdAt
          : item.salesDate || item.saleDate || item.date || item.createdAt;
      if (!dStr) return true;
      return moment(dStr).isBetween(start, end, undefined, "[]");
    });
  }

  return filtered.map((item, idx) => ({
    ...item,
    orderNo:
      item.orderNo ||
      (item.invoiceNo
        ? String(item.invoiceNo).replace("INV-", `${orderPrefix}-`)
        : `${orderPrefix}-${1000 + (item.id || idx)}`),
  }));
}

/**
 * Aggregates transaction line items into unique Product-Wise summaries
 */
export function aggregateTradeProducts(
  transactions: any[],
  domain: TradeDomain
): ProductTradeSummary[] {
  const map: Record<string, ProductTradeSummary> = {};

  transactions.forEach((tx: any) => {
    const details = extractTradeLineItems(tx, domain);

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
      const price =
        domain === "purchase"
          ? Number(
              line.buyPrice ??
                line.buy_price ??
                line.purchasePrice ??
                line.price ??
                line.rate ??
                0
            )
          : Number(
              line.sellPrice ??
                line.sell_price ??
                line.price ??
                line.rate ??
                0
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
          totalAmount: 0,
          totalDiscount: 0,
          invoicesCount: 0,
        };
      }

      map[key].totalQuantity += qty;
      map[key].totalAmount += lineTotal;
      map[key].totalDiscount += disc;
      map[key].invoicesCount += 1;
    });
  });

  return Object.values(map);
}

/**
 * Aggregates transactions into unique Customer-Wise or Supplier-Wise summaries
 */
export function aggregateTradeParties(
  transactions: any[],
  domain: TradeDomain
): PartyTradeSummary[] {
  const map: Record<string, PartyTradeSummary> = {};

  transactions.forEach((tx: any) => {
    const {
      partyId,
      partyName,
      partyPhone,
      partyAddress,
      tradeDate,
      grandTotal,
      paid,
      due,
    } = extractTradeRecordMetrics(tx, domain);

    const key = partyPhone ? `${partyName}_${partyPhone}` : partyName;

    if (!map[key]) {
      map[key] = {
        partyId,
        partyName,
        partyPhone,
        partyAddress,
        invoicesCount: 0,
        totalBilled: 0,
        totalPaid: 0,
        totalDue: 0,
        lastDate: tradeDate,
      };
    }

    map[key].invoicesCount += 1;
    map[key].totalBilled += grandTotal;
    map[key].totalPaid += paid;
    map[key].totalDue += due;

    if (
      tradeDate &&
      (!map[key].lastDate || moment(tradeDate).isAfter(moment(map[key].lastDate)))
    ) {
      map[key].lastDate = tradeDate;
    }
  });

  return Object.values(map);
}

export function calculateProductTotals(products: ProductTradeSummary[]) {
  return products.reduce(
    (acc, p) => {
      acc.totalQuantity += p.totalQuantity;
      acc.totalAmount += p.totalAmount;
      acc.totalDiscount += p.totalDiscount;
      return acc;
    },
    { totalQuantity: 0, totalAmount: 0, totalDiscount: 0 }
  );
}

export function calculateRevenueSharePct(
  amount: number,
  totalAmount: number
): string {
  return totalAmount > 0
    ? ((amount / totalAmount) * 100).toFixed(1)
    : "0.0";
}

export function calculatePartyTotals(parties: PartyTradeSummary[]) {
  return parties.reduce(
    (acc, p) => {
      acc.totalOrders += p.invoicesCount;
      acc.totalBilled += p.totalBilled;
      acc.totalPaid += p.totalPaid;
      acc.totalDue += p.totalDue;
      return acc;
    },
    { totalOrders: 0, totalBilled: 0, totalPaid: 0, totalDue: 0 }
  );
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

export interface CorporatePdfConfig {
  fileName: string;
  reportTitle: string;
  metaRightLabel: string;
  headers: string[];
  bodyRows: RowInput[];
  columnStyles: { [key: string]: Partial<Styles> };
  meta: ReportCompanyMeta;
  fontSize?: number;
}

/**
 * Unified landscape corporate PDF report generator with logo, metadata, theme colors, signatures & pagination
 */
export async function generateAndDownloadCorporatePdf(
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

  const tableFontSize = config.fontSize ?? 7.5;

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
      fontSize: tableFontSize,
      valign: "middle",
      lineWidth: 0.2,
      lineColor: [148, 163, 184],
      cellPadding: { top: 2.2, right: 1.6, bottom: 2.2, left: 1.6 },
    },
    bodyStyles: {
      fontSize: tableFontSize,
      textColor: [15, 23, 42],
      valign: "middle",
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
      cellPadding: { top: 1.8, right: 1.6, bottom: 1.8, left: 1.6 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: config.columnStyles,
    didParseCell: (hookData) => {
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

  doc.save(config.fileName);
}

/**
 * Shared parameterized Invoice-level corporate PDF builder (supports Sales & Purchases)
 */
export async function downloadTradeInvoicesPdf(
  records: any[],
  meta: ReportCompanyMeta,
  config: {
    domain: TradeDomain;
    filePrefix: string;
    reportTitle: string;
    partyColumnHeader: string;
    includeTransport?: boolean;
    emptyErrorMessage: string;
  }
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error(config.emptyErrorMessage);
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  let sumSub = 0;
  let sumDisc = 0;
  let sumVat = 0;
  let sumTransport = 0;
  let sumGt = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumItems = 0;

  const dataRows: RowInput[] = records.map((t: any, idx: number) => {
    const m = extractTradeRecordMetrics(t, config.domain, idx);
    const dateStr = m.tradeDate
      ? moment(m.tradeDate).format("DD-MMM-YYYY").toUpperCase()
      : "-";

    sumSub += m.subtotal;
    sumDisc += m.discount;
    sumVat += m.vat;
    sumTransport += m.transportCost;
    sumGt += m.grandTotal;
    sumPaid += m.paid;
    sumDue += m.due;
    sumItems += m.itemsCount;

    const statusColor =
      m.status === "PAID"
        ? REPORT_RGB.emerald
        : m.status === "PARTIAL"
        ? REPORT_RGB.amber
        : REPORT_RGB.rose;

    const row: RowInput = [
      idx + 1,
      { content: m.orderNo, styles: { fontStyle: "bold" } },
      dateStr,
      m.partyName,
      m.partyPhone || "-",
      m.itemsCount,
      formatMoney(m.subtotal),
      m.discount > 0 ? formatMoney(m.discount) : "-",
      m.vat > 0 ? formatMoney(m.vat) : "-",
    ];

    if (config.includeTransport) {
      row.push(m.transportCost > 0 ? formatMoney(m.transportCost) : "-");
    }

    row.push(
      { content: formatMoney(m.grandTotal), styles: { fontStyle: "bold" } },
      {
        content: formatMoney(m.paid),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      },
      {
        content: m.due > 0 ? formatMoney(m.due) : "-",
        styles: {
          fontStyle: "bold",
          textColor: m.due > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      },
      m.paymentType,
      {
        content: m.status,
        styles: { fontStyle: "bold", textColor: statusColor },
      }
    );

    return row;
  });

  const summaryRow: RowInput = [
    {
      content: `TOTAL SUMMARY (${records.length} Invoices)`,
      colSpan: 5,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: sumItems,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    },
    {
      content: formatMoney(sumSub),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    },
    {
      content: sumDisc > 0 ? formatMoney(sumDisc) : "-",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    },
    {
      content: sumVat > 0 ? formatMoney(sumVat) : "-",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    },
  ];

  if (config.includeTransport) {
    summaryRow.push({
      content: sumTransport > 0 ? formatMoney(sumTransport) : "-",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    });
  }

  summaryRow.push(
    {
      content: formatMoney(sumGt),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: themeRgb,
      },
    },
    {
      content: formatMoney(sumPaid),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.emerald,
      },
    },
    {
      content: sumDue > 0 ? formatMoney(sumDue) : "-",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: sumDue > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
      },
    },
    {
      content: "",
      colSpan: 2,
      styles: { fillColor: REPORT_RGB.summaryFill },
    }
  );

  const headers = [
    "SL",
    "Order ID",
    "Date",
    config.partyColumnHeader,
    "Phone",
    "Items",
    "Subtotal (BDT)",
    "Discount (BDT)",
    "VAT (BDT)",
    ...(config.includeTransport ? ["Transport (BDT)"] : []),
    "Grand Total (BDT)",
    "Paid (BDT)",
    "Due (BDT)",
    "Method",
    "Status",
  ];

  const columnStyles: { [key: string]: Partial<Styles> } = config.includeTransport
    ? {
        "0": { halign: "center", cellWidth: 9 },
        "1": { halign: "left" },
        "2": { halign: "center" },
        "3": { halign: "left" },
        "4": { halign: "center" },
        "5": { halign: "center", cellWidth: 11 },
        "6": { halign: "right" },
        "7": { halign: "right" },
        "8": { halign: "right" },
        "9": { halign: "right" },
        "10": { halign: "right" },
        "11": { halign: "right" },
        "12": { halign: "right" },
        "13": { halign: "center" },
        "14": { halign: "center" },
      }
    : {
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
      };

  await generateAndDownloadCorporatePdf({
    fileName: `${config.filePrefix}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: config.reportTitle,
    metaRightLabel: `Total Invoices: ${records.length}`,
    headers,
    bodyRows: [...dataRows, summaryRow],
    columnStyles,
    meta,
    fontSize: config.includeTransport ? 7 : 7.5,
  });
}

export interface ProductExportLabels {
  filePrefix: string;
  sheetName: string;
  reportTitle: string;
  excelQtyHeader: string;
  excelInvoicesHeader: string;
  excelAmountHeader: string;
  excelShareHeader: string;
  pdfQtyHeader: string;
  pdfAmountHeader: string;
  emptyExcelError: string;
  emptyPdfError: string;
}

/**
 * Shared Product-Wise Excel export helper for Sales & Purchases
 */
export async function exportProductTradeExcel(
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta,
  labels: ProductExportLabels
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error(labels.emptyExcelError);
  }

  const { totalQuantity, totalAmount, totalDiscount } =
    calculateProductTotals(products);

  const data = products.map((p, idx) => ({
    SL: idx + 1,
    "Product Code": p.productCode,
    "Product Name": p.productName,
    Unit: p.unit,
    [labels.excelQtyHeader]: p.totalQuantity,
    [labels.excelInvoicesHeader]: p.invoicesCount,
    [labels.excelAmountHeader]: p.totalAmount,
    "Discount (BDT)": p.totalDiscount,
    [labels.excelShareHeader]: `${calculateRevenueSharePct(
      p.totalAmount,
      totalAmount
    )}%`,
  }));

  const totalRow = {
    SL: `TOTAL SUMMARY (${data.length} Products)`,
    "Product Code": "",
    "Product Name": "",
    Unit: "",
    [labels.excelQtyHeader]: totalQuantity,
    [labels.excelInvoicesHeader]: "",
    [labels.excelAmountHeader]: Number(totalAmount.toFixed(2)),
    "Discount (BDT)": Number(totalDiscount.toFixed(2)),
    [labels.excelShareHeader]: "100.0%",
  };

  await buildAndDownloadExcel(data, totalRow, {
    ...meta,
    fileName: `${labels.filePrefix}_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: labels.sheetName,
    reportTitle: labels.reportTitle,
    totalLabel: "Total Products",
    totalSummarySpan: 4,
    includeSignatures: true,
  });

  return data.length;
}

/**
 * Shared Product-Wise corporate PDF export helper for Sales & Purchases
 */
export async function downloadProductTradePdf(
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta,
  labels: ProductExportLabels
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error(labels.emptyPdfError);
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const { totalQuantity, totalAmount, totalDiscount } =
    calculateProductTotals(products);

  const dataRows: RowInput[] = products.map((p, idx) => {
    const avgRate = p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : 0;
    const share = calculateRevenueSharePct(p.totalAmount, totalAmount);

    return [
      idx + 1,
      { content: p.productCode, styles: { fontStyle: "bold" } },
      p.productName,
      p.unit,
      p.invoicesCount,
      { content: p.totalQuantity, styles: { fontStyle: "bold" } },
      formatMoney(avgRate),
      p.totalDiscount > 0 ? formatMoney(p.totalDiscount) : "-",
      { content: formatMoney(p.totalAmount), styles: { fontStyle: "bold" } },
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
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: totalQuantity,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    },
    { content: "", styles: { fillColor: REPORT_RGB.summaryFill } },
    {
      content: totalDiscount > 0 ? formatMoney(totalDiscount) : "-",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    },
    {
      content: formatMoney(totalAmount),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: themeRgb,
      },
    },
    {
      content: "100.0%",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    },
  ];

  await generateAndDownloadCorporatePdf({
    fileName: `${labels.filePrefix}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: labels.reportTitle,
    metaRightLabel: `Total Products: ${products.length}`,
    headers: [
      "SL",
      "Product Code",
      "Product Description",
      "Unit",
      "Orders",
      labels.pdfQtyHeader,
      "Avg Rate (BDT)",
      "Discounts (BDT)",
      labels.pdfAmountHeader,
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

export interface PartyExportLabels {
  filePrefix: string;
  sheetName: string;
  reportTitle: string;
  partyColumnHeader: string;
  totalLabel: string;
  summaryEntityPlural: string;
  emptyExcelError: string;
  emptyPdfError: string;
}

/**
 * Shared Party-Wise (Customer / Supplier) Excel export helper
 */
export async function exportPartyTradeExcel(
  parties: PartyTradeSummary[],
  meta: ReportCompanyMeta,
  labels: PartyExportLabels
): Promise<number> {
  if (!parties || parties.length === 0) {
    throw new Error(labels.emptyExcelError);
  }

  const data = parties.map((p, idx) => ({
    SL: idx + 1,
    [labels.partyColumnHeader]: p.partyName,
    Phone: p.partyPhone || "-",
    Address: p.partyAddress || "-",
    "Total Orders": p.invoicesCount,
    "Total Billed (BDT)": p.totalBilled,
    "Total Paid (BDT)": p.totalPaid,
    "Outstanding Due (BDT)": p.totalDue,
    "Last Order Date": p.lastDate
      ? moment(p.lastDate).format("DD MMM YYYY")
      : "-",
    Status: p.totalDue > 0 ? "Has Due" : "Settled",
  }));

  const { totalBilled, totalPaid, totalDue } = calculatePartyTotals(parties);

  const totalRow = {
    SL: `TOTAL SUMMARY (${data.length} ${labels.summaryEntityPlural})`,
    [labels.partyColumnHeader]: "",
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
    fileName: `${labels.filePrefix}_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: labels.sheetName,
    reportTitle: labels.reportTitle,
    totalLabel: labels.totalLabel,
    totalSummarySpan: 4,
    includeSignatures: true,
  });

  return data.length;
}

/**
 * Shared Party-Wise (Customer / Supplier) corporate PDF export helper
 */
export async function downloadPartyTradePdf(
  parties: PartyTradeSummary[],
  meta: ReportCompanyMeta,
  labels: PartyExportLabels
): Promise<void> {
  if (!parties || parties.length === 0) {
    throw new Error(labels.emptyPdfError);
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const { totalOrders, totalBilled, totalPaid, totalDue } =
    calculatePartyTotals(parties);

  const dataRows: RowInput[] = parties.map((p, idx) => {
    const hasDue = p.totalDue > 0;
    const status = hasDue ? "Has Due" : "Settled";
    const lastStr = p.lastDate
      ? moment(p.lastDate).format("DD-MMM-YYYY").toUpperCase()
      : "-";

    return [
      idx + 1,
      { content: p.partyName, styles: { fontStyle: "bold" } },
      p.partyPhone || "-",
      p.partyAddress || "-",
      p.invoicesCount,
      { content: formatMoney(p.totalBilled), styles: { fontStyle: "bold" } },
      {
        content: formatMoney(p.totalPaid),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      },
      {
        content: hasDue ? formatMoney(p.totalDue) : "-",
        styles: {
          fontStyle: "bold",
          textColor: hasDue ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      },
      lastStr,
      {
        content: status,
        styles: {
          fontStyle: "bold",
          textColor: hasDue ? REPORT_RGB.rose : REPORT_RGB.emerald,
        },
      },
    ];
  });

  const summaryRow: RowInput = [
    {
      content: `TOTAL SUMMARY (${parties.length} ${labels.summaryEntityPlural})`,
      colSpan: 4,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: totalOrders,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
      },
    },
    {
      content: formatMoney(totalBilled),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: themeRgb,
      },
    },
    {
      content: formatMoney(totalPaid),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.emerald,
      },
    },
    {
      content: totalDue > 0 ? formatMoney(totalDue) : "-",
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: totalDue > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
      },
    },
    {
      content: "",
      colSpan: 2,
      styles: { fillColor: REPORT_RGB.summaryFill },
    },
  ];

  await generateAndDownloadCorporatePdf({
    fileName: `${labels.filePrefix}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: labels.reportTitle,
    metaRightLabel: `${labels.totalLabel}: ${parties.length}`,
    headers: [
      "SL",
      labels.partyColumnHeader,
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
