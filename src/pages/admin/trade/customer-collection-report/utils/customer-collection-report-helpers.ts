import moment from "moment";
import { formatMoney } from "@/utils/formatters";
import {
  buildAndDownloadExcel,
  resolveThemeArgb,
  argbToRgbTuple,
} from "@/utils/excel-export";
import {
  buildDynamicExcelPayload,
  buildDynamicPdfPayload,
  type ExportColumnDef,
} from "@/utils/report-export-columns";
import {
  type ReportCompanyMeta,
  REPORT_RGB,
  calculateRevenueSharePct,
  formatShortReportDate,
  generateAndDownloadCorporatePdf,
  isDateInReportRange,
  parseFlexibleReportDate,
} from "@/utils/trade-report-helpers";
import type {
  CollectionReportItem,
  CustomerDueItem,
} from "@/types/collection.types";
import type { CollectionReceiptData } from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";

export type CollectionReportTab = "vouchers" | "customers" | "dues";

export interface NormalizedCollectionRecord {
  id: string | number;
  voucherNo: string;
  collectionDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentMode: string;
  cashPaid: number;
  digitalPaid: number;
  totalAmount: number;
  totalDiscount: number;
  billsCount: number;
  billsSummary: string;
  remark: string;
  receiptData: CollectionReceiptData;
}

export interface CustomerCollectionSummary {
  customerKey: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  voucherCount: number;
  billsSettled: number;
  cashPaid: number;
  digitalPaid: number;
  totalDiscount: number;
  totalCollected: number;
  currentDue: number;
  lastCollectionDate: string;
}

export interface NormalizedCustomerDueRow {
  customerKey: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  invoiceCount: number;
  lastSaleDate: string;
  totalDue: number;
}

function getCustomerLookupKey(
  customerId?: string | number | null,
  phone?: string | null,
  name?: string | null
): string {
  const idStr = String(customerId ?? "").trim();
  if (idStr && idStr !== "0" && idStr !== "walkin") return `id_${idStr}`;
  const phoneStr = String(phone ?? "").replace(/\s+/g, "").trim();
  if (phoneStr && phoneStr !== "-") return `ph_${phoneStr}`;
  return `name_${String(name || "Customer").trim().toLowerCase()}`;
}

/**
 * Normalizes customer collection report records and filters inclusively by date range.
 */
export function normalizeCollectionReportRecords(
  rawList: CollectionReportItem[],
  startDate?: string,
  endDate?: string
): NormalizedCollectionRecord[] {
  if (!Array.isArray(rawList)) return [];

  const result: NormalizedCollectionRecord[] = [];

  rawList.forEach((item: any, idx: number) => {
    const rawDate =
      item.collectionDate || item.date || item.addedDate || item.createdAt || "";
    if (!isDateInReportRange(rawDate, startDate, endDate)) return;

    const details: any[] = Array.isArray(item.collectionDetails)
      ? item.collectionDetails
      : Array.isArray(item.details)
      ? item.details
      : [];

    const voucherNo = String(
      item.collectionNo || item.voucherNo || item.id || `COL-${idx + 1}`
    );
    const totalAmount = Number(item.totalAmount ?? item.amount ?? 0);
    const totalDiscount = Number(item.totalDiscount ?? item.discount ?? 0);
    const paymentMode = String(item.paymentMode || "Cash").trim() || "Cash";
    const modeLower = paymentMode.toLowerCase();

    const explicitCash = Number(item.cashAmount ?? 0);
    const explicitDigital =
      Number(item.bankAmount ?? 0) + Number(item.mfsAmount ?? 0);

    let cashPaid = 0;
    let digitalPaid = 0;
    if (explicitCash > 0 || explicitDigital > 0) {
      cashPaid = explicitCash;
      digitalPaid = explicitDigital;
    } else if (modeLower.includes("bank") || modeLower.includes("mfs")) {
      digitalPaid = totalAmount;
    } else {
      cashPaid = totalAmount;
    }

    const bills = details
      .map((d) => String(d.invoiceNo || "").trim())
      .filter((inv) => inv && inv !== "-");

    const customerName = String(
      item.customerName || item.name || "Customer"
    ).trim();
    const customerPhone = String(item.customerPhone || item.phone || "").trim();

    const receiptData: CollectionReceiptData = {
      receiptNo: voucherNo,
      collectionDate: formatShortReportDate(rawDate, rawDate || "-"),
      customerName,
      customerPhone: customerPhone || "-",
      customerId: item.customerId ?? item.id ?? "",
      totalAmount,
      totalDiscount,
      paymentMode,
      remark: item.remark || item.notes || "",
      cashAmount: item.cashAmount,
      bankAmount: item.bankAmount,
      mfsAmount: item.mfsAmount,
      bankDetails: item.bankDetails,
      mfsDetails: item.mfsDetails,
      allocations: details.map((d) => ({
        invoiceNo: d.invoiceNo || "-",
        paidAmount: Number(d.paidAmount || 0),
        discountAmount: Number(d.discountAmount || 0),
        dueAmount: Number(d.dueAmount || 0),
      })),
    };

    result.push({
      id: item.id || voucherNo || idx,
      voucherNo,
      collectionDate: rawDate,
      customerId: String(item.customerId ?? ""),
      customerName,
      customerPhone,
      paymentMode,
      cashPaid,
      digitalPaid,
      totalAmount,
      totalDiscount,
      billsCount: bills.length || details.length,
      billsSummary: bills.length > 0 ? bills.join(", ") : "-",
      remark: String(item.remark || item.notes || "").trim() || "-",
      receiptData,
    });
  });

  return result.sort((a, b) => {
    const mA = parseFlexibleReportDate(a.collectionDate);
    const mB = parseFlexibleReportDate(b.collectionDate);
    return (mB ? mB.valueOf() : 0) - (mA ? mA.valueOf() : 0);
  });
}

/**
 * Enriches customer due items with master party addresses and sales invoice due counts.
 */
