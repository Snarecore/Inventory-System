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
export { formatReportDate };
import { useBusinessProfileQuery } from "@/hooks/useBusinessProfile";
import { getFileViewUrl } from "@/services/file-upload-service";
import { getUserInfo } from "@/utils/auth-storage";
import { getPurchaseDateString } from "@/pages/admin/trade/purchases/hooks/usePurchaseTableFilter";
import { jsPDF } from "jspdf";
import autoTable, { type RowInput, type Styles } from "jspdf-autotable";
import {
  buildDynamicExcelPayload,
  buildDynamicPdfPayload,
  type ExportColumnDef,
} from "@/utils/report-export-columns";
import { ensureFontLoaded } from "@/theme/fonts";
import { getCleanOrderNo } from "@/pages/admin/trade/sales/hooks/useSalesQueries";

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
  unitPrice?: number;
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

export interface ReportDateFilterProps {
  startDate?: string;
  endDate?: string;
  dateRange?: string;
  onPresetChange?: (preset: string) => void;
  onDateChange?: (range: {
    startDate: string;
    endDate: string;
    label?: string;
  }) => void;
}

/**
 * Shared hook to manage preset + custom date range synchronized with DateRangePicker
 */
export function useReportDateRange(
  defaultPreset: "this_month" | "all" = "this_month"
) {
  const [dateRange, setDateRange] = useState<string>(defaultPreset);
  const [startDate, setStartDate] = useState<string>(() =>
    defaultPreset === "all"
      ? ""
      : moment().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(() =>
    defaultPreset === "all" ? "" : moment().endOf("month").format("YYYY-MM-DD")
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

  const datePickerProps: ReportDateFilterProps = {
    startDate,
    endDate,
    dateRange,
    onPresetChange: (preset) => setDateRange(preset),
    onDateChange: handleDateChange,
  };

  return {
    dateRange,
    setDateRange,
    startDate,
    endDate,
    handleDateChange,
    datePickerProps,
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
      userInfo?.businessName ||
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
    orderNo: getCleanOrderNo(item?.orderNo, item?.invoiceNo, item?.id) || item?.invoiceNo || "",
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
          unitPrice: price > 0 ? price : undefined,
        };
      } else if (!map[key].unitPrice && price > 0) {
        map[key].unitPrice = price;
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

export interface CorporatePdfPersonMeta {
  roleLabel?: string;
  name: string;
  phone?: string;
  address?: string;
  balanceStatement?: string;
  isReceivable?: boolean;
}

export interface CorporatePdfConfig {
  fileName: string;
  reportTitle: string;
  metaRightLabel?: string;
  metaLeftLabel?: string;
  headers: string[];
  bodyRows: RowInput[];
  columnStyles?: { [key: string]: Partial<Styles> };
  meta: ReportCompanyMeta;
  fontSize?: number;
  orientation?: "portrait" | "landscape";
  personInfo?: CorporatePdfPersonMeta;
}

/**
 * Ensures that the high-quality Noto Sans Bengali font is loaded before rendering
 * canvas glyphs for jsPDF export.
 */
export async function ensureBengaliFontLoaded(): Promise<void> {
  if (typeof document === "undefined") return;
  try {
    ensureFontLoaded("noto-sans-bengali");
    if (document.fonts) {
      await Promise.allSettled([
        document.fonts.load("bold 16px 'Noto Sans Bengali'"),
        document.fonts.load("normal 16px 'Noto Sans Bengali'"),
        document.fonts.ready,
      ]);
    }
  } catch {
    // Graceful fallback if offline or blocked
  }
}

/**
 * Renders lines of text containing Bengali Unicode glyphs onto a high-DPI HTML5 canvas
 * using the browser's native text shaping engine (DirectWrite / HarfBuzz).
 * Returns a crisp PNG data URI and its exact millimeter dimensions for jsPDF.
 */
export function renderBengaliLinesToCanvas(
  lines: string[],
  opts: {
    fontSize: number; // pt (e.g. 7.5 or 12)
    fontStyle?: "bold" | "normal";
    textColor?: [number, number, number] | number | string;
    halign?: "left" | "center" | "right";
    maxAllowedWidthMm?: number;
  }
): { dataUrl: string; widthMm: number; heightMm: number; padXMm?: number; padYMm?: number } | null {
  if (typeof document === "undefined" || !lines || lines.length === 0) {
    return null;
  }

  // Flatten lines splitting on newlines
  const flatLines: string[] = [];
  for (const item of lines) {
    if (typeof item === "string" && item.includes("\n")) {
      flatLines.push(...item.split("\n"));
    } else {
      flatLines.push(String(item ?? ""));
    }
  }

  // 3x DPR gives ~288 DPI print resolution for crisp, razor-sharp typography
  const dpr = 3;
  const pxFontSize = Math.max(16, Math.round(opts.fontSize * 1.3333 * dpr));
  const lineSpacingPx = Math.round(pxFontSize * 1.32);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const fontFamily =
    "'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', 'Nirmala UI', 'Segoe UI', system-ui, sans-serif";
  const fontStyle = opts.fontStyle === "bold" ? "bold" : "normal";
  const fontStr = `${fontStyle} ${pxFontSize}px ${fontFamily}`;
  ctx.font = fontStr;

  let maxLineW = 0;
  for (const line of flatLines) {
    const w = ctx.measureText(line).width;
    if (w > maxLineW) maxLineW = w;
  }

  const padX = Math.round(pxFontSize * 0.2) + 2 * dpr;
  const padY = Math.round(pxFontSize * 0.22) + 2 * dpr;
  const totalWPx = Math.max(1, Math.ceil(maxLineW + padX * 2));
  const totalHPx = Math.max(1, Math.ceil(flatLines.length * lineSpacingPx + padY * 2));

  canvas.width = totalWPx;
  canvas.height = totalHPx;

  ctx.font = fontStr;
  let fillStyle = "rgb(15, 23, 42)";
  if (Array.isArray(opts.textColor) && opts.textColor.length >= 3) {
    fillStyle = `rgb(${opts.textColor[0]}, ${opts.textColor[1]}, ${opts.textColor[2]})`;
  } else if (typeof opts.textColor === "number") {
    fillStyle = `rgb(${opts.textColor}, ${opts.textColor}, ${opts.textColor})`;
  } else if (typeof opts.textColor === "string") {
    fillStyle = opts.textColor;
  }
  ctx.fillStyle = fillStyle;
  ctx.textBaseline = "middle";

  for (let i = 0; i < flatLines.length; i++) {
    const line = flatLines[i];
    const y = padY + (i + 0.5) * lineSpacingPx;
    let x = padX;
    if (opts.halign === "center") {
      const w = ctx.measureText(line).width;
      x = (totalWPx - w) / 2;
    } else if (opts.halign === "right") {
      const w = ctx.measureText(line).width;
      x = totalWPx - w - padX;
    }
    ctx.fillText(line, x, y);
  }

  // 1 px at 96 DPI = 0.264583 mm
  let widthMm = (totalWPx / dpr) * 0.264583;
  let heightMm = (totalHPx / dpr) * 0.264583;
  let padXMm = (padX / dpr) * 0.264583;
  let padYMm = (padY / dpr) * 0.264583;

  if (opts.maxAllowedWidthMm && widthMm > opts.maxAllowedWidthMm && opts.maxAllowedWidthMm > 0) {
    const scale = opts.maxAllowedWidthMm / widthMm;
    widthMm = opts.maxAllowedWidthMm;
    heightMm = heightMm * scale;
    padXMm = padXMm * scale;
    padYMm = padYMm * scale;
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthMm,
    heightMm,
    padXMm,
    padYMm,
  };
}

/**
 * Draws text on jsPDF. If text contains Bengali characters, renders via canvas image;
 * otherwise uses native vector doc.text().
 */
export function drawPdfTextSmart(
  doc: any,
  text: string,
  x: number,
  y: number,
  opts: {
    fontSize: number;
    fontStyle?: "bold" | "normal";
    textColor?: [number, number, number] | number | string;
    align?: "left" | "center" | "right";
    maxAllowedWidthMm?: number;
  }
): void {
  if (!text) return;
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  if (!hasBengali) {
    doc.setFont("helvetica", opts.fontStyle || "normal");
    doc.setFontSize(opts.fontSize);
    if (Array.isArray(opts.textColor) && opts.textColor.length >= 3) {
      doc.setTextColor(opts.textColor[0], opts.textColor[1], opts.textColor[2]);
    } else if (typeof opts.textColor === "number") {
      doc.setTextColor(opts.textColor, opts.textColor, opts.textColor);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(text, x, y, { align: opts.align || "left" });
    return;
  }

  const rendered = renderBengaliLinesToCanvas([text], {
    fontSize: opts.fontSize,
    fontStyle: opts.fontStyle,
    textColor: opts.textColor,
    halign: opts.align,
    maxAllowedWidthMm: opts.maxAllowedWidthMm ?? 160,
  });

  if (!rendered) return;

  let drawX = x;
  if (opts.align === "center") {
    drawX = x - rendered.widthMm / 2;
  } else if (opts.align === "right") {
    drawX = x - rendered.widthMm + (rendered.padXMm || 0);
  } else {
    drawX = x - (rendered.padXMm || 0);
  }
  const drawY = y - rendered.heightMm * 0.58;

  try {
    doc.addImage(rendered.dataUrl, "PNG", drawX, drawY, rendered.widthMm, rendered.heightMm);
  } catch (err) {
    console.warn("Could not draw Bengali header text:", err);
  }
}

/**
 * Unified landscape corporate PDF report generator with logo, metadata, theme colors, signatures & pagination
 */
export async function generateAndDownloadCorporatePdf(
  config: CorporatePdfConfig
): Promise<void> {
  await ensureBengaliFontLoaded();

  const orientation =
    config.orientation ||
    (config.headers.length <= 6 ? "portrait" : "landscape");
  const isPortrait = orientation === "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm (portrait) or 297mm (landscape)
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm (portrait) or 210mm (landscape)
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
  drawPdfTextSmart(doc, businessName || "Cash Boi Trade Ltd", textStartX, 11.5, {
    fontSize: 13,
    fontStyle: "bold",
    textColor: [15, 23, 42],
  });

  // Company Address
  if (businessAddress) {
    drawPdfTextSmart(doc, businessAddress, textStartX, 16, {
      fontSize: 8.5,
      fontStyle: "normal",
      textColor: [71, 85, 105],
    });
  }

  // Print Date (Top Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Print Date: ${printDate}`, rightEdge, 11.5, { align: "right" });

  // Centered Report Title
  drawPdfTextSmart(doc, config.reportTitle, pageWidth / 2, 22, {
    fontSize: 12,
    fontStyle: "bold",
    textColor: [15, 23, 42],
    align: "center",
    maxAllowedWidthMm: pageWidth - 2 * marginX,
  });

  const metaFilterY = config.personInfo ? 26 : 27;

  // Meta Filter Row
  const defaultDateRangeStr = `From Date: ${fromStr}   To Date: ${toStr}`;
  const leftLabel = config.metaLeftLabel || defaultDateRangeStr;

  drawPdfTextSmart(
    doc,
    leftLabel,
    marginX,
    metaFilterY,
    {
      fontSize: 8.5,
      fontStyle: "bold",
      textColor: [51, 65, 85],
      align: "left",
      maxAllowedWidthMm: config.metaRightLabel
        ? (pageWidth - 2 * marginX) / 2
        : pageWidth - 2 * marginX,
    }
  );

  if (config.metaRightLabel) {
    drawPdfTextSmart(doc, config.metaRightLabel, rightEdge, metaFilterY, {
      fontSize: 8.5,
      fontStyle: "bold",
      textColor: [51, 65, 85],
      align: "right",
      maxAllowedWidthMm: (pageWidth - 2 * marginX) / 2,
    });
  }

  if (config.personInfo) {
    const cardY = 28.5;
    const cardH = 8.5;
    const usableW = pageWidth - 2 * marginX;

    // Soft card background & border
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, cardY, usableW, cardH, 1, 1, "FD");

    // Person Info (Left)
    const rolePrefix = config.personInfo.roleLabel
      ? `${config.personInfo.roleLabel}: `
      : "Person: ";
    const personParts = [
      `${rolePrefix}${config.personInfo.name}`,
      config.personInfo.phone ? `Phone: ${config.personInfo.phone}` : "",
      config.personInfo.address ? `Address: ${config.personInfo.address}` : "",
    ].filter(Boolean);
    const personText = personParts.join("   |   ");

    drawPdfTextSmart(doc, personText, marginX + 3, cardY + 5.5, {
      fontSize: 8.5,
      fontStyle: "bold",
      textColor: [15, 23, 42],
      align: "left",
      maxAllowedWidthMm: usableW * 0.55,
    });

    // Balance Statement (Right)
    if (config.personInfo.balanceStatement) {
      const textColor: [number, number, number] =
        config.personInfo.isReceivable === true
          ? [16, 149, 106]
          : config.personInfo.isReceivable === false
          ? [225, 29, 72]
          : [71, 85, 105];

      drawPdfTextSmart(
        doc,
        config.personInfo.balanceStatement,
        rightEdge - 3,
        cardY + 5.5,
        {
          fontSize: 9,
          fontStyle: "bold",
          textColor,
          align: "right",
          maxAllowedWidthMm: usableW * 0.45,
        }
      );
    }
  } else {
    // Divider line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(marginX, 29, rightEdge, 29);
  }

  const tableFontSize =
    config.fontSize ?? (config.headers.length >= 13 ? 7 : 7.5);
  const tableStartY = config.personInfo ? 39.5 : 31;

  // ── Data Table (Global Theme Color Header + Last-Page Summary Row) ──
  autoTable(doc, {
    head: [config.headers],
    body: config.bodyRows,
    startY: tableStartY,
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
      if (hookData.section === "head" && config.columnStyles) {
        const colStyle = config.columnStyles[String(hookData.column.index)];
        if (colStyle?.halign) {
          hookData.cell.styles.halign = colStyle.halign;
        }
      }

      // Detect cells containing Bengali characters
      const cellText = Array.isArray(hookData.cell.text)
        ? hookData.cell.text
        : [String(hookData.cell.text || "")];
      const rawContent =
        typeof hookData.cell.raw === "object" && hookData.cell.raw !== null
          ? String((hookData.cell.raw as any).content ?? "")
          : String(hookData.cell.raw ?? "");

      const hasBengali =
        cellText.some((t) => /[\u0980-\u09FF]/.test(t)) ||
        /[\u0980-\u09FF]/.test(rawContent);

      if (hasBengali) {
        (hookData.cell as any)._bengaliLines =
          cellText.length > 0 && cellText.some((t) => t.trim().length > 0)
            ? [...cellText]
            : [rawContent];
      }
    },
    willDrawCell: (hookData) => {
      const cell = hookData.cell as any;
      if (cell._bengaliLines && cell._bengaliLines.length > 0) {
        const padL = cell.padding("left");
        const padR = cell.padding("right");
        const availW = Math.max(0, cell.width - padL - padR);

        const rendered = renderBengaliLinesToCanvas(cell._bengaliLines, {
          fontSize: cell.styles.fontSize || tableFontSize,
          fontStyle: cell.styles.fontStyle === "bold" ? "bold" : "normal",
          textColor: cell.styles.textColor,
          halign: cell.styles.halign,
          maxAllowedWidthMm: availW,
        });

        cell._bengaliImage = rendered;
        // Clear cell.text so default autoTableText won't draw corrupted characters
        cell.text = [];
      }
    },
    didDrawCell: (hookData) => {
      const cell = hookData.cell as any;
      if (cell._bengaliImage) {
        const { dataUrl, widthMm, heightMm, padXMm, padYMm } = cell._bengaliImage;
        const padL = cell.padding("left");
        const padR = cell.padding("right");
        const padT = cell.padding("top");
        const padB = cell.padding("bottom");
        const padXOffset = padXMm || 0;

        let drawX = cell.x + padL - padXOffset;
        if (cell.styles.halign === "center") {
          drawX = cell.x + (cell.width - widthMm) / 2;
        } else if (cell.styles.halign === "right") {
          drawX = cell.x + cell.width - padR - widthMm + padXOffset;
        }

        // Align Bengali text vertically to match AutoTable valign: "middle"
        let drawY = cell.y + (cell.height - heightMm) / 2;
        if (cell.styles.valign === "top") {
          drawY = cell.y + padT - (padYMm || 0);
        } else if (cell.styles.valign === "bottom") {
          drawY = cell.y + cell.height - padB - heightMm + (padYMm || 0);
        }

        try {
          doc.addImage(dataUrl, "PNG", drawX, drawY, widthMm, heightMm);
        } catch (err) {
          console.warn("Could not draw Bengali cell image:", err);
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

  const usableWidth = pageWidth - 2 * marginX;
  const sigWidth = Math.min(48, usableWidth * 0.22);
  const sigSidePad = isPortrait ? 4 : 10;
  const sigBlocks = [
    {
      x1: marginX + sigSidePad,
      x2: marginX + sigSidePad + sigWidth,
      cx: marginX + sigSidePad + sigWidth / 2,
      label: "Prepared By",
    },
    {
      x1: pageWidth / 2 - sigWidth / 2,
      x2: pageWidth / 2 + sigWidth / 2,
      cx: pageWidth / 2,
      label: "Checked By",
    },
    {
      x1: rightEdge - sigSidePad - sigWidth,
      x2: rightEdge - sigSidePad,
      cx: rightEdge - sigSidePad - sigWidth / 2,
      label: "Authorized Signatory",
    },
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

  const safeFileName = (config.fileName || "Report.pdf")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
  doc.save(safeFileName);
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
    visibleColumns?: Record<string, boolean>;
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

  const normalizedRows = records.map((t: any, idx: number) => {
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

    return { m, dateStr };
  });

  const totals = {
    sumItems,
    sumSub,
    sumDisc,
    sumVat,
    sumTransport,
    sumGt,
    sumPaid,
    sumDue,
  };

  type InvoiceRow = (typeof normalizedRows)[number];
  const partyKey = config.domain === "purchase" ? "supplier" : "customer";

  const columns: ExportColumnDef<InvoiceRow, typeof totals>[] = [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: config.includeTransport ? 9 : 10 },
      excelValue: (_, idx) => idx + 1,
      pdfCell: (_, idx) => idx + 1,
    },
    {
      key: "orderId",
      excelHeader: "Order ID",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.m.orderNo,
      pdfCell: (r) => ({ content: r.m.orderNo, styles: { fontStyle: "bold" } }),
    },
    {
      key: "date",
      excelHeader: "Date",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.dateStr,
      pdfCell: (r) => r.dateStr,
    },
    {
      key: partyKey,
      excelHeader: config.partyColumnHeader,
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.m.partyName,
      pdfCell: (r) => r.m.partyName,
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.m.partyPhone || "-",
      pdfCell: (r) => r.m.partyPhone || "-",
    },
    {
      key: "items",
      excelHeader: "Items",
      pdfStyle: { halign: "center", cellWidth: config.includeTransport ? 11 : 12 },
      excelValue: (r) => r.m.itemsCount,
      pdfCell: (r) => r.m.itemsCount,
      pdfSummaryCell: (t) => ({ content: t.sumItems, styles: { halign: "center" } }),
    },
    {
      key: "subtotal",
      excelHeader: "Subtotal (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (r) => r.m.subtotal,
      pdfCell: (r) => formatMoney(r.m.subtotal),
      pdfSummaryCell: (t) => ({ content: formatMoney(t.sumSub) }),
    },
    {
      key: "discount",
      excelHeader: "Discount (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (r) => r.m.discount,
      pdfCell: (r) => (r.m.discount > 0 ? formatMoney(r.m.discount) : "-"),
      pdfSummaryCell: (t) => ({
        content: t.sumDisc > 0 ? formatMoney(t.sumDisc) : "-",
      }),
    },
    {
      key: "vat",
      excelHeader: "VAT (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (r) => r.m.vat,
      pdfCell: (r) => (r.m.vat > 0 ? formatMoney(r.m.vat) : "-"),
      pdfSummaryCell: (t) => ({
        content: t.sumVat > 0 ? formatMoney(t.sumVat) : "-",
      }),
    },
    ...(config.includeTransport
      ? [
          {
            key: "transport",
            excelHeader: "Transport (BDT)",
            pdfStyle: { halign: "right" as const },
            excelValue: (r: InvoiceRow) => r.m.transportCost,
            pdfCell: (r: InvoiceRow) =>
              r.m.transportCost > 0 ? formatMoney(r.m.transportCost) : "-",
            pdfSummaryCell: (t: typeof totals) => ({
              content: t.sumTransport > 0 ? formatMoney(t.sumTransport) : "-",
            }),
          },
        ]
      : []),
    {
      key: "total",
      excelHeader: "Grand Total (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (r) => r.m.grandTotal,
      pdfCell: (r) => ({
        content: formatMoney(r.m.grandTotal),
        styles: { fontStyle: "bold" },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumGt),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "paid",
      excelHeader: "Paid (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (r) => r.m.paid,
      pdfCell: (r) => ({
        content: formatMoney(r.m.paid),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumPaid),
        styles: { textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "due",
      excelHeader: "Due (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (r) => r.m.due,
      pdfCell: (r) => ({
        content: r.m.due > 0 ? formatMoney(r.m.due) : "-",
        styles: {
          fontStyle: "bold",
          textColor: r.m.due > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      }),
      pdfSummaryCell: (t) => ({
        content: t.sumDue > 0 ? formatMoney(t.sumDue) : "-",
        styles: {
          textColor: t.sumDue > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      }),
    },
    {
      key: "method",
      excelHeader: "Method",
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.m.paymentType,
      pdfCell: (r) => r.m.paymentType,
    },
    {
      key: "status",
      excelHeader: "Status",
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.m.status,
      pdfCell: (r) => {
        const statusColor =
          r.m.status === "PAID"
            ? REPORT_RGB.emerald
            : r.m.status === "PARTIAL"
            ? REPORT_RGB.amber
            : REPORT_RGB.rose;
        return {
          content: r.m.status,
          styles: { fontStyle: "bold", textColor: statusColor },
        };
      },
    },
  ];

  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    normalizedRows,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Invoices)`,
    { visibleColumns: config.visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `${config.filePrefix}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: config.reportTitle,
    headers,
    bodyRows,
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

function buildProductTradeColumns(
  labels: ProductExportLabels,
  grandTotalAmount: number,
  themeRgb: [number, number, number]
): ExportColumnDef<ProductTradeSummary, { totalQuantity: number; totalAmount: number; totalDiscount: number }>[] {
  return [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 10 },
      excelValue: (_, idx) => idx + 1,
      pdfCell: (_, idx) => idx + 1,
    },
    {
      key: "productCode",
      excelHeader: "Product Code",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (p) => p.productCode,
      pdfCell: (p) => ({ content: p.productCode, styles: { fontStyle: "bold" } }),
    },
    {
      key: "productName",
      excelHeader: "Product",
      pdfHeader: "Product",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (p) => p.productName,
      pdfCell: (p) => p.productName,
    },
    {
      key: "orders",
      excelHeader: labels.excelInvoicesHeader,
      pdfHeader: "Orders",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.invoicesCount,
      pdfCell: (p) => p.invoicesCount,
    },
    {
      key: "quantity",
      excelHeader: labels.excelQtyHeader,
      pdfHeader: labels.pdfQtyHeader,
      pdfStyle: { halign: "right" },
      excelValue: (p) => p.totalQuantity,
      excelTotalValue: (t) => t.totalQuantity,
      pdfCell: (p) => ({ content: p.totalQuantity, styles: { fontStyle: "bold" } }),
      pdfSummaryCell: (t) => ({ content: t.totalQuantity }),
    },
    {
      key: "unit",
      excelHeader: "Unit",
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.unit,
      pdfCell: (p) => p.unit,
    },
    {
      key: "avgRate",
      excelHeader: "Unit Price (BDT)",
      pdfHeader: "Unit Price (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (p) =>
        p.unitPrice ??
        (p.totalQuantity > 0
          ? Number((p.totalAmount / p.totalQuantity).toFixed(2))
          : 0),
      pdfCell: (p) =>
        formatMoney(
          p.unitPrice ??
            (p.totalQuantity > 0 ? p.totalAmount / p.totalQuantity : 0)
        ),
    },
    {
      key: "discount",
      excelHeader: "Discount (BDT)",
      pdfHeader: "Discounts (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (p) => p.totalDiscount,
      excelTotalValue: (t) => Number(t.totalDiscount.toFixed(2)),
      pdfCell: (p) => (p.totalDiscount > 0 ? formatMoney(p.totalDiscount) : "-"),
      pdfSummaryCell: (t) => ({
        content: t.totalDiscount > 0 ? formatMoney(t.totalDiscount) : "-",
      }),
    },
    {
      key: "amount",
      excelHeader: labels.excelAmountHeader,
      pdfHeader: labels.pdfAmountHeader,
      pdfStyle: { halign: "right" },
      excelValue: (p) => p.totalAmount,
      excelTotalValue: (t) => Number(t.totalAmount.toFixed(2)),
      pdfCell: (p) => ({
        content: formatMoney(p.totalAmount),
        styles: { fontStyle: "bold" },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalAmount),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "share",
      excelHeader: labels.excelShareHeader,
      pdfHeader: "Share (%)",
      pdfStyle: { halign: "right" },
      excelValue: (p) =>
        `${calculateRevenueSharePct(p.totalAmount, grandTotalAmount)}%`,
      excelTotalValue: () => "100.0%",
      pdfCell: (p) =>
        `${calculateRevenueSharePct(p.totalAmount, grandTotalAmount)}%`,
      pdfSummaryCell: () => ({ content: "100.0%" }),
    },
  ];
}

/**
 * Shared Product-Wise Excel export helper for Sales & Purchases
 */
export async function exportProductTradeExcel(
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta,
  labels: ProductExportLabels,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!products || products.length === 0) {
    throw new Error(labels.emptyExcelError);
  }

  const totals = calculateProductTotals(products);
  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildProductTradeColumns(labels, totals.totalAmount, themeRgb);

  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    products,
    columns,
    totals,
    `TOTAL SUMMARY (${products.length} Products)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `${labels.filePrefix}_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: labels.sheetName,
    reportTitle: labels.reportTitle,
    totalLabel: "Total Products",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

/**
 * Shared Product-Wise corporate PDF export helper for Sales & Purchases
 */
export async function downloadProductTradePdf(
  products: ProductTradeSummary[],
  meta: ReportCompanyMeta,
  labels: ProductExportLabels,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!products || products.length === 0) {
    throw new Error(labels.emptyPdfError);
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const totals = calculateProductTotals(products);
  const columns = buildProductTradeColumns(labels, totals.totalAmount, themeRgb);

  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    products,
    columns,
    totals,
    `TOTAL SUMMARY (${products.length} Products)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `${labels.filePrefix}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: labels.reportTitle,
    headers,
    bodyRows,
    columnStyles,
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

function buildPartyTradeColumns(
  labels: PartyExportLabels,
  themeRgb: [number, number, number]
): ExportColumnDef<
  PartyTradeSummary,
  { totalOrders: number; totalBilled: number; totalPaid: number; totalDue: number }
>[] {
  return [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 10 },
      excelValue: (_, idx) => idx + 1,
      pdfCell: (_, idx) => idx + 1,
    },
    {
      key: "partyName",
      excelHeader: labels.partyColumnHeader,
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (p) => p.partyName,
      pdfCell: (p) => ({ content: p.partyName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.partyPhone || "-",
      pdfCell: (p) => p.partyPhone || "-",
    },
    {
      key: "address",
      excelHeader: "Address",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (p) => p.partyAddress || "-",
      pdfCell: (p) => p.partyAddress || "-",
    },
    {
      key: "orders",
      excelHeader: "Total Orders",
      pdfHeader: "Orders",
      pdfStyle: { halign: "center" },
      excelValue: (p) => p.invoicesCount,
      pdfCell: (p) => p.invoicesCount,
      pdfSummaryCell: (t) => ({ content: t.totalOrders, styles: { halign: "center" } }),
    },
    {
      key: "totalBilled",
      excelHeader: "Total Billed (BDT)",
      pdfHeader: "Gross Billed (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (p) => p.totalBilled,
      excelTotalValue: (t) => Number(t.totalBilled.toFixed(2)),
      pdfCell: (p) => ({
        content: formatMoney(p.totalBilled),
        styles: { fontStyle: "bold" },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalBilled),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "totalPaid",
      excelHeader: "Total Paid (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (p) => p.totalPaid,
      excelTotalValue: (t) => Number(t.totalPaid.toFixed(2)),
      pdfCell: (p) => ({
        content: formatMoney(p.totalPaid),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalPaid),
        styles: { textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "totalDue",
      excelHeader: "Outstanding (BDT)",
      pdfHeader: "Outstanding (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (p) => p.totalDue,
      excelTotalValue: (t) => Number(t.totalDue.toFixed(2)),
      pdfCell: (p) => {
        const hasDue = p.totalDue > 0;
        return {
          content: hasDue ? formatMoney(p.totalDue) : "-",
          styles: {
            fontStyle: "bold",
            textColor: hasDue ? REPORT_RGB.rose : REPORT_RGB.muted,
          },
        };
      },
      pdfSummaryCell: (t) => ({
        content: t.totalDue > 0 ? formatMoney(t.totalDue) : "-",
        styles: {
          textColor: t.totalDue > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      }),
    },
    {
      key: "lastDate",
      excelHeader: "Last Order Date",
      pdfHeader: "Last Order",
      pdfStyle: { halign: "center" },
      excelValue: (p) =>
        p.lastDate ? moment(p.lastDate).format("DD MMM YYYY") : "-",
      pdfCell: (p) =>
        p.lastDate ? moment(p.lastDate).format("DD-MMM-YYYY").toUpperCase() : "-",
    },
    {
      key: "status",
      excelHeader: "Status",
      pdfStyle: { halign: "center" },
      excelValue: (p) => (p.totalDue > 0 ? "Outstanding" : "Paid"),
      pdfCell: (p) => {
        const hasDue = p.totalDue > 0;
        return {
          content: hasDue ? "Outstanding" : "Paid",
          styles: {
            fontStyle: "bold",
            textColor: hasDue ? REPORT_RGB.rose : REPORT_RGB.emerald,
          },
        };
      },
    },
  ];
}

/**
 * Shared Party-Wise (Customer / Supplier) Excel export helper
 */
export async function exportPartyTradeExcel(
  parties: PartyTradeSummary[],
  meta: ReportCompanyMeta,
  labels: PartyExportLabels,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!parties || parties.length === 0) {
    throw new Error(labels.emptyExcelError);
  }

  const totals = calculatePartyTotals(parties);
  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildPartyTradeColumns(labels, themeRgb);

  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    parties,
    columns,
    totals,
    `TOTAL SUMMARY (${parties.length} ${labels.summaryEntityPlural})`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `${labels.filePrefix}_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: labels.sheetName,
    reportTitle: labels.reportTitle,
    totalLabel: labels.totalLabel,
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

/**
 * Shared Party-Wise (Customer / Supplier) corporate PDF export helper
 */
export async function downloadPartyTradePdf(
  parties: PartyTradeSummary[],
  meta: ReportCompanyMeta,
  labels: PartyExportLabels,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!parties || parties.length === 0) {
    throw new Error(labels.emptyPdfError);
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const totals = calculatePartyTotals(parties);
  const columns = buildPartyTradeColumns(labels, themeRgb);

  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    parties,
    columns,
    totals,
    `TOTAL SUMMARY (${parties.length} ${labels.summaryEntityPlural})`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `${labels.filePrefix}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: labels.reportTitle,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

const REPORT_DATE_INPUT_FORMATS = [
  moment.ISO_8601,
  "YYYY-MM-DD",
  "YYYY-MM-DD HH:mm:ss",
  "DD-MM-YYYY",
  "DD/MM/YYYY",
  "DD MMM, YYYY",
  "DD MMM YYYY",
];

/**
 * Parses backend/UI report dates across ISO, YYYY-MM-DD, and DD-MM-YYYY formats.
 */
export function parseFlexibleReportDate(raw?: string | null): moment.Moment | null {
  const clean = String(raw || "").trim();
  if (!clean) return null;

  const parsed = moment(clean, REPORT_DATE_INPUT_FORMATS, true);
  if (parsed.isValid()) return parsed;

  const dateOnly = clean.replace("T", " ").split(" ")[0];
  const fallback = moment(dateOnly, REPORT_DATE_INPUT_FORMATS, false);
  if (fallback.isValid()) return fallback;

  const loose = moment(clean);
  return loose.isValid() ? loose : null;
}

/**
 * Checks whether a report record date falls inclusively within [startDate, endDate].
 */
export function isDateInReportRange(
  dateStr?: string | null,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate || !endDate) return true;
  const parsed = parseFlexibleReportDate(dateStr);
  if (!parsed) return true;

  const start = moment(startDate, "YYYY-MM-DD").startOf("day");
  const end = moment(endDate, "YYYY-MM-DD").endOf("day");
  return parsed.isBetween(start, end, undefined, "[]");
}

/**
 * Formats an arbitrary report date into concise DD MMM, YYYY display text.
 */
export function formatShortReportDate(
  dateStr?: string | null,
  fallback = "-"
): string {
  const parsed = parseFlexibleReportDate(dateStr);
  return parsed ? parsed.format("DD MMM, YYYY") : fallback;
}

