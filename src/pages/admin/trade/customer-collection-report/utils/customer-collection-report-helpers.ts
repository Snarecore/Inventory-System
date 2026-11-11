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
