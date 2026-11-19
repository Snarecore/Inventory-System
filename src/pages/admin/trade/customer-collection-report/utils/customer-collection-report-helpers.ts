import moment from "moment";
import { formatMoney } from "@/utils/formatters";
import {
  buildAndDownloadExcel,
  resolveThemeArgb,
  argbToRgbTuple,
} from "@/utils/excel-export";
import { importWithRetry } from "@/utils/lazyWithRetry";
import {
  buildDynamicExcelPayload,
  buildDynamicPdfPayload,
  type ExportColumnDef,
} from "@/utils/report-export-columns";
import {
  type ReportCompanyMeta,
  REPORT_RGB,
  calculateRevenueSharePct,
  formatReportDate,
  formatShortReportDate,
  generateAndDownloadCorporatePdf,
  isDateInReportRange,
  parseFlexibleReportDate,
} from "@/utils/trade-report-helpers";
import { getCleanOrderNo } from "@/pages/admin/trade/sales/hooks/useSalesQueries";
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
  rawRecord?: any;
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
  endDate?: string,
  salesList?: any[]
): NormalizedCollectionRecord[] {
  if (!Array.isArray(rawList)) return [];

  const result: NormalizedCollectionRecord[] = [];

  rawList.forEach((item: any, idx: number) => {
    const rawDate =
      item.addedDate || item.createdAt || item.collectionDate || item.date || "";
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

    // 1. If voucher details explicitly declare paidAmount = 0 on a due bill, it is uncollected
    const sumDetailPaid = details.reduce((sum, d) => sum + Number(d.paidAmount || 0), 0);
    const sumDetailDue = details.reduce((sum, d) => sum + Number(d.dueAmount || 0), 0);
    if (details.length > 0 && sumDetailPaid === 0 && sumDetailDue > 0) {
      return;
    }

    const bills = details
      .map((d) => String(d.invoiceNo || "").trim())
      .filter((inv) => inv && inv !== "-");

    if (bills.length === 0 && (item.invoiceNo || item.orderNo || item.billNo)) {
      const topInv = String(item.invoiceNo || item.orderNo || item.billNo || "").trim();
      if (topInv && topInv !== "-") bills.push(topInv);
    }

    // 2. Cross-check with sales records: if all referenced sales are completely unpaid credit sales
    // (paidAmount = 0, dueAmount >= grandTotal), this voucher was an auto-generated checkout placeholder and was never collected
    if (Array.isArray(salesList) && salesList.length > 0 && bills.length > 0) {
      const matchedReferencedSales = bills.map((inv) => {
        const cleanInv = inv.replace(/^#/, "").trim().toLowerCase();
        return salesList.find((s) => {
          const sInv = String(s.invoiceNo || s.orderNo || s.id || "").replace(/^#/, "").trim().toLowerCase();
          return sInv === cleanInv;
        });
      }).filter(Boolean);

      if (matchedReferencedSales.length > 0 && matchedReferencedSales.length === bills.length) {
        const allReferencedUnpaid = matchedReferencedSales.every((sale) => {
          const sDue = Number(sale.dueAmount ?? sale.due_amount ?? 0);
          const sPaid = Number(sale.paidAmount ?? sale.paid_amount ?? 0);
          const sGrandTotal = Number(sale.grandTotal ?? sale.grand_total ?? sale.totalAmount ?? sale.total_amount ?? 0);
          const sStatus = String(sale.paymentStatus || sale.payment_status || sale.status || "").toUpperCase();
          return sPaid === 0 && sDue > 0 && (sDue >= sGrandTotal || sStatus === "DUE");
        });

        const totalReferencedGrand = matchedReferencedSales.reduce(
          (sum, s) => sum + Number(s.grandTotal ?? s.grand_total ?? s.totalAmount ?? s.total_amount ?? 0),
          0
        );

        if (allReferencedUnpaid && totalAmount >= totalReferencedGrand - 0.01) {
          return; // Skip phantom checkout voucher for unpaid credit sale
        }
      }
    }

    if (totalAmount <= 0 && totalDiscount <= 0) {
      return; // Skip zero-value records
    }

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
      rawRecord: item,
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
  const lastSaleDateById = new Map<string, string>();
  const lastSaleDateByPhone = new Map<string, string>();

  if (Array.isArray(salesList)) {
    salesList.forEach((s: any, idx: number) => {
      if (s.isReturnRecord) return;
      const cId = String(s.customerId ?? s.customer_id ?? "").trim();
      const cPhone = String(
        s.customerPhone ?? s.customer_phone ?? s.phone ?? ""
      ).trim();
      const rawDate = String(
        s.salesDate || s.saleDate || s.date || s.createdAt || s.createdDate || ""
      ).trim();

      if (rawDate) {
        if (cId && (!lastSaleDateById.has(cId) || rawDate > (lastSaleDateById.get(cId) || ""))) {
          lastSaleDateById.set(cId, rawDate);
        }
        if (cPhone && (!lastSaleDateByPhone.has(cPhone) || rawDate > (lastSaleDateByPhone.get(cPhone) || ""))) {
          lastSaleDateByPhone.set(cPhone, rawDate);
        }
      }

      const due = Number(s.dueAmount ?? s.due_amount ?? 0);
      if (due <= 0) return;
      const invNo = String(s.invoiceNo || s.orderNo || s.id || `sale-${idx}`);

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

      const lastSaleDate =
        String(c.lastSaleDate || "") ||
        lastSaleDateById.get(idStr) ||
        (phoneStr ? lastSaleDateByPhone.get(phoneStr) : "") ||
        "";

      return {
        customerKey: getCustomerLookupKey(idStr, phoneStr, c.customerName),
        customerId: idStr,
        customerName: String(c.customerName || "General Customer"),
        customerPhone: phoneStr || "-",
        customerAddress: resolvedAddr,
        invoiceCount,
        lastSaleDate,
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
  returnAmount?: number;
  returnItemsSummary?: string;
  returnDetails?: Array<{
    productName: string;
    quantity: number;
    unitPrice?: number;
    total?: number;
    unit?: string;
  }>;
  discountAmount?: number;
  runningBalance: number;
  hasVoucherCollection?: boolean;
  voucherNos?: string[];
  receiptData?: CollectionReceiptData;
  rawRecord?: any;
}

export interface CustomerStatementResult {
  entries: CustomerStatementEntry[];
  stats: {
    openingBalance: number;
    totalSales: number;
    grossSales?: number;
    totalReturns?: number;
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
      (record.isReturnRecord ? "" : record.id) ??
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

export function parseDateAndTime(
  dateStr?: string | null,
  rawRecord?: any
): {
  momentObj: moment.Moment;
  formattedDate: string;
  formattedTime: string;
  hasTime: boolean;
  fullDateTimeStr: string;
} {
  const candidates: string[] = [];
  const isRetRecord = Boolean(
    rawRecord?.isReturnRecord ||
    rawRecord?.returnNo ||
    rawRecord?.salesReturnNo ||
    rawRecord?.type === "SALES_RETURN" ||
    rawRecord?.returnDate ||
    rawRecord?.return_date
  );

  if (rawRecord && typeof rawRecord === "object") {
    const timeFields = isRetRecord
      ? [
          rawRecord.returnDate,
          rawRecord.return_date,
          rawRecord.returnDateTime,
          rawRecord.transactionDate,
          rawRecord.createdAt,
          rawRecord.createdDate,
          rawRecord.addedDate,
          rawRecord.timestamp,
          rawRecord.dateTime,
          rawRecord.date,
        ]
      : [
          rawRecord.createdAt,
          rawRecord.createdDate,
          rawRecord.addedDate,
          rawRecord.timestamp,
          rawRecord.dateTime,
          rawRecord.collectionDate,
          rawRecord.salesDate,
          rawRecord.saleDate,
          rawRecord.returnDate,
          rawRecord.date,
        ];
    for (const tf of timeFields) {
      if (tf && typeof tf === "string") {
        candidates.push(tf.trim());
      }
    }
  }

  if (dateStr && typeof dateStr === "string") {
    candidates.unshift(dateStr.trim());
  }

  // Find candidate that includes time (has colon ':' or 'T')
  let selected =
    candidates.find((c) => c.includes(":") || c.includes("T")) ||
    candidates[0] ||
    "";

  // If still no candidate with time, but rawRecord has separate time field
  if (
    rawRecord &&
    (!selected || (!selected.includes(":") && !selected.includes("T")))
  ) {
    const timeOnly =
      rawRecord.time || rawRecord.returnTime || rawRecord.saleTime || rawRecord.collectionTime;
    if (timeOnly && typeof timeOnly === "string" && selected) {
      selected = `${selected} ${timeOnly.trim()}`;
    }
  }

  // If still no time, check if invoiceNo / returnNo / orderNo has an embedded timestamp
  // E.g. #28488-20261118144504860 -> 2026-11-18 14:45:04
  // E.g. #2611181446152012 -> 2026-11-18 14:46:15
  // E.g. #2611191051201079 -> 2026-11-19 10:51:20
  if (!selected.includes(":") && !selected.includes("T")) {
    const refString = isRetRecord
      ? String(
          rawRecord?.returnNo ||
            rawRecord?.salesReturnNo ||
            rawRecord?.refNo ||
            dateStr ||
            rawRecord?.invoiceNo ||
            rawRecord?.orderNo ||
            ""
        )
      : String(
          rawRecord?.invoiceNo ||
            rawRecord?.orderNo ||
            rawRecord?.returnNo ||
            rawRecord?.salesReturnNo ||
            rawRecord?.refNo ||
            rawRecord?.voucherNo ||
            dateStr ||
            ""
        );
    const m14 = refString.match(/(20\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (m14) {
      const [, y, mo, d, h, mi, s] = m14;
      selected = `${y}-${mo}-${d} ${h}:${mi}:${s}`;
    } else {
      const m12 = refString.match(/(2\d)(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (m12) {
        const [, y, mo, d, h, mi, s] = m12;
        selected = `20${y}-${mo}-${d} ${h}:${mi}:${s}`;
      }
    }
  }

  const raw = selected.trim();
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
    "YYYY-MM-DD HH:mm",
    "YYYY-MM-DD hh:mm A",
    "YYYY-MM-DD",
    "DD-MM-YYYY HH:mm:ss",
    "DD-MM-YYYY hh:mm:ss A",
    "DD-MM-YYYY HH:mm",
    "DD-MM-YYYY hh:mm A",
    "DD-MM-YYYY",
    "DD/MM/YYYY HH:mm:ss",
    "DD/MM/YYYY HH:mm",
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
        ? `${m.format("DD MMM, YYYY")} ${m.format("hh:mm A")}`
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
    matchedParty?.openingBalance ??
      matchedParty?.opening_balance ??
      (customer as any)?.openingBalance ??
      (customer as any)?.opening_balance ??
      0
  );

  const rawSales = Array.isArray(salesList) ? salesList : [];
  const matchedSales = rawSales.filter((s) => isSameCustomer(s, customer));

  const matchedCollections = allCollections
    .filter((c) => isSameCustomer(c, customer))
    .filter((c) => {
      const colTotal = (c.totalAmount || 0) + (c.totalDiscount || 0);
      if (colTotal <= 0) return false;

      // Check if voucher references invoice(s)
      const bills = (c.billsSummary && c.billsSummary !== "-")
        ? c.billsSummary.split(",").map((s) => s.replace(/^#/, "").trim().toLowerCase()).filter(Boolean)
        : [];

      if (bills.length > 0 && matchedSales.length > 0) {
        const matchedSalesForVoucher = bills.map((inv) => {
          return matchedSales.find((s) => {
            const sInv = String(s.invoiceNo || s.orderNo || s.id || "").replace(/^#/, "").trim().toLowerCase();
            return sInv === inv;
          });
        }).filter(Boolean);

        if (matchedSalesForVoucher.length > 0 && matchedSalesForVoucher.length === bills.length) {
          const allUnpaid = matchedSalesForVoucher.every((s) => {
            const sDue = Number(s.dueAmount ?? s.due_amount ?? 0);
            const sPaid = Number(s.paidAmount ?? s.paid_amount ?? 0);
            const sGrandTotal = Number(s.grandTotal ?? s.grand_total ?? s.totalAmount ?? s.total_amount ?? 0);
            const sStatus = String(s.paymentStatus || s.payment_status || s.status || "").toUpperCase();
            return sPaid === 0 && sDue > 0 && (sDue >= sGrandTotal || sStatus === "DUE");
          });

          const totalGrand = matchedSalesForVoucher.reduce(
            (sum, s) => sum + Number(s.grandTotal ?? s.grand_total ?? s.totalAmount ?? s.total_amount ?? 0),
            0
          );

          if (allUnpaid && c.totalAmount >= totalGrand - 0.01) {
            // Phantom checkout voucher for completely unpaid credit sale; skip it!
            return false;
          }
        }
      }

      return true;
    });

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
    returnAmount?: number;
    returnItemsSummary?: string;
    returnDetails?: Array<{
      productName: string;
      quantity: number;
      unitPrice?: number;
      total?: number;
      unit?: string;
    }>;
    discountAmount?: number;
    hasVoucherCollection?: boolean;
    voucherNos?: string[];
    receiptData?: CollectionReceiptData;
    rawRecord?: any;
  };

  const rawEntries: UnsortedEntry[] = [];

  // Helper to clean reference strings (strip '#', whitespace, lowercase)
  const cleanRefKey = (k: any): string => {
    if (!k) return "";
    return String(k).replace(/^[#\s]+/, "").trim().toLowerCase();
  };

  // Track invoice settlements from Collection Vouchers to merge into single line and avoid 2-line breakdown
  const invoiceVoucherMap = new Map<string, {
    paidAmount: number;
    discountAmount: number;
    voucherNos: string[];
    paymentModes: string[];
    voucherIds: Set<string | number>;
    receiptData?: CollectionReceiptData;
  }>();

  const voucherConsumedAmount = new Map<string | number, number>();

  matchedCollections.forEach((c) => {
    const colTotal = c.totalAmount + c.totalDiscount;
    if (colTotal <= 0) {
      return; // Skip 0-amount vouchers like #5974
    }

    const mode = c.paymentMode || "Cash";
    const vNo = c.voucherNo;

    let hasAllocations = false;
    if (Array.isArray(c.receiptData?.allocations) && c.receiptData.allocations.length > 0) {
      c.receiptData.allocations.forEach((a) => {
        const rawInv = String(a.invoiceNo || "").trim().toLowerCase();
        const cleanInv = cleanRefKey(a.invoiceNo);
        if (cleanInv && cleanInv !== "-") {
          hasAllocations = true;
          const prev = invoiceVoucherMap.get(cleanInv) || invoiceVoucherMap.get(rawInv) || {
            paidAmount: 0,
            discountAmount: 0,
            voucherNos: [],
            paymentModes: [],
            voucherIds: new Set<string | number>(),
            receiptData: c.receiptData,
          };
          prev.paidAmount += Number(a.paidAmount || 0);
          prev.discountAmount += Number(a.discountAmount || 0);
          if (vNo && !prev.voucherNos.includes(vNo)) prev.voucherNos.push(vNo);
          if (mode && !prev.paymentModes.includes(mode)) prev.paymentModes.push(mode);
          prev.voucherIds.add(c.id);
          invoiceVoucherMap.set(cleanInv, prev);
          if (rawInv !== cleanInv) invoiceVoucherMap.set(rawInv, prev);
        }
      });
    }

    if (!hasAllocations && c.billsSummary && c.billsSummary !== "-") {
      const invs = c.billsSummary
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && s !== "-");
      if (invs.length > 0) {
        const perInv = colTotal / invs.length;
        invs.forEach((rawInv) => {
          const cleanInv = cleanRefKey(rawInv);
          const prev = invoiceVoucherMap.get(cleanInv) || invoiceVoucherMap.get(rawInv) || {
            paidAmount: 0,
            discountAmount: 0,
            voucherNos: [],
            paymentModes: [],
            voucherIds: new Set<string | number>(),
            receiptData: c.receiptData,
          };
          prev.paidAmount += perInv;
          if (vNo && !prev.voucherNos.includes(vNo)) prev.voucherNos.push(vNo);
          if (mode && !prev.paymentModes.includes(mode)) prev.paymentModes.push(mode);
          prev.voucherIds.add(c.id);
          invoiceVoucherMap.set(cleanInv, prev);
          if (rawInv !== cleanInv) invoiceVoucherMap.set(rawInv, prev);
        });
      }
    }
  });

  // Add Sales
  // Pre-calculate total return amounts associated with parent sales
  // so that sales are always displayed at their authentic gross amount
  // (e.g. 3944 instead of 1444 when net is 1444 + 2500 return).
  const saleReturnAmountMap = new Map<string, number>();
  matchedSales.forEach((item) => {
    const isRet =
      Boolean(item.isReturnRecord) ||
      Boolean(item.returnNo && (item.returnGrandTotal || item.refundAmount || item.returnDate)) ||
      String(item.paymentType || "").toUpperCase().includes("RETURN") ||
      String(item.status || "").toUpperCase() === "RETURN" ||
      String(item.status || "").toUpperCase() === "FULL_RETURN";

    if (isRet) {
      const rawLines = [
        item.returnDetails,
        item.salesReturnDetails,
        item.return_details,
        item.sales_return_details,
        item.returnedItems,
        item.returned_items,
        item.details,
      ].find((l) => Array.isArray(l) && l.length > 0) || [];

      const linesTotal = rawLines.reduce((sum: number, l: any) => {
        const qty = Number(l.returnQuantity ?? l.quantity ?? 1);
        const price = Number(l.sellPrice ?? l.sell_price ?? l.buyPrice ?? l.buy_price ?? l.unitPrice ?? l.unit_price ?? l.price ?? l.rate ?? 0);
        const total = Number(l.total ?? (qty * price));
        return sum + total;
      }, 0);

      const retAmt =
        Math.abs(
          Number(
            item.refundAmount ??
            item.returnRefundAmount ??
            item.returnGrandTotal ??
            item.grandTotal ??
            item.totalAmount ??
            item.returnTotalAmount ??
            item.dueAmount ??
            0
          )
        ) || linesTotal;

      if (retAmt > 0) {
        const inv = cleanRefKey(item.salesInvoiceNo || item.invoiceNo || item.sales_invoice_no);
        const ord = cleanRefKey(item.orderNo || item.order_no);
        const sId = cleanRefKey(item.saleId || item.sale_id);
        const ref = cleanRefKey(item.refNo || item.referenceNo);

        const noteText = String(item.notes || item.note || item.remarks || item.reason || "");
        const match = noteText.match(/([0-9]{4,8}-[0-9]{10,25})/);
        const extractedInv = match ? cleanRefKey(match[1]) : "";
        const ordMatch = noteText.match(/(?:order|ord)\s*(?:no|number)?\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
        const extractedOrd = ordMatch && ordMatch[1] ? cleanRefKey(ordMatch[1]) : "";

        const cleanOrd = ord ? getCleanOrderNo(ord) : "";

        [inv, ord, sId, ref, extractedInv, extractedOrd, cleanOrd ? cleanRefKey(cleanOrd) : ""].filter(Boolean).forEach((key) => {
          if (key && key !== "-") {
            saleReturnAmountMap.set(key, (saleReturnAmountMap.get(key) || 0) + retAmt);
          }
        });
      }
    }
  });

  matchedSales.forEach((s, idx) => {
    const paymentType = String(
      s.paymentType || s.payment_type || ""
    ).toUpperCase();

    const isExplicitReturn =
      Boolean(s.isReturnRecord) ||
      Boolean(s.returnNo && (s.returnGrandTotal || s.refundAmount || s.returnDate)) ||
      paymentType.includes("RETURN") ||
      String(s.status || "").toUpperCase() === "RETURN" ||
      String(s.status || "").toUpperCase() === "FULL_RETURN";

    // For returns, authentic return date takes priority; for sales, sale/creation date takes priority
    const rawDate = isExplicitReturn
      ? (s.returnDate || s.return_date || s.transactionDate || s.createdAt || s.createdDate || s.salesDate || s.saleDate || s.date || "")
      : (s.createdAt || s.createdDate || s.salesDate || s.saleDate || s.date || "");

    if (!isDateInReportRange(rawDate, options?.startDate, options?.endDate)) {
      return;
    }

    const { momentObj, formattedDate, formattedTime, hasTime, fullDateTimeStr } =
      parseDateAndTime(rawDate, s);
    const paidAmount = Number(s.paidAmount ?? s.paid_amount ?? 0);
    const dueAmount = Number(s.dueAmount ?? s.due_amount ?? 0);
    const invNo = String(
      s.invoiceNo || s.orderNo || s.id || `INV-${idx + 1}`
    );
    const invKey = cleanRefKey(invNo);
    const ordKey = cleanRefKey(s.orderNo);
    const idKey = cleanRefKey(s.id || s.saleId);
    const cleanOrdKey = s.orderNo ? cleanRefKey(getCleanOrderNo(s.orderNo, s.invoiceNo, s.id)) : "";

    if (isExplicitReturn) {
      const rawReturnLines = [
        s.returnDetails,
        s.salesReturnDetails,
        s.return_details,
        s.sales_return_details,
        s.returnedItems,
        s.returned_items,
        s.details,
        s.items,
        s.products,
        s.salesDetails,
        s.saleDetails,
        s.saleDetailsList,
      ].find((list) => Array.isArray(list) && list.length > 0) || [];

      const parsedLines = rawReturnLines.map((line: any) => {
        const pName = String(
          line.productName ||
          line.product_name ||
          line.name ||
          line.item_name ||
          line.productTitle ||
          line.title ||
          "Product"
        ).trim();
        const qty = Number(
          line.returnQuantity ??
          line.return_quantity ??
          line.returnQty ??
          line.return_qty ??
          line.quantity ??
          line.qty ??
          line.itemQuantity ??
          line.count ??
          1
        );
        const unitPrice = Number(
          line.sellPrice ??
          line.sell_price ??
          line.buyPrice ??
          line.buy_price ??
          line.unitPrice ??
          line.unit_price ??
          line.price ??
          line.rate ??
          0
        );
        const rawTotal =
          line.total ??
          line.totalAmount ??
          line.returnTotal ??
          line.subTotal ??
          qty * unitPrice;
        const total = Number(rawTotal) || 0;
        const unit = String(line.unit || line.unitName || "").trim();
        return {
          productName: pName,
          quantity: qty,
          unitPrice,
          total,
          unit,
        };
      });

      const returnItemsSummary = parsedLines.length > 0
        ? parsedLines
            .map((p) => `${p.productName} (${p.quantity > 0 ? `x${p.quantity}` : ""}${p.unit ? ` ${p.unit}` : ""})`.replace(/\s+/g, " "))
            .join(", ")
        : "";

      const parsedLinesTotal = parsedLines.reduce(
        (sum, p) => sum + (p.total || p.quantity * p.unitPrice),
        0
      );

      const returnAmt =
        Math.abs(
          Number(
            s.refundAmount ??
            s.returnRefundAmount ??
            s.returnGrandTotal ??
            s.grandTotal ??
            s.totalAmount ??
            s.returnTotalAmount ??
            s.dueAmount ??
            s.amount ??
            0
          )
        ) || parsedLinesTotal;

      const cleanNote = (s.notes && s.notes !== "-" ? s.notes : "") || (s.remark && s.remark !== "-" ? s.remark : "") || (s.reason && s.reason !== "-" ? s.reason : "");

      // Returns are credited to the customer, decreasing balance via the Collection column
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
        refNo: String(s.returnNo || s.salesReturnNo || invNo),
        description: returnItemsSummary ? `Return: ${returnItemsSummary}` : "Sales Return",
        note: cleanNote,
        paymentMode: "Return",
        salesAmount: -returnAmt,
        collectionAmount: 0,
        returnAmount: returnAmt,
        returnItemsSummary,
        returnDetails: parsedLines,
        rawRecord: s,
      });
      return;
    }

    // Associated return amount from separate return records:
    const returnFromMap = Math.max(
      saleReturnAmountMap.get(invKey) || 0,
      ordKey ? saleReturnAmountMap.get(ordKey) || 0 : 0,
      idKey ? saleReturnAmountMap.get(idKey) || 0 : 0,
      cleanOrdKey ? saleReturnAmountMap.get(cleanOrdKey) || 0 : 0
    );

    // Embedded return amount on sale itself:
    const embeddedReturnAmt = Math.abs(Number(s.returnGrandTotal ?? s.refundAmount ?? s.returnRefundAmount ?? 0));
    const associatedReturnAmt = Math.max(returnFromMap, embeddedReturnAmt);

    // Calculate line items sum if available:
    const rawSaleLines = [
      s.salesDetails,
      s.saleDetails,
      s.details,
      s.items,
      s.products,
    ].find((list) => Array.isArray(list) && list.length > 0) || [];

    const lineItemsGross = rawSaleLines.length > 0
      ? rawSaleLines.reduce((sum: number, line: any) => {
          const qty = Number(line.quantity ?? line.qty ?? 1);
          const price = Number(line.sellPrice ?? line.sell_price ?? line.unitPrice ?? line.price ?? 0);
          const lineTotal = Number(line.total ?? line.totalAmount ?? line.subTotal ?? (qty * price));
          return sum + (lineTotal || 0);
        }, 0)
      : 0;

    const baseGrandTotal = Number(
      s.grandTotal ?? s.grand_total ?? s.totalAmount ?? s.total_amount ?? 0
    );

    // Original gross sale: if a return exists, gross sale is baseGrandTotal + associatedReturnAmt,
    // or lineItemsGross, or s.totalAmount (e.g. 1320 when net is 1300 + 20 return).
    const effectiveSaleAmount = associatedReturnAmt > 0
      ? Math.max(baseGrandTotal + associatedReturnAmt, lineItemsGross, Number(s.totalAmount || 0))
      : Math.max(baseGrandTotal, lineItemsGross);

    const rawStatus = String(
      s.paymentStatus || s.payment_status || s.status || ""
    ).toUpperCase();

    // A sale is genuinely a CREDIT sale if it has dueAmount > 0, or paidAmount < effectiveSaleAmount, or status is DUE / PARTIAL.
    const isCreditAtCreation =
      dueAmount > 0 ||
      paidAmount < baseGrandTotal ||
      rawStatus === "DUE" ||
      rawStatus === "PARTIAL";

    const cleanNote =
      (s.notes && s.notes !== "-" ? s.notes : "") ||
      (s.remark && s.remark !== "-" ? s.remark : "");

    const voucherSettlement =
      invoiceVoucherMap.get(invKey) ||
      (invNo ? invoiceVoucherMap.get(invNo.toLowerCase()) : undefined) ||
      (ordKey ? invoiceVoucherMap.get(ordKey) : undefined) ||
      (cleanOrdKey ? invoiceVoucherMap.get(cleanOrdKey) : undefined);

    if (isCreditAtCreation) {
      // Genuinely a CREDIT SALE!
      // If collection vouchers were created for this invoice (e.g. Voucher #6153),
      // those vouchers are displayed as their own separate COLLECTION rows in the ledger.
      // Do NOT double count that collection on the credit sale row!
      const voucherPaid = voucherSettlement ? voucherSettlement.paidAmount : 0;
      const unvoucheredPaid = Math.max(0, paidAmount - voucherPaid);

      const isPartial = unvoucheredPaid > 0 && unvoucheredPaid < effectiveSaleAmount;
      const paidNote = isPartial ? `Paid: ৳${formatMoney(unvoucheredPaid)}` : "";
      const fullNote = cleanNote
        ? paidNote
          ? `${cleanNote} (${paidNote})`
          : cleanNote
        : paidNote;

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
        note: fullNote,
        paymentMode: isPartial ? "Partial" : "Credit",
        salesAmount: effectiveSaleAmount,
        collectionAmount: unvoucheredPaid > 0 ? unvoucheredPaid : 0,
        rawRecord: s,
      });
    } else {
      // Genuinely fully paid Cash Sale (paidAmount >= grandTotal && dueAmount <= 0)
      if (voucherSettlement) {
        voucherSettlement.voucherIds.forEach((vId) => {
          voucherConsumedAmount.set(
            vId,
            (voucherConsumedAmount.get(vId) || 0) + effectiveSaleAmount
          );
        });
      }

      const vInfo = voucherSettlement?.voucherNos.length
        ? `Voucher: #${voucherSettlement.voucherNos.join(", #")}`
        : "";

      rawEntries.push({
        sortMoment: momentObj,
        priority: 2,
        rawDate,
        formattedDate,
        formattedTime,
        hasTime,
        fullDateTimeStr,
        type: "CASH_SALE",
        typeLabel: "Sale",
        refNo: invNo,
        description: "Sale (Paid)",
        note: vInfo ? (cleanNote ? `${cleanNote} (${vInfo})` : vInfo) : cleanNote,
        paymentMode: "Cash",
        salesAmount: effectiveSaleAmount,
        collectionAmount: effectiveSaleAmount,
        hasVoucherCollection: Boolean(
          voucherSettlement && voucherSettlement.voucherNos.length > 0
        ),
        voucherNos: voucherSettlement?.voucherNos || [],
        receiptData: voucherSettlement?.receiptData,
        rawRecord: s,
      });
    }

    // Check if parent sale also has an embedded return attached that was not passed as a separate return record:
    const hasEmbeddedReturnLines = Array.isArray(s.salesReturnDetails) && s.salesReturnDetails.length > 0;
    if (!isExplicitReturn && (s.hasReturn || embeddedReturnAmt > 0 || hasEmbeddedReturnLines)) {
      const retNo = String(s.returnNo || s.salesReturnNo || `RET-${invNo}`);
      const alreadyHas = rawEntries.some((e) => e.type === "SALES_RETURN" && (e.refNo === retNo || e.refNo === invNo));
      if (!alreadyHas && (embeddedReturnAmt > 0 || hasEmbeddedReturnLines)) {
        const rawReturnLines = [
          s.returnDetails,
          s.salesReturnDetails,
          s.returnedItems,
          s.returned_items,
        ].find((list) => Array.isArray(list) && list.length > 0) || [];

        const parsedLines = rawReturnLines.map((line: any) => ({
          productName: String(line.productName || line.product_name || line.name || line.item_name || "Product").trim(),
          quantity: Number(line.returnQuantity ?? line.return_quantity ?? line.returnQty ?? line.quantity ?? 1),
          unitPrice: Number(line.sellPrice ?? line.sell_price ?? line.buyPrice ?? line.buy_price ?? line.unitPrice ?? line.price ?? 0),
          total: Number(line.total ?? 0),
          unit: String(line.unit || "").trim(),
        }));

        const itemsSummary = parsedLines.length > 0
          ? parsedLines.map((p) => `${p.productName} (${p.quantity > 0 ? `x${p.quantity}` : ""}${p.unit ? ` ${p.unit}` : ""})`.replace(/\s+/g, " ")).join(", ")
          : "";

        const finalReturnAmt = embeddedReturnAmt > 0
          ? embeddedReturnAmt
          : parsedLines.reduce((sum, p) => sum + (p.total || p.quantity * p.unitPrice), 0);

        if (finalReturnAmt > 0) {
          const retDate = s.returnDate || rawDate;
          const retParsed = parseDateAndTime(retDate, s);

          // Embedded returns are also credited via Collection column
          rawEntries.push({
            sortMoment: retParsed.momentObj,
            priority: 4,
            rawDate: retDate,
            formattedDate: retParsed.formattedDate,
            formattedTime: retParsed.formattedTime,
            hasTime: retParsed.hasTime,
            fullDateTimeStr: retParsed.fullDateTimeStr,
            type: "SALES_RETURN",
            typeLabel: "Return",
            refNo: retNo,
            description: itemsSummary ? `Return: ${itemsSummary}` : "Sales Return",
            note: cleanNote,
            paymentMode: "Return",
            salesAmount: -finalReturnAmt,
            collectionAmount: 0,
            returnAmount: finalReturnAmt,
            returnItemsSummary: itemsSummary,
            returnDetails: parsedLines,
            rawRecord: s,
          });
        }
      }
    }
  });

  // Add Collections (Standalone collections or unmerged residual amounts from vouchers)
  matchedCollections.forEach((c) => {
    const colTotal = c.totalAmount + c.totalDiscount;
    if (colTotal <= 0) {
      return; // Skip 0-amount vouchers (like #5974)
    }

    const consumed = voucherConsumedAmount.get(c.id) || 0;
    const remainingUnmerged = Math.max(0, colTotal - consumed);

    // If fully merged into sale lines above, do not duplicate
    if (remainingUnmerged < 0.01) {
      return;
    }

    const rawDate = c.collectionDate || (c as any).addedDate || (c as any).createdAt || "";
    if (!isDateInReportRange(rawDate, options?.startDate, options?.endDate)) {
      return;
    }

    const { momentObj, formattedDate, formattedTime, hasTime, fullDateTimeStr } =
      parseDateAndTime(rawDate, c.rawRecord || c);
    const bills =
      c.billsSummary && c.billsSummary !== "-" ? c.billsSummary : "";
    const remark = c.remark && c.remark !== "-" ? c.remark : "";

    let cleanNote = "";
    if (bills) cleanNote = `Settled: #${bills}`;
    if (remark && !remark.toLowerCase().includes("sales collection for invoice")) {
      cleanNote = cleanNote ? `${cleanNote} (${remark})` : remark;
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
      description: consumed > 0 ? "Customer Collection (Advance / Residual)" : "Customer Collection",
      note: cleanNote,
      paymentMode: tenderMode,
      salesAmount: 0,
      collectionAmount: remainingUnmerged,
      discountAmount: consumed > 0 ? 0 : c.totalDiscount,
      hasVoucherCollection: true,
      voucherNos: [c.voucherNo],
      receiptData: c.receiptData,
      rawRecord: c,
    });
  });

  // Strictly follow organizational accounting standards:
  // Opening balance comes ONLY from the authentic master record in the database,
  // plus any net transactions prior to startDate if a date range filter is applied.
  // We NEVER synthesize or infer opening balance from returns!
  let openingBalance = Math.max(0, explicitOpeningBalance);

  if (options?.startDate) {
    const startMoment = moment(options.startDate).startOf("day");
    const priorSales = matchedSales.reduce((sum, s) => {
      const rawDate =
        s.salesDate ||
        s.saleDate ||
        s.date ||
        s.createdAt ||
        s.createdDate ||
        "";
      const { momentObj } = parseDateAndTime(rawDate);
      if (momentObj.isValid() && momentObj.isBefore(startMoment)) {
        const isReturn = Boolean(
          s.isReturnRecord ||
            s.returnItemsSummary ||
            s.returnNo ||
            s.salesReturnNo
        );
        const amt = Number(s.grandTotal ?? s.totalAmount ?? s.total ?? 0);
        return isReturn ? sum - amt : sum + amt;
      }
      return sum;
    }, 0);

    const priorCollections = matchedCollections.reduce((sum, c) => {
      const rawDate = c.collectionDate || "";
      const { momentObj } = parseDateAndTime(rawDate);
      if (momentObj.isValid() && momentObj.isBefore(startMoment)) {
        return sum + (c.totalAmount + c.totalDiscount);
      }
      return sum;
    }, 0);

    openingBalance = Math.max(
      0,
      explicitOpeningBalance + priorSales - priorCollections
    );
  }

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

  // Sort chronological ascending: always keep Opening Balance row at the top (SL 1)
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
      returnAmount: item.returnAmount,
      returnItemsSummary: item.returnItemsSummary,
      returnDetails: item.returnDetails,
      discountAmount: item.discountAmount,
      hasVoucherCollection: item.hasVoucherCollection,
      voucherNos: item.voucherNos,
      runningBalance: running,
      receiptData: item.receiptData,
      rawRecord: item.rawRecord,
    };
  });

  const periodSales = rawEntries.reduce((sum, e) => sum + e.salesAmount, 0);
  const periodCollected = rawEntries.reduce(
    (sum, e) => sum + e.collectionAmount,
    0
  );

  const grossSales = rawEntries
    .filter((e) => e.type !== "SALES_RETURN" && e.type !== "OPENING")
    .reduce((sum, e) => sum + e.salesAmount, 0);

  const totalReturns = rawEntries
    .filter((e) => e.type === "SALES_RETURN")
    .reduce((sum, e) => sum + (e.returnAmount || Math.abs(e.salesAmount)), 0);

  return {
    entries,
    stats: {
      openingBalance,
      totalSales: periodSales,
      grossSales,
      totalReturns,
      totalCollected: periodCollected,
      totalDiscount: customer.totalDiscount || 0,
      finalBalance: running,
      entryCount: entries.length,
    },
  };
}

export function buildStatementDescription(e: CustomerStatementEntry): string {
  const cleanRef = String(e.refNo || "").replace(/^#+/, "").trim();
  const hasRef = cleanRef && cleanRef !== "-";
  const refText = hasRef ? `#${cleanRef}` : "";

  if (e.type === "OPENING") {
    return "Opening Balance";
  }

  if (e.type === "SALES_RETURN") {
    const parts: string[] = [];
    if (refText) parts.push(refText);
    if (e.returnItemsSummary) parts.push(`Ret: ${e.returnItemsSummary}`);
    if (
      e.note &&
      !e.note.toLowerCase().includes(e.returnItemsSummary?.toLowerCase() || "___never___") &&
      e.note !== `Return: ${e.returnItemsSummary}`
    ) {
      parts.push(e.note);
    }
    return parts.join(" | ") || "Sales Return";
  }

  if (e.type === "COLLECTION") {
    const parts: string[] = [];
    const vNo =
      e.voucherNos && e.voucherNos.length > 0
        ? `Voucher: #${e.voucherNos.join(", #")}`
        : refText
        ? `Voucher: ${refText}`
        : "";
    if (vNo) parts.push(vNo);
    if (e.note) parts.push(e.note);
    return parts.join(" | ") || "Customer Collection";
  }

  // CASH_SALE or CREDIT_SALE
  const parts: string[] = [];
  if (refText) parts.push(refText);
  if (e.voucherNos && e.voucherNos.length > 0) {
    parts.push(`Voucher: #${e.voucherNos.join(", #")}`);
  }
  if (
    e.note &&
    e.note !== "Credit Sale" &&
    !e.note.toLowerCase().includes("voucher: #")
  ) {
    parts.push(e.note);
  }
  return parts.join(" | ") || (e.type === "CREDIT_SALE" ? "Credit Sale" : "Sale (Paid)");
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
    "Collection Method": e.paymentMode || "-",
    "Description / Settled Bills": buildStatementDescription(e),
    "Sales / Billed (BDT)": e.salesAmount !== 0 ? e.salesAmount : "-",
    "Collection (BDT)": e.collectionAmount > 0 ? e.collectionAmount : "-",
    "Balance (BDT)": Math.abs(e.runningBalance),
  }));

  const totalRow = {
    "SL": "Total",
    "Date & Time": "-",
    "Type": "-",
    "Reference #": "-",
    "Collection Method": "-",
    "Description / Settled Bills": `Customer: ${customer.customerName} (${customer.customerPhone}) - Closing Balance: BDT ${formatMoney(Math.abs(finalBalance))}`,
    "Sales / Billed (BDT)": totals.sales,
    "Collection (BDT)": totals.collected,
    "Balance (BDT)": Math.abs(finalBalance),
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
    "Type",
    "Collection Method",
    "Description / Settled Bills",
    "Sales (BDT)",
    "Collection (BDT)",
    "Balance (BDT)",
  ];

  const bodyRows = statementEntries.map((e, idx) => {
    const desc = buildStatementDescription(e);

    const salesCell =
      e.salesAmount > 0
        ? formatMoney(e.salesAmount)
        : e.salesAmount < 0
        ? {
            content: `-${formatMoney(Math.abs(e.salesAmount))}`,
            styles: { textColor: REPORT_RGB.rose, fontStyle: "bold" },
          }
        : "-";

    const balanceCell =
      e.runningBalance > 0
        ? {
            content: formatMoney(e.runningBalance),
            styles: { textColor: REPORT_RGB.rose, fontStyle: "bold" },
          }
        : e.runningBalance < 0
        ? {
            content: formatMoney(Math.abs(e.runningBalance)),
            styles: { textColor: REPORT_RGB.emerald, fontStyle: "bold" },
          }
        : "0";

    return [
      idx + 1,
      e.fullDateTimeStr || e.formattedDate,
      e.typeLabel,
      e.paymentMode || "-",
      desc,
      salesCell,
      e.collectionAmount > 0 ? formatMoney(e.collectionAmount) : "-",
      balanceCell,
    ];
  });

  const finalBalance =
    statementEntries[statementEntries.length - 1]?.runningBalance ?? 0;

  const totalBalanceCell =
    finalBalance > 0
      ? {
          content: formatMoney(finalBalance),
          styles: { textColor: REPORT_RGB.rose, fontStyle: "bold" },
        }
      : finalBalance < 0
      ? {
          content: formatMoney(Math.abs(finalBalance)),
          styles: { textColor: REPORT_RGB.emerald, fontStyle: "bold" },
        }
      : "0";

  const totalDescCell =
    finalBalance > 0
      ? {
          content: `Closing Balance: BDT ${formatMoney(finalBalance)}`,
          styles: { textColor: REPORT_RGB.rose, fontStyle: "bold" },
        }
      : finalBalance < 0
      ? {
          content: `Closing Balance: BDT ${formatMoney(Math.abs(finalBalance))}`,
          styles: { textColor: REPORT_RGB.emerald, fontStyle: "bold" },
        }
      : {
          content: `Closing Balance: BDT 0 (Fully Cleared)`,
          styles: { fontStyle: "bold" },
        };

  bodyRows.push([
    "Total",
    "-",
    "-",
    "-",
    totalDescCell,
    formatMoney(totals.sales),
    formatMoney(totals.collected),
    totalBalanceCell,
  ]);

  const printDate = formatReportDate(new Date().toISOString());
  const fromStr = meta.startDate ? formatReportDate(meta.startDate) : "ALL";
  const toStr = meta.endDate ? formatReportDate(meta.endDate) : printDate;

  const customerMetaInfo = [
    `Customer: ${customer.customerName}`,
    customer.customerPhone && customer.customerPhone !== "-"
      ? `Phone: ${customer.customerPhone}`
      : "",
  ]
    .filter(Boolean)
    .join("   |   ");

  const metaLeftLabel = `From Date: ${fromStr}   To Date: ${toStr}   |   ${customerMetaInfo}`;

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Ledger_${customer.customerName.replace(
      /\s+/g,
      "_"
    )}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Customer Ledger",
    metaLeftLabel,
    metaRightLabel: "",
    headers,
    bodyRows,
    orientation: "landscape",
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", cellWidth: 36 },
      2: { halign: "center", cellWidth: 31 },
      3: { halign: "center", cellWidth: 28 },
      4: { halign: "left", cellWidth: 96 },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 24 },
      7: { halign: "right", cellWidth: 28 },
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

  const ExcelJSModule: any = await importWithRetry(() => import("exceljs"));
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
    "Collection Method",
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

      const salesVal = e.salesAmount !== 0 ? e.salesAmount : "-";
      const descVal = buildStatementDescription(e);

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
        descVal,
        salesVal,
        e.collectionAmount > 0 ? e.collectionAmount : "-",
        Math.abs(e.runningBalance),
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
        if (col === 9 && e.salesAmount < 0) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFB91C1C" } };
        }
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
    "Type",
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

      const desc = buildStatementDescription(e);

      const salesCell =
        e.salesAmount > 0
          ? formatMoney(e.salesAmount)
          : e.salesAmount < 0
          ? {
              content: `-${formatMoney(Math.abs(e.salesAmount))}`,
              styles: { textColor: REPORT_RGB.rose, fontStyle: "bold" },
            }
          : "-";

      const balanceCell =
        e.runningBalance > 0
          ? {
              content: formatMoney(e.runningBalance),
              styles: { textColor: REPORT_RGB.rose, fontStyle: "bold" },
            }
          : e.runningBalance < 0
          ? {
              content: formatMoney(Math.abs(e.runningBalance)),
              styles: { textColor: REPORT_RGB.emerald, fontStyle: "bold" },
            }
          : "0";

      bodyRows.push([
        sl++,
        c.customerName,
        e.fullDateTimeStr || e.formattedDate,
        e.typeLabel,
        desc,
        salesCell,
        e.collectionAmount > 0 ? formatMoney(e.collectionAmount) : "-",
        balanceCell,
      ]);
    });
  });

  const totalBalanceCell =
    totalDue > 0
      ? {
          content: formatMoney(totalDue),
          styles: { textColor: REPORT_RGB.rose, fontStyle: "bold" },
        }
      : totalDue < 0
      ? {
          content: formatMoney(Math.abs(totalDue)),
          styles: { textColor: REPORT_RGB.emerald, fontStyle: "bold" },
        }
      : "0";

  bodyRows.push([
    "Total",
    `Total Customers: ${customers.length}`,
    "-",
    "-",
    totalDue < 0
      ? `Grand Total Balance: BDT ${formatMoney(Math.abs(totalDue))}`
      : `Grand Total Due: BDT ${formatMoney(totalDue)}`,
    formatMoney(totalSales),
    formatMoney(totalCollected),
    totalBalanceCell,
  ]);

  await generateAndDownloadCorporatePdf({
    fileName: `Customer_Wise_Detailed_Collection_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Customer-Wise Detailed Collection Report",
    metaRightLabel: `Total Customers: ${customers.length}`,
    headers,
    bodyRows,
    orientation: "landscape",
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", cellWidth: 36 },
      2: { halign: "center", cellWidth: 36 },
      3: { halign: "center", cellWidth: 30 },
      4: { halign: "left", cellWidth: 93 },
      5: { halign: "right", cellWidth: 24 },
      6: { halign: "right", cellWidth: 24 },
      7: { halign: "right", cellWidth: 24 },
    },
    meta,
  });
}