export function normalizeCustomerDueRows(
  customersDue: CustomerDueItem[],
  rawPartyData?: any,
  salesList?: any[]
): NormalizedCustomerDueRow[] {
  if (!Array.isArray(customersDue)) return [];

  const addressByKey = new Map<string, string>();
  let partyList: any[] = [];
  if (Array.isArray(rawPartyData)) partyList = rawPartyData;
  else if (rawPartyData && typeof rawPartyData === "object") {
    partyList =
      rawPartyData.customerList ||
      rawPartyData.partyList ||
      rawPartyData.partyInfoList ||
      rawPartyData.data ||
      [];
  }

  if (Array.isArray(partyList)) {
    partyList.forEach((p: any) => {
      const addr = String(p.address || p.partyAddress || "").trim();
      if (!addr) return;
      if (p.id) addressByKey.set(String(p.id), addr);
      if (p.partyId) addressByKey.set(String(p.partyId), addr);
      const phone = String(p.phone || p.partyPhone || "").trim();
      if (phone) addressByKey.set(phone, addr);
    });
  }

  const dueInvoicesById = new Map<string, Set<string>>();
  const dueInvoicesByPhone = new Map<string, Set<string>>();
  if (Array.isArray(salesList)) {
    salesList.forEach((s: any, idx: number) => {
      const due = Number(s.dueAmount ?? s.due_amount ?? 0);
      if (due <= 0) return;
      const invNo = String(s.invoiceNo || s.orderNo || s.id || `sale-${idx}`);
      const cId = String(s.customerId ?? s.customer_id ?? "").trim();
      const cPhone = String(
        s.customerPhone ?? s.customer_phone ?? s.phone ?? ""
      ).trim();

      if (cId) {
        if (!dueInvoicesById.has(cId)) dueInvoicesById.set(cId, new Set());
        dueInvoicesById.get(cId)!.add(invNo);
      }
      if (cPhone) {
        if (!dueInvoicesByPhone.has(cPhone)) {
          dueInvoicesByPhone.set(cPhone, new Set());
        }
        dueInvoicesByPhone.get(cPhone)!.add(invNo);
      }
    });
  }

  return customersDue
    .map((c, idx) => {
      const idStr = String(c.customerId ?? c.id ?? idx);
      const phoneStr = String(c.customerPhone ?? "").trim();
      const totalDue = Number(c.totalDue ?? c.dueAmount ?? 0);
      const resolvedAddr =
        (c.customerAddress && c.customerAddress !== "-"
          ? c.customerAddress
          : addressByKey.get(idStr) || addressByKey.get(phoneStr)) || "-";

      const matchedCount =
        dueInvoicesById.get(idStr)?.size ??
        (phoneStr ? dueInvoicesByPhone.get(phoneStr)?.size : undefined) ??
        0;
      const invoiceCount =
        matchedCount > 0
          ? matchedCount
          : Number(c.invoiceCount || 0) > 0
          ? Number(c.invoiceCount)
          : totalDue > 0
          ? 1
          : 0;

      return {
        customerKey: getCustomerLookupKey(idStr, phoneStr, c.customerName),
        customerId: idStr,
        customerName: String(c.customerName || "General Customer"),
        customerPhone: phoneStr || "-",
        customerAddress: resolvedAddr,
        invoiceCount,
        lastSaleDate: String(c.lastSaleDate || ""),
        totalDue,
      };
    })
    .filter((row) => row.totalDue > 0);
}

export function computeCollectionReportKpis(
  collections: NormalizedCollectionRecord[],
  dueRows: NormalizedCustomerDueRow[]
): {
  totalCollected: number;
  totalDiscount: number;
  voucherCount: number;
  cashCollected: number;
  digitalCollected: number;
  avgCollection: number;
  totalOutstandingDue: number;
  dueCustomersCount: number;
} {
  let totalCollected = 0;
  let totalDiscount = 0;
  let cashCollected = 0;
  let digitalCollected = 0;

  collections.forEach((c) => {
    totalCollected += c.totalAmount;
    totalDiscount += c.totalDiscount;
    cashCollected += c.cashPaid;
    digitalCollected += c.digitalPaid;
  });

  const totalOutstandingDue = dueRows.reduce((s, d) => s + d.totalDue, 0);

  return {
    totalCollected,
    totalDiscount,
    voucherCount: collections.length,
    cashCollected,
    digitalCollected,
    avgCollection: collections.length > 0 ? totalCollected / collections.length : 0,
    totalOutstandingDue,
    dueCustomersCount: dueRows.length,
  };
}

export function aggregateCustomerCollections(
  collections: NormalizedCollectionRecord[],
  dueRows: NormalizedCustomerDueRow[]
): CustomerCollectionSummary[] {
  const dueLookup = new Map<string, number>();
  dueRows.forEach((d) => {
    dueLookup.set(d.customerKey, d.totalDue);
    if (d.customerId) dueLookup.set(`id_${d.customerId}`, d.totalDue);
    if (d.customerPhone && d.customerPhone !== "-") {
      dueLookup.set(
        `ph_${d.customerPhone.replace(/\s+/g, "")}`,
        d.totalDue
      );
    }
  });

  const map: Record<string, CustomerCollectionSummary> = {};

  collections.forEach((c) => {
    const key = getCustomerLookupKey(c.customerId, c.customerPhone, c.customerName);
    if (!map[key]) {
      const remainingDue =
        dueLookup.get(key) ??
        (c.customerId ? dueLookup.get(`id_${c.customerId}`) : undefined) ??
        (c.customerPhone
          ? dueLookup.get(`ph_${c.customerPhone.replace(/\s+/g, "")}`)
          : undefined) ??
        0;

      map[key] = {
        customerKey: key,
        customerId: c.customerId,
        customerName: c.customerName,
        customerPhone: c.customerPhone || "-",
        voucherCount: 0,
        billsSettled: 0,
        cashPaid: 0,
        digitalPaid: 0,
        totalDiscount: 0,
        totalCollected: 0,
        currentDue: remainingDue,
        lastCollectionDate: c.collectionDate,
      };
    }

    map[key].voucherCount += 1;
    map[key].billsSettled += c.billsCount;
    map[key].cashPaid += c.cashPaid;
    map[key].digitalPaid += c.digitalPaid;
    map[key].totalDiscount += c.totalDiscount;
    map[key].totalCollected += c.totalAmount;

    const currM = parseFlexibleReportDate(c.collectionDate);
    const prevM = parseFlexibleReportDate(map[key].lastCollectionDate);
    if (currM && (!prevM || currM.isAfter(prevM))) {
      map[key].lastCollectionDate = c.collectionDate;
    }
  });

  return Object.values(map);
}

// ============================================================================
// Tab 1 Export: Collection Vouchers Excel & PDF
// ============================================================================

function buildCollectionVoucherColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<
  NormalizedCollectionRecord,
  { sumDiscount: number; sumCollected: number }
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
      key: "collectionDate",
      excelHeader: "Date",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => formatShortReportDate(r.collectionDate),
      pdfCell: (r) => formatShortReportDate(r.collectionDate),
    },
    {
      key: "voucherNo",
      excelHeader: "Voucher No",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.voucherNo,
      pdfCell: (r) => r.voucherNo,
    },
    {
      key: "customer",
      excelHeader: "Customer Name",
      pdfHeader: "Customer",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (r) => r.customerName,
      pdfCell: (r) => ({ content: r.customerName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.customerPhone || "-",
      pdfCell: (r) => r.customerPhone || "-",
    },
    {
      key: "method",
      excelHeader: "Method",
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.paymentMode,
      pdfCell: (r) => r.paymentMode,
    },
    {
      key: "bills",
      excelHeader: "Adjusted Bills",
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.billsSummary,
      pdfCell: (r) => r.billsSummary,
    },
    {
      key: "discount",
      excelHeader: "Discount (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (r) => Number(r.totalDiscount.toFixed(2)),
      excelTotalValue: (t) => Number(t.sumDiscount.toFixed(2)),
      pdfCell: (r) => (r.totalDiscount > 0 ? formatMoney(r.totalDiscount) : "-"),
      pdfSummaryCell: (t) => ({
        content: t.sumDiscount > 0 ? formatMoney(t.sumDiscount) : "-",
      }),
    },
    {
      key: "collected",
      excelHeader: "Collected (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (r) => Number(r.totalAmount.toFixed(2)),
      excelTotalValue: (t) => Number(t.sumCollected.toFixed(2)),
      pdfCell: (r) => ({
        content: formatMoney(r.totalAmount),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumCollected),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "remark",
      excelHeader: "Remark",
      pdfStyle: { halign: "left" },
      excelValue: (r) => r.remark,
      pdfCell: (r) => r.remark,
    },
  ];
}

export async function exportCollectionVouchersExcel(
  records: NormalizedCollectionRecord[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!records || records.length === 0) {
    throw new Error("No collection records available to export");
  }

  const totals = records.reduce(
    (acc, r) => {
      acc.sumDiscount += r.totalDiscount;
      acc.sumCollected += r.totalAmount;
      return acc;
    },
    { sumDiscount: 0, sumCollected: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildCollectionVoucherColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    records,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Vouchers)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Customer_Collection_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Collection History",
    reportTitle: "Customer Collection Report",
    totalLabel: "Total Vouchers",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadCollectionVouchersPdf(
  records: NormalizedCollectionRecord[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error("No collection records available to download PDF");
  }

  const totals = records.reduce(
    (acc, r) => {
      acc.sumDiscount += r.totalDiscount;
      acc.sumCollected += r.totalAmount;
      return acc;
    },
    { sumDiscount: 0, sumCollected: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildCollectionVoucherColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    records,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Vouchers)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Collection_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Customer Collection Report",
    metaRightLabel: `Total Vouchers: ${records.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Tab 2 Export: Customer-Wise Collections Excel & PDF
// ============================================================================

function buildCustomerCollectionSummaryColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<
  CustomerCollectionSummary,
  {
    vouchers: number;
    bills: number;
    cash: number;
    digital: number;
    discount: number;
    collected: number;
    due: number;
  }
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
      key: "customerName",
      excelHeader: "Customer Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (c) => c.customerName,
      pdfCell: (c) => ({ content: c.customerName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (c) => c.customerPhone,
      pdfCell: (c) => c.customerPhone,
    },
    {
      key: "voucherCount",
      excelHeader: "Vouchers",
      pdfStyle: { halign: "center" },
      excelValue: (c) => c.voucherCount,
      excelTotalValue: (t) => t.vouchers,
      pdfCell: (c) => c.voucherCount,
      pdfSummaryCell: (t) => ({
        content: t.vouchers,
        styles: { halign: "center" },
      }),
    },
    {
      key: "billsSettled",
      excelHeader: "Bills Settled",
      pdfStyle: { halign: "center" },
      excelValue: (c) => c.billsSettled,
      excelTotalValue: (t) => t.bills,
      pdfCell: (c) => c.billsSettled,
      pdfSummaryCell: (t) => ({
        content: t.bills,
        styles: { halign: "center" },
      }),
    },
    {
      key: "cashPaid",
      excelHeader: "Cash Paid (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (c) => Number(c.cashPaid.toFixed(2)),
      excelTotalValue: (t) => Number(t.cash.toFixed(2)),
      pdfCell: (c) => formatMoney(c.cashPaid),
      pdfSummaryCell: (t) => ({ content: formatMoney(t.cash) }),
    },
    {
      key: "digitalPaid",
      excelHeader: "Bank / MFS (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (c) => Number(c.digitalPaid.toFixed(2)),
      excelTotalValue: (t) => Number(t.digital.toFixed(2)),
      pdfCell: (c) =>
        c.digitalPaid > 0 ? formatMoney(c.digitalPaid) : "-",
      pdfSummaryCell: (t) => ({
        content: t.digital > 0 ? formatMoney(t.digital) : "-",
      }),
    },
    {
      key: "totalDiscount",
      excelHeader: "Discount (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (c) => Number(c.totalDiscount.toFixed(2)),
      excelTotalValue: (t) => Number(t.discount.toFixed(2)),
      pdfCell: (c) =>
        c.totalDiscount > 0 ? formatMoney(c.totalDiscount) : "-",
      pdfSummaryCell: (t) => ({
        content: t.discount > 0 ? formatMoney(t.discount) : "-",
      }),
    },
    {
      key: "totalCollected",
      excelHeader: "Total Collected (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (c) => Number(c.totalCollected.toFixed(2)),
      excelTotalValue: (t) => Number(t.collected.toFixed(2)),
      pdfCell: (c) => ({
        content: formatMoney(c.totalCollected),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.collected),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "currentDue",
      excelHeader: "Remaining Due (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (c) => Number(c.currentDue.toFixed(2)),
      excelTotalValue: (t) => Number(t.due.toFixed(2)),
      pdfCell: (c) => ({
        content: c.currentDue > 0 ? formatMoney(c.currentDue) : "-",
        styles: {
          fontStyle: "bold",
          textColor: c.currentDue > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      }),
      pdfSummaryCell: (t) => ({
        content: t.due > 0 ? formatMoney(t.due) : "-",
        styles: {
          textColor: t.due > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      }),
    },
    {
      key: "lastCollectionDate",
      excelHeader: "Last Collection",
      pdfStyle: { halign: "center" },
      excelValue: (c) => formatShortReportDate(c.lastCollectionDate),
      pdfCell: (c) => formatShortReportDate(c.lastCollectionDate),
    },
  ];
}

export async function exportCustomerCollectionSummaryExcel(
  customers: CustomerCollectionSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!customers || customers.length === 0) {
    throw new Error("No customer collection summaries available to export");
  }

  const totals = customers.reduce(
    (acc, c) => {
      acc.vouchers += c.voucherCount;
      acc.bills += c.billsSettled;
      acc.cash += c.cashPaid;
      acc.digital += c.digitalPaid;
      acc.discount += c.totalDiscount;
      acc.collected += c.totalCollected;
      acc.due += c.currentDue;
      return acc;
    },
    {
      vouchers: 0,
      bills: 0,
      cash: 0,
      digital: 0,
      discount: 0,
      collected: 0,
      due: 0,
    }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildCustomerCollectionSummaryColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    customers,
    columns,
    totals,
    `TOTAL SUMMARY (${customers.length} Customers)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Customer_Collection_Summary_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Customer Summary",
    reportTitle: "Customer-Wise Collection Summary Report",
    totalLabel: "Total Customers",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadCustomerCollectionSummaryPdf(
  customers: CustomerCollectionSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!customers || customers.length === 0) {
    throw new Error("No customer collection summaries available to download PDF");
  }

  const totals = customers.reduce(
    (acc, c) => {
      acc.vouchers += c.voucherCount;
      acc.bills += c.billsSettled;
      acc.cash += c.cashPaid;
      acc.digital += c.digitalPaid;
      acc.discount += c.totalDiscount;
      acc.collected += c.totalCollected;
      acc.due += c.currentDue;
      return acc;
    },
    {
      vouchers: 0,
      bills: 0,
      cash: 0,
      digital: 0,
      discount: 0,
      collected: 0,
      due: 0,
    }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildCustomerCollectionSummaryColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    customers,
    columns,
    totals,
    `TOTAL SUMMARY (${customers.length} Customers)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Collection_Summary_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Customer-Wise Collection Summary Report",
    metaRightLabel: `Total Customers: ${customers.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Tab 3 Export: Outstanding Customer Dues Report Excel & PDF
// ============================================================================

function buildCustomerDueReportColumns(
  grandTotalDue: number
): ExportColumnDef<
  NormalizedCustomerDueRow,
  { totalInvoices: number; totalDue: number }
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
      key: "customerName",
      excelHeader: "Customer Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (d) => d.customerName,
      pdfCell: (d) => ({ content: d.customerName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (d) => d.customerPhone,
      pdfCell: (d) => d.customerPhone,
    },
    {
      key: "address",
      excelHeader: "Address",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (d) => d.customerAddress,
      pdfCell: (d) => d.customerAddress,
    },
    {
      key: "invoiceCount",
      excelHeader: "Pending Invoices",
      pdfHeader: "Invoices",
      pdfStyle: { halign: "center" },
      excelValue: (d) => d.invoiceCount,
      excelTotalValue: (t) => t.totalInvoices,
      pdfCell: (d) => d.invoiceCount,
      pdfSummaryCell: (t) => ({
        content: t.totalInvoices,
        styles: { halign: "center" },
      }),
    },
    {
      key: "lastSaleDate",
      excelHeader: "Last Sale Date",
      pdfStyle: { halign: "center" },
      excelValue: (d) => formatShortReportDate(d.lastSaleDate),
      pdfCell: (d) => formatShortReportDate(d.lastSaleDate),
    },
    {
      key: "totalDue",
      excelHeader: "Outstanding Due (BDT)",
      pdfHeader: "Due (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (d) => Number(d.totalDue.toFixed(2)),
      excelTotalValue: (t) => Number(t.totalDue.toFixed(2)),
      pdfCell: (d) => ({
        content: formatMoney(d.totalDue),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.rose },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalDue),
        styles: { textColor: REPORT_RGB.rose },
      }),
    },
    {
      key: "dueShare",
      excelHeader: "Receivable Share (%)",
      pdfHeader: "Share (%)",
      pdfStyle: { halign: "right" },
      excelValue: (d) =>
        `${calculateRevenueSharePct(d.totalDue, grandTotalDue)}%`,
      excelTotalValue: () => "100.0%",
      pdfCell: (d) => `${calculateRevenueSharePct(d.totalDue, grandTotalDue)}%`,
      pdfSummaryCell: () => ({ content: "100.0%" }),
    },
  ];
}

export async function exportCustomerDueReportExcel(
  dueRows: NormalizedCustomerDueRow[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!dueRows || dueRows.length === 0) {
    throw new Error("No customer due records available to export");
  }

  const totals = dueRows.reduce(
    (acc, d) => {
      acc.totalInvoices += d.invoiceCount;
      acc.totalDue += d.totalDue;
      return acc;
    },
    { totalInvoices: 0, totalDue: 0 }
  );

  const columns = buildCustomerDueReportColumns(totals.totalDue);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    dueRows,
    columns,
    totals,
    `TOTAL RECEIVABLE (${dueRows.length} Customers)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Customer_Due_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Customer Dues",
    reportTitle: "Customer Receivable & Due Report",
    totalLabel: "Due Customers",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadCustomerDueReportPdf(
  dueRows: NormalizedCustomerDueRow[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!dueRows || dueRows.length === 0) {
    throw new Error("No customer due records available to download PDF");
  }

  const totals = dueRows.reduce(
    (acc, d) => {
      acc.totalInvoices += d.invoiceCount;
      acc.totalDue += d.totalDue;
      return acc;
    },
    { totalInvoices: 0, totalDue: 0 }
  );

  const columns = buildCustomerDueReportColumns(totals.totalDue);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    dueRows,
    columns,
    totals,
    `TOTAL RECEIVABLE (${dueRows.length} Customers)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Due_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Customer Receivable & Due Report",
    metaRightLabel: `Due Customers: ${dueRows.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Customer Statement & Activity Timeline Helpers (Detailed Description)
// ============================================================================

export type CustomerStatementEventType =
  | "OPENING"
  | "CREDIT_SALE"
  | "CASH_SALE"
  | "COLLECTION"
  | "SALES_RETURN";

export interface CustomerStatementEntry {
  id: string;
  sl: number;
  rawDate: string;
  formattedDate: string;
  formattedTime: string;
  hasTime: boolean;
  fullDateTimeStr: string;
  type: CustomerStatementEventType;
  typeLabel: string;
  refNo: string;
  description: string;
  note?: string;
  paymentMode?: string;
  salesAmount: number;
  collectionAmount: number;
  discountAmount?: number;
  runningBalance: number;
  receiptData?: CollectionReceiptData;
  rawRecord?: any;
}

export interface CustomerStatementResult {
  entries: CustomerStatementEntry[];
  stats: {
    openingBalance: number;
    totalSales: number;
    totalCollected: number;
    totalDiscount: number;
    finalBalance: number;
    entryCount: number;
  };
}

export function isSameCustomer(
  record: any,
  target: {
    customerId?: string | number | null;
    customerPhone?: string | null;
    customerName?: string | null;
    customerKey?: string | null;
  }
): boolean {
  if (!record || !target) return false;

  const targetId = String(target.customerId ?? "").trim();
  const recId = String(
    record.customerId ??
      record.customer_id ??
      record.partyId ??
      record.party_id ??
      record.id ??
      ""
  ).trim();

  if (
    targetId &&
    recId &&
    targetId !== "0" &&
    targetId !== "walkin" &&
    targetId === recId
  ) {
    return true;
  }

  const cleanPhone = (p?: any) => {
    const digits = String(p ?? "").replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : "";
  };

  const targetPhone = cleanPhone(target.customerPhone);
  const recPhone = cleanPhone(
    record.customerPhone ??
      record.customer_phone ??
      record.phone ??
      record.partyPhone ??
      record.party_phone
  );

  if (targetPhone && recPhone && targetPhone === recPhone) {
    return true;
  }

  const cleanName = (n?: any) => String(n ?? "").toLowerCase().trim();
  const targetName = cleanName(target.customerName);
  const recName = cleanName(
    record.customerName ??
      record.customer_name ??
      record.name ??
      record.partyName ??
      record.party_name
  );

  if (
    targetName &&
    recName &&
    targetName === recName &&
    targetName !== "customer" &&
    targetName !== "general customer" &&
    targetName !== "walk-in customer"
  ) {
    return true;
  }

  return false;
}

export function parseDateAndTime(dateStr?: string | null): {
  momentObj: moment.Moment;
  formattedDate: string;
  formattedTime: string;
  hasTime: boolean;
  fullDateTimeStr: string;
} {
  const raw = String(dateStr || "").trim();
  if (!raw) {
    return {
      momentObj: moment(0),
      formattedDate: "-",
      formattedTime: "",
      hasTime: false,
      fullDateTimeStr: "-",
    };
  }

  let m = moment(raw, [
    moment.ISO_8601,
    "YYYY-MM-DD HH:mm:ss",
    "YYYY-MM-DD hh:mm:ss A",
    "YYYY-MM-DD",
    "DD-MM-YYYY HH:mm:ss",
    "DD-MM-YYYY hh:mm:ss A",
    "DD-MM-YYYY",
    "DD/MM/YYYY HH:mm:ss",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
  ]);

  if (!m.isValid()) {
    m = moment(raw);
  }

  const isValid = m.isValid();
  const rawHasColon = raw.includes(":");
  const isMidnight =
    isValid && m.hours() === 0 && m.minutes() === 0 && m.seconds() === 0;
  const hasRealTime = isValid && rawHasColon && !isMidnight;

  return {
    momentObj: isValid ? m : moment(0),
    formattedDate: isValid ? m.format("DD MMM, YYYY") : raw,
    formattedTime: hasRealTime ? m.format("hh:mm A") : "",
    hasTime: hasRealTime,
    fullDateTimeStr: isValid
      ? hasRealTime
        ? m.format("DD MMM, YYYY • hh:mm A")
        : m.format("DD MMM, YYYY")
      : raw,
  };
}

/**
 * Builds clean, chronological customer statement entries:
 * SL | Date | Description | Sales (Debit) | Collection (Credit) | Running Balance
 */
export function buildCustomerStatementEntries(
  customer: CustomerCollectionSummary,
  allCollections: NormalizedCollectionRecord[],
  salesList: any[] = [],
  rawPartyData?: any,
  options?: {
    startDate?: string;
    endDate?: string;
  }
): CustomerStatementResult {
  // Extract party list for explicit opening balance
  let partyList: any[] = [];
  if (Array.isArray(rawPartyData)) partyList = rawPartyData;
  else if (rawPartyData && typeof rawPartyData === "object") {
    partyList =
      rawPartyData.customerList ||
      rawPartyData.partyList ||
      rawPartyData.partyInfoList ||
      rawPartyData.data ||
      [];
  }

  const matchedParty = partyList.find((p) => isSameCustomer(p, customer));
  const explicitOpeningBalance = Number(
    matchedParty?.openingBalance ?? matchedParty?.balance ?? 0
  );

  const matchedCollections = allCollections.filter((c) =>
    isSameCustomer(c, customer)
  );

  const rawSales = Array.isArray(salesList) ? salesList : [];
  const matchedSales = rawSales.filter((s) => isSameCustomer(s, customer));

  type UnsortedEntry = {
    sortMoment: moment.Moment;
    priority: number;
    rawDate: string;
    formattedDate: string;
    formattedTime: string;
    hasTime: boolean;
    fullDateTimeStr: string;
    type: CustomerStatementEventType;
    typeLabel: string;
    refNo: string;
    description: string;
    note?: string;
    paymentMode?: string;
    salesAmount: number;
    collectionAmount: number;
    discountAmount?: number;
    receiptData?: CollectionReceiptData;
    rawRecord?: any;
  };

  const rawEntries: UnsortedEntry[] = [];

  // Track all invoice numbers that are settled by Collection Vouchers to prevent double counting
  const voucherSettledInvoices = new Set<string>();
  matchedCollections.forEach((c) => {
    if (Array.isArray(c.receiptData?.allocations)) {
      c.receiptData.allocations.forEach((a) => {
        const inv = String(a.invoiceNo || "").trim().toLowerCase();
        if (inv && inv !== "-") {
          voucherSettledInvoices.add(inv);
        }
      });
    }
    if (c.billsSummary && c.billsSummary !== "-") {
      c.billsSummary.split(",").forEach((s) => {
        const inv = s.trim().toLowerCase();
        if (inv && inv !== "-") {
          voucherSettledInvoices.add(inv);
        }
      });
    }
  });

  // Add Sales
  matchedSales.forEach((s, idx) => {
    const rawDate =
      s.salesDate ||
      s.saleDate ||
      s.date ||
      s.createdAt ||
      s.createdDate ||
      "";
    if (!isDateInReportRange(rawDate, options?.startDate, options?.endDate)) {
      return;
    }

    const { momentObj, formattedDate, formattedTime, hasTime, fullDateTimeStr } =
      parseDateAndTime(rawDate);
    const grandTotal = Number(
      s.grandTotal ?? s.grand_total ?? s.totalAmount ?? s.total_amount ?? 0
    );
    const paidAmount = Number(s.paidAmount ?? s.paid_amount ?? 0);
    const dueAmount = Number(s.dueAmount ?? s.due_amount ?? 0);
    const paymentType = String(
      s.paymentType || s.payment_type || ""
    ).toUpperCase();
    const invNo = String(
      s.invoiceNo || s.orderNo || s.id || `INV-${idx + 1}`
    );

    const isReturn =
      Boolean(s.isReturnRecord) ||
      Boolean(s.hasReturn && s.returnNo) ||
      paymentType.includes("RETURN");

    if (isReturn) {
      rawEntries.push({
        sortMoment: momentObj,
        priority: 4,
        rawDate,
        formattedDate,
        formattedTime,
        hasTime,
        fullDateTimeStr,
        type: "SALES_RETURN",
        typeLabel: "Return",
        refNo: String(s.returnNo || invNo),
        description: "Sales Return",
        note: s.notes || s.remark || "",
        paymentMode: "Return",
        salesAmount: 0,
        collectionAmount: grandTotal,
        rawRecord: s,
      });
      return;
    }

    const cleanNote = (s.notes && s.notes !== "-" ? s.notes : "") || (s.remark && s.remark !== "-" ? s.remark : "");
    const isSettledByVoucher = voucherSettledInvoices.has(invNo.toLowerCase());

    if (isSettledByVoucher) {
      // The collection for this invoice is captured by the Collection Voucher itself
      rawEntries.push({
        sortMoment: momentObj,
        priority: 1,
        rawDate,
        formattedDate,
        formattedTime,
        hasTime,
        fullDateTimeStr,
        type: "CREDIT_SALE",
        typeLabel: "Sale",
        refNo: invNo,
        description: "Sale",
        note: cleanNote || "",
        paymentMode: "Credit",
        salesAmount: grandTotal,
        collectionAmount: 0,
        rawRecord: s,
      });
      return;
    }

    const isCashSale =
      paymentType === "CASH" ||
      (paidAmount >= grandTotal && grandTotal > 0 && dueAmount <= 0);

    if (isCashSale) {
      rawEntries.push({
        sortMoment: momentObj,
        priority: 2,
        rawDate,
        formattedDate,
        formattedTime,
        hasTime,
        fullDateTimeStr,
        type: "CASH_SALE",
        typeLabel: "Cash Sale",
        refNo: invNo,
        description: "Cash Sale",
        note: cleanNote,
        paymentMode: "Cash",
        salesAmount: grandTotal,
        collectionAmount: paidAmount > 0 ? paidAmount : grandTotal,
        rawRecord: s,
      });
    } else {
      const paidNote =
        paidAmount > 0
          ? `Paid: ৳${formatMoney(paidAmount)}${cleanNote ? ` • ${cleanNote}` : ""}`
          : cleanNote;

      rawEntries.push({
        sortMoment: momentObj,
        priority: 1,
        rawDate,
        formattedDate,
        formattedTime,
        hasTime,
        fullDateTimeStr,
        type: "CREDIT_SALE",
        typeLabel: "Credit Sale",
        refNo: invNo,
        description: "Credit Sale",
        note: paidNote,
        paymentMode: paymentType || "Credit",
        salesAmount: grandTotal,
        collectionAmount: paidAmount > 0 ? paidAmount : 0,
        rawRecord: s,
      });
    }
  });

  // Add Collections
  matchedCollections.forEach((c) => {
    const rawDate = c.collectionDate || "";
    if (!isDateInReportRange(rawDate, options?.startDate, options?.endDate)) {
      return;
    }

    const { momentObj, formattedDate, formattedTime, hasTime, fullDateTimeStr } =
      parseDateAndTime(rawDate);
    const bills =
      c.billsSummary && c.billsSummary !== "-" ? c.billsSummary : "";
    const remark = c.remark && c.remark !== "-" ? c.remark : "";

    let cleanNote = "";
    if (bills) cleanNote = `Settled: #${bills}`;
    if (remark && !remark.toLowerCase().includes("sales collection for invoice")) {
      cleanNote = cleanNote ? `${cleanNote} • ${remark}` : remark;
    }

    const tenderMode =
      c.paymentMode.toLowerCase() === "multi"
        ? "Multi"
        : c.paymentMode.toLowerCase() === "cash"
        ? "Cash"
        : c.paymentMode;

    rawEntries.push({
      sortMoment: momentObj,
      priority: 3,
      rawDate,
      formattedDate,
      formattedTime,
      hasTime,
      fullDateTimeStr,
      type: "COLLECTION",
      typeLabel: "Collection",
      refNo: c.voucherNo,
      description: "Collection Received",
      note: cleanNote,
      paymentMode: tenderMode,
      salesAmount: 0,
      collectionAmount: c.totalAmount + c.totalDiscount,
      discountAmount: c.totalDiscount,
      receiptData: c.receiptData,
      rawRecord: c,
    });
  });

  // Reconcile Opening Balance
  const periodSales = rawEntries.reduce((sum, e) => sum + e.salesAmount, 0);
  const periodCollected = rawEntries.reduce(
    (sum, e) => sum + e.collectionAmount,
    0
  );

  const implicitOpening =
    customer.currentDue + periodCollected - periodSales;
  const openingBalance =
    explicitOpeningBalance > 0
      ? explicitOpeningBalance
      : implicitOpening > 0
      ? implicitOpening
      : 0;

  let openingDateStr = options?.startDate || "";
  if (!openingDateStr) {
    if (rawEntries.length > 0) {
      const minMoment = moment.min(rawEntries.map((e) => e.sortMoment));
      openingDateStr = minMoment
        .clone()
        .subtract(1, "hour")
        .format("YYYY-MM-DD HH:mm:ss");
    } else {
      openingDateStr = moment().startOf("month").format("YYYY-MM-DD HH:mm:ss");
    }
  }

  const openingParsed = parseDateAndTime(openingDateStr);

  const openingEntry: UnsortedEntry = {
    sortMoment: openingParsed.momentObj.clone().subtract(1, "year"),
    priority: 0,
    rawDate: openingDateStr,
    formattedDate: openingParsed.formattedDate,
    formattedTime: "",
    hasTime: false,
    fullDateTimeStr: openingParsed.formattedDate,
    type: "OPENING",
    typeLabel: "Opening Balance",
    refNo: "-",
    description: "Opening Balance",
    note: "",
    paymentMode: "-",
    salesAmount: 0,
    collectionAmount: 0,
  };

  // Sort chronological ascending
  const sortedRaw = [openingEntry, ...rawEntries].sort((a, b) => {
    const diff = a.sortMoment.valueOf() - b.sortMoment.valueOf();
    if (diff !== 0) return diff;
    return a.priority - b.priority;
  });

  // Compute running balance
  let running = openingBalance;
  const entries: CustomerStatementEntry[] = sortedRaw.map((item, idx) => {
    if (item.type === "OPENING") {
      return {
        id: `stmt_opening_${customer.customerKey}`,
        sl: idx + 1,
        rawDate: item.rawDate,
        formattedDate: item.formattedDate,
        formattedTime: "",
        hasTime: false,
        fullDateTimeStr: item.fullDateTimeStr,
        type: item.type,
        typeLabel: item.typeLabel,
        refNo: item.refNo,
        description: item.description,
        note: "",
        paymentMode: item.paymentMode,
        salesAmount: 0,
        collectionAmount: 0,
        runningBalance: running,
      };
    }

    running = running + item.salesAmount - item.collectionAmount;

    return {
      id: `stmt_${item.type}_${item.refNo}_${idx}`,
      sl: idx + 1,
      rawDate: item.rawDate,
      formattedDate: item.formattedDate,
      formattedTime: item.formattedTime,
      hasTime: item.hasTime,
      fullDateTimeStr: item.fullDateTimeStr,
      type: item.type,
      typeLabel: item.typeLabel,
      refNo: item.refNo,
      description: item.description,
      note: item.note,
      paymentMode: item.paymentMode,
      salesAmount: item.salesAmount,
      collectionAmount: item.collectionAmount,
      discountAmount: item.discountAmount,
      runningBalance: running,
      receiptData: item.receiptData,
      rawRecord: item.rawRecord,
    };
  });

  return {
    entries,
    stats: {
      openingBalance,
      totalSales: periodSales,
      totalCollected: periodCollected,
      totalDiscount: customer.totalDiscount || 0,
      finalBalance: running,
      entryCount: entries.length,
    },
  };
}

export async function exportCustomerStatementExcel(
  customer: CustomerCollectionSummary,
  statementEntries: CustomerStatementEntry[],
  meta: ReportCompanyMeta
): Promise<number> {
  if (!statementEntries || statementEntries.length === 0) {
    throw new Error("No statement entries to export");
  }

  const totals = statementEntries.reduce(
    (acc, e) => {
      acc.sales += e.salesAmount;
      acc.collected += e.collectionAmount;
      return acc;
    },
    { sales: 0, collected: 0 }
  );

  const finalBalance =
    statementEntries[statementEntries.length - 1]?.runningBalance ?? 0;

  const rows = statementEntries.map((e, idx) => ({
    "SL": idx + 1,
    "Date & Time": e.fullDateTimeStr || e.formattedDate,
    "Type": e.typeLabel,
    "Reference #": e.refNo && e.refNo !== "-" ? `#${e.refNo}` : "-",
    "Payment Mode": e.paymentMode || "-",
    "Description / Settled Bills": e.note
      ? `${e.description} • ${e.note}`
      : e.description,
    "Sales / Billed (BDT)": e.salesAmount > 0 ? e.salesAmount : "-",
    "Collection (BDT)": e.collectionAmount > 0 ? e.collectionAmount : "-",
    "Balance (BDT)": e.runningBalance,
  }));

  const totalRow = {
    "SL": "Total",
    "Date & Time": "-",
    "Type": "-",
    "Reference #": "-",
    "Payment Mode": "-",
    "Description / Settled Bills": `Customer: ${customer.customerName} (${customer.customerPhone}) • Closing Due: BDT ${finalBalance}`,
    "Sales / Billed (BDT)": totals.sales,
    "Collection (BDT)": totals.collected,
    "Balance (BDT)": finalBalance,
  };

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Customer_Statement_${customer.customerName.replace(
      /\s+/g,
      "_"
    )}_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Customer Statement",
    reportTitle: `Customer Statement - ${customer.customerName}`,
    totalLabel: "Closing Balance",
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadCustomerStatementPdf(
  customer: CustomerCollectionSummary,
  statementEntries: CustomerStatementEntry[],
  meta: ReportCompanyMeta
): Promise<void> {
  if (!statementEntries || statementEntries.length === 0) {
    throw new Error("No statement entries to download PDF");
  }

  const totals = statementEntries.reduce(
    (acc, e) => {
      acc.sales += e.salesAmount;
      acc.collected += e.collectionAmount;
      return acc;
    },
    { sales: 0, collected: 0 }
  );

  const headers = [
    "SL",
    "Date & Time",
    "Type / Ref",
    "Mode",
    "Description / Settled Bills",
    "Sales (BDT)",
    "Collection (BDT)",
    "Balance (BDT)",
  ];

  const bodyRows = statementEntries.map((e, idx) => {
    const typeAndRef =
      e.refNo && e.refNo !== "-"
        ? `${e.typeLabel} #${e.refNo}`
        : e.typeLabel;

    const desc = e.note ? `${e.description} • ${e.note}` : e.description;

    return [
      idx + 1,
      e.fullDateTimeStr || e.formattedDate,
      typeAndRef,
      e.paymentMode || "-",
      desc,
      e.salesAmount > 0 ? formatMoney(e.salesAmount) : "-",
      e.collectionAmount > 0 ? formatMoney(e.collectionAmount) : "-",
      formatMoney(e.runningBalance),
    ];
  });

  const finalBalance =
    statementEntries[statementEntries.length - 1]?.runningBalance ?? 0;

  bodyRows.push([
    "Total",
    "-",
    "-",
    "-",
    `Closing Balance: BDT ${formatMoney(finalBalance)}${finalBalance === 0 ? " (Fully Cleared)" : ""}`,
    formatMoney(totals.sales),
    formatMoney(totals.collected),
    formatMoney(finalBalance),
  ]);

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Statement_${customer.customerName.replace(
      /\s+/g,
      "_"
    )}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: `Customer Statement - ${customer.customerName}`,
    metaRightLabel: `Phone: ${customer.customerPhone} | Due: BDT ${formatMoney(customer.currentDue)}`,
    headers,
    bodyRows,
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 26 },
      2: { halign: "left", cellWidth: 28 },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "left" },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 24 },
      7: { halign: "right", cellWidth: 24 },
    },
    meta,
  });
}

/**
 * Multi-Customer detailed Excel report containing both high-level summaries
 * and complete chronological transaction ledgers for all filtered customers.
 */
export async function exportCustomerWiseDetailedExcel(
  customers: CustomerCollectionSummary[],
  allCollections: NormalizedCollectionRecord[],
  salesList: any[],
  rawPartyData: any[],
  meta: ReportCompanyMeta,
  options?: { startDate?: string; endDate?: string }
): Promise<number> {
  if (!customers || customers.length === 0) {
    throw new Error("No customer records to export");
  }

  // If single customer, export their dedicated statement
  if (customers.length === 1) {
    const single = customers[0];
    const stmt = buildCustomerStatementEntries(
      single,
      allCollections,
      salesList,
      rawPartyData,
      options
    );
    return await exportCustomerStatementExcel(single, stmt.entries, meta);
  }

  const ExcelJSModule: any = await import("exceljs");
  const WorkbookClass =
    ExcelJSModule?.Workbook ||
    ExcelJSModule?.default?.Workbook ||
    ExcelJSModule?.default?.default?.Workbook ||
    (typeof window !== "undefined" ? (window as any).ExcelJS?.Workbook : undefined);

  if (!WorkbookClass) {
    throw new Error("ExcelJS engine could not be initialized");
  }

  const workbook = new WorkbookClass();
  workbook.creator = meta.businessName || "Cash Boi";
  workbook.created = new Date();

  // --- SHEET 1: Customer Summary ---
  const ws1 = workbook.addWorksheet("Customer Summary", {
    views: [{ showGridLines: true }],
  });

  const summaryHeaders = [
    "SL",
    "Customer Name",
    "Phone",
    "Vouchers",
    "Bills Settled",
    "Cash Paid (BDT)",
    "Bank / MFS (BDT)",
    "Discount (BDT)",
    "Total Collected (BDT)",
    "Remaining Due (BDT)",
    "Last Collection",
  ];

  ws1.mergeCells("A1:K1");
  const s1Title = ws1.getCell("A1");
  s1Title.value = (meta.businessName || "Cash Boi Trade Ltd").toUpperCase();
  s1Title.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF0F172A" } };
  s1Title.alignment = { vertical: "middle", horizontal: "center" };

  ws1.mergeCells("A2:K2");
  const s1Subtitle = ws1.getCell("A2");
  s1Subtitle.value = "CUSTOMER-WISE COLLECTION SUMMARY REPORT";
  s1Subtitle.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
  s1Subtitle.alignment = { vertical: "middle", horizontal: "center" };

  const s1HeaderRow = ws1.getRow(4);
  s1HeaderRow.height = 24;
  summaryHeaders.forEach((h, i) => {
    const cell = s1HeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: i === 0 ? "center" : i >= 3 && i <= 4 ? "center" : i >= 5 && i <= 9 ? "right" : "left",
    };
  });

  let sumCash = 0,
    sumDigital = 0,
    sumDiscount = 0,
    sumCollected = 0,
    sumDue = 0,
    sumVouchers = 0,
    sumBills = 0;

  customers.forEach((c, idx) => {
    sumCash += c.cashPaid;
    sumDigital += c.digitalPaid;
    sumDiscount += c.totalDiscount;
    sumCollected += c.totalCollected;
    sumDue += c.currentDue;
    sumVouchers += c.voucherCount;
    sumBills += c.billsSettled;

    const row = ws1.getRow(5 + idx);
    row.height = 20;
    row.values = [
      idx + 1,
      c.customerName,
      c.customerPhone,
      c.voucherCount,
      c.billsSettled,
      c.cashPaid > 0 ? Number(c.cashPaid.toFixed(2)) : "-",
      c.digitalPaid > 0 ? Number(c.digitalPaid.toFixed(2)) : "-",
      c.totalDiscount > 0 ? Number(c.totalDiscount.toFixed(2)) : "-",
      Number(c.totalCollected.toFixed(2)),
      Number(c.currentDue.toFixed(2)),
      formatShortReportDate(c.lastCollectionDate),
    ];

    for (let col = 1; col <= 11; col++) {
      const cell = row.getCell(col);
      cell.alignment = {
        vertical: "middle",
        horizontal:
          col === 1 || col === 3 || col === 4 || col === 5 || col === 11
            ? "center"
            : col >= 6 && col <= 10
            ? "right"
            : "left",
      };
      if (col === 9) {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF047857" } };
      }
      if (col === 10) {
        cell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: c.currentDue > 0 ? "FFB91C1C" : "FF64748B" },
        };
      }
    }
  });

  const s1TotalRow = ws1.getRow(5 + customers.length);
  s1TotalRow.height = 22;
  s1TotalRow.values = [
    "Total",
    `Total Customers: ${customers.length}`,
    "-",
    sumVouchers,
    sumBills,
    Number(sumCash.toFixed(2)),
    Number(sumDigital.toFixed(2)),
    Number(sumDiscount.toFixed(2)),
    Number(sumCollected.toFixed(2)),
    Number(sumDue.toFixed(2)),
    "-",
  ];
  for (let col = 1; col <= 11; col++) {
    const cell = s1TotalRow.getCell(col);
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "double", color: { argb: "FF94A3B8" } },
    };
  }

  // --- SHEET 2: Detailed Customer Ledger ---
  const ws2 = workbook.addWorksheet("Detailed Customer Ledger", {
    views: [{ showGridLines: true }],
  });

  ws2.mergeCells("A1:K1");
  const s2Title = ws2.getCell("A1");
  s2Title.value = (meta.businessName || "Cash Boi Trade Ltd").toUpperCase();
  s2Title.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF0F172A" } };
  s2Title.alignment = { vertical: "middle", horizontal: "center" };

  ws2.mergeCells("A2:K2");
  const s2Subtitle = ws2.getCell("A2");
  s2Subtitle.value = "CUSTOMER-WISE DETAILED TRANSACTION LEDGER";
  s2Subtitle.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF334155" } };
  s2Subtitle.alignment = { vertical: "middle", horizontal: "center" };

  const detailHeaders = [
    "SL",
    "Customer Name",
    "Phone",
    "Date & Time",
    "Type",
    "Reference #",
    "Payment Mode",
    "Description / Settled Bills",
    "Sales / Billed (BDT)",
    "Collection (BDT)",
    "Balance (BDT)",
  ];

  const s2HeaderRow = ws2.getRow(4);
  s2HeaderRow.height = 24;
  detailHeaders.forEach((h, i) => {
    const cell = s2HeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = {
      vertical: "middle",
      horizontal:
        i === 0 || i === 3 || i === 4 || i === 5 || i === 6
          ? "center"
          : i >= 8
          ? "right"
          : "left",
    };
  });

  let runningSL = 1;
  let s2RowIdx = 5;
  let totalAllSales = 0;
  let totalAllCollected = 0;

  customers.forEach((c) => {
    const stmt = buildCustomerStatementEntries(
      c,
      allCollections,
      salesList,
      rawPartyData,
      options
    );

    stmt.entries.forEach((e) => {
      totalAllSales += e.salesAmount;
      totalAllCollected += e.collectionAmount;

      const row = ws2.getRow(s2RowIdx);
      row.height = 19;
      row.values = [
        runningSL++,
        c.customerName,
        c.customerPhone,
        e.fullDateTimeStr || e.formattedDate,
        e.typeLabel,
        e.refNo && e.refNo !== "-" ? `#${e.refNo}` : "-",
        e.paymentMode || "-",
        e.note ? `${e.description} • ${e.note}` : e.description,
        e.salesAmount > 0 ? e.salesAmount : "-",
        e.collectionAmount > 0 ? e.collectionAmount : "-",
        e.runningBalance,
      ];

      for (let col = 1; col <= 11; col++) {
        const cell = row.getCell(col);
        cell.alignment = {
          vertical: "middle",
          horizontal:
            col === 1 || col === 3 || col === 4 || col === 5 || col === 6 || col === 7
              ? "center"
              : col >= 9
              ? "right"
              : "left",
        };
        if (col === 10 && e.collectionAmount > 0) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF047857" } };
        }
        if (col === 11) {
          cell.font = {
            name: "Calibri",
            size: 10,
            bold: true,
            color: { argb: e.runningBalance > 0 ? "FFB91C1C" : "FF047857" },
          };
        }
      }

      s2RowIdx++;
    });
  });

  const s2TotalRow = ws2.getRow(s2RowIdx);
  s2TotalRow.height = 22;
  s2TotalRow.values = [
    "Total",
    `Total Transactions: ${runningSL - 1}`,
    "-",
    "-",
    "-",
    "-",
    "-",
    `Grand Total Sales: ${Number(totalAllSales.toFixed(2))}`,
    Number(totalAllSales.toFixed(2)),
    Number(totalAllCollected.toFixed(2)),
    Number(sumDue.toFixed(2)),
  ];
  for (let col = 1; col <= 11; col++) {
    const cell = s2TotalRow.getCell(col);
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "double", color: { argb: "FF94A3B8" } },
    };
  }

  // Auto widths
  [ws1, ws2].forEach((ws) => {
    ws.columns.forEach((col: any) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: false }, (cell: any) => {
        const val = cell.value ? String(cell.value) : "";
        if (val.length > maxLen && val.length < 50) maxLen = val.length;
      });
      col.width = Math.min(maxLen + 3, 38);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Customer_Wise_Detailed_Collection_Report_${moment().format("YYYY-MM-DD")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return runningSL - 1;
}

/**
 * Multi-Customer detailed PDF report containing detailed ledgers for all filtered customers.
 */
export async function downloadCustomerWiseDetailedPdf(
  customers: CustomerCollectionSummary[],
  allCollections: NormalizedCollectionRecord[],
  salesList: any[],
  rawPartyData: any[],
  meta: ReportCompanyMeta,
  options?: { startDate?: string; endDate?: string }
): Promise<void> {
  if (!customers || customers.length === 0) {
    throw new Error("No customer records to download PDF");
  }

  // If single customer, export their dedicated statement
  if (customers.length === 1) {
    const single = customers[0];
    const stmt = buildCustomerStatementEntries(
      single,
      allCollections,
      salesList,
      rawPartyData,
      options
    );
    return await downloadCustomerStatementPdf(single, stmt.entries, meta);
  }

  const headers = [
    "SL",
    "Customer Name",
    "Date & Time",
    "Type / Ref",
    "Description / Settled Bills",
    "Sales (BDT)",
    "Collection (BDT)",
    "Balance (BDT)",
  ];

  let sl = 1;
  let totalSales = 0;
  let totalCollected = 0;
  let totalDue = 0;

  const bodyRows: any[] = [];

  customers.forEach((c) => {
    totalDue += c.currentDue;
    const stmt = buildCustomerStatementEntries(
      c,
      allCollections,
      salesList,
      rawPartyData,
      options
    );

    stmt.entries.forEach((e) => {
      totalSales += e.salesAmount;
      totalCollected += e.collectionAmount;

      const typeAndRef =
        e.refNo && e.refNo !== "-"
          ? `${e.typeLabel} #${e.refNo}`
          : e.typeLabel;

      const desc = e.note ? `${e.description} • ${e.note}` : e.description;

      bodyRows.push([
        sl++,
        c.customerName,
        e.fullDateTimeStr || e.formattedDate,
        typeAndRef,
        desc,
        e.salesAmount > 0 ? formatMoney(e.salesAmount) : "-",
        e.collectionAmount > 0 ? formatMoney(e.collectionAmount) : "-",
        formatMoney(e.runningBalance),
      ]);
    });
  });

  bodyRows.push([
    "Total",
    `Total Customers: ${customers.length}`,
    "-",
    "-",
    `Grand Total Due: BDT ${formatMoney(totalDue)}`,
    formatMoney(totalSales),
    formatMoney(totalCollected),
    formatMoney(totalDue),
  ]);

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Wise_Detailed_Collection_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Customer-Wise Detailed Collection Report",
    metaRightLabel: `Total Customers: ${customers.length}`,
    headers,
    bodyRows,
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", cellWidth: 32 },
      2: { halign: "center", cellWidth: 26 },
      3: { halign: "left", cellWidth: 28 },
      4: { halign: "left" },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 24 },
      7: { halign: "right", cellWidth: 24 },
    },
    meta,
  });
}

