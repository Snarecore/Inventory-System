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
  generateAndDownloadCorporatePdf,
  isDateInReportRange,
  parseFlexibleReportDate,
  REPORT_RGB,
} from "@/utils/trade-report-helpers";
import type { LedgerPerson, LedgerTransaction } from "@/types";

export type KhatabookReportTab = "transactions" | "persons";

export interface NormalizedKhatabookTransaction {
  id: number;
  personId: number;
  personName: string;
  personPhone: string;
  transactionType: "PABO" | "DIBO" | "OPENING";
  displayType: string;
  paymentType: string;
  amount: number;
  receivableAmount: number;
  payableAmount: number;
  commission: number;
  note: string;
  refNo: string;
  bankAccountNo?: string | null;
  mfsUserId?: string | number | null;
  addedBy: string;
  rawDate: string;
  formattedDate: string;
}

export interface NormalizedPersonSummaryRow {
  id: number;
  name: string;
  phone: string;
  address: string;
  type: string;
  tag: string;
  totalPabo: number;
  totalDibo: number;
  totalCommission: number;
  netBalance: number;
  transactionCount: number;
  lastTransactionDate: string;
  status: string;
}

export interface KhatabookReportKpis {
  totalPabo: number;
  totalDibo: number;
  netBalance: number;
  totalCommission: number;
  cashAmount: number;
  digitalAmount: number;
  totalTransactions: number;
  totalPersons: number;
}

/**
 * Formats a transaction date cleanly
 */
export function formatKhatabookDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = parseFlexibleReportDate(dateStr);
  if (!d) return dateStr;
  return moment(d).format("MMM DD, YYYY, h:mm A");
}

/**
 * Normalizes all ledger transactions and filters them inclusively by date range.
 */
export function normalizeKhatabookTransactions(
  transactions: LedgerTransaction[],
  persons: LedgerPerson[],
  startDate?: string,
  endDate?: string
): NormalizedKhatabookTransaction[] {
  if (!Array.isArray(transactions)) return [];

  const personMap = new Map<number, LedgerPerson>();
  persons.forEach((p) => {
    if (p.id != null) personMap.set(Number(p.id), p);
  });

  const result: NormalizedKhatabookTransaction[] = [];

  transactions.forEach((txn) => {
    const rawDate =
      txn.transactionDate || txn.createdDate || txn.createdAt || "";

    if (startDate || endDate) {
      if (!isDateInReportRange(rawDate, startDate, endDate)) {
        return;
      }
    }

    const typeUpper = (txn.transactionType || "").toUpperCase();
    const isOpening = typeUpper.includes("OPENING");
    const isPabo = typeUpper.includes("PABO");
    const isDibo = typeUpper.includes("DIBO");

    let normalizedType: "PABO" | "DIBO" | "OPENING" = "PABO";
    let displayType = "Receivable (Pabo)";
    if (isOpening) {
      normalizedType = "OPENING";
      displayType = isPabo ? "Opening (Pabo)" : "Opening (Dibo)";
    } else if (isDibo) {
      normalizedType = "Dibo" ? "DIBO" : "PABO";
      displayType = "Payable (Dibo)";
    }

    const amt = Number(txn.amount) || 0;
    const comm = Number(txn.commission) || 0;
    const person = personMap.get(Number(txn.personId));

    const pName =
      txn.personName ||
      person?.name ||
      (txn.personId ? `Person #${txn.personId}` : "Unknown");
    const pPhone = person?.phone || "";

    const method = (txn.paymentType || "CASH").toUpperCase();

    result.push({
      id: Number(txn.id),
      personId: Number(txn.personId),
      personName: pName,
      personPhone: pPhone,
      transactionType: normalizedType,
      displayType,
      paymentType: method || "CASH",
      amount: amt,
      receivableAmount: isPabo ? amt : 0,
      payableAmount: isDibo ? amt : 0,
      commission: comm,
      note: txn.note || "",
      refNo: txn.refNo || "",
      bankAccountNo: txn.bankAccountNo,
      mfsUserId: txn.mfsUserId,
      addedBy: txn.addedBy || "",
      rawDate,
      formattedDate: formatKhatabookDate(rawDate),
    });
  });

  return result.sort((a, b) => {
    const tA = parseFlexibleReportDate(a.rawDate)?.valueOf() || 0;
    const tB = parseFlexibleReportDate(b.rawDate)?.valueOf() || 0;
    return tB - tA;
  });
}

/**
 * Computes high-level KPI metrics for the Khatabook report
 */
export function computeKhatabookReportKpis(
  transactions: NormalizedKhatabookTransaction[],
  persons: LedgerPerson[]
): KhatabookReportKpis {
  let totalPabo = 0;
  let totalDibo = 0;
  let totalCommission = 0;
  let cashAmount = 0;
  let digitalAmount = 0;

  transactions.forEach((txn) => {
    totalPabo += txn.receivableAmount;
    totalDibo += txn.payableAmount;
    totalCommission += txn.commission;

    const isDigital =
      txn.paymentType === "BANK" ||
      txn.paymentType === "MFS" ||
      txn.paymentType.includes("DIGITAL");
    if (isDigital) {
      digitalAmount += txn.amount;
    } else {
      cashAmount += txn.amount;
    }
  });

  return {
    totalPabo,
    totalDibo,
    netBalance: totalPabo - totalDibo,
    totalCommission,
    cashAmount,
    digitalAmount,
    totalTransactions: transactions.length,
    totalPersons: persons.length,
  };
}

// ============================================================================
// Excel & Corporate PDF Export Definition: Transactions Table
// ============================================================================

export function buildKhatabookTxnColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<NormalizedKhatabookTransaction, any>[] {
  return [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      excelValue: (_row, idx) => idx + 1,
      pdfStyle: { halign: "center", cellWidth: 10 },
      pdfCell: (_row, idx) => ({
        content: String(idx + 1),
        styles: { halign: "center" },
      }),
    },
    {
      key: "date",
      excelHeader: "Date & Time",
      pdfHeader: "Date & Time",
      isLeadingLabel: true,
      excelValue: (r) => r.formattedDate,
      pdfStyle: { halign: "center", cellWidth: 33 },
      pdfCell: (r) => ({
        content: r.formattedDate,
        styles: { halign: "center" },
      }),
    },
    {
      key: "person",
      excelHeader: "Name",
      pdfHeader: "Name",
      isLeadingLabel: true,
      excelValue: (r) => r.personName,
      pdfStyle: { halign: "left", cellWidth: 37 },
      pdfCell: (r) => ({
        content:
          r.personName ||
          (r.personPhone ? `Account (${r.personPhone})` : `Person #${r.personId}`),
        styles: { halign: "left" },
      }),
    },
    {
      key: "phone",
      excelHeader: "Phone Number",
      pdfHeader: "Phone Number",
      isLeadingLabel: true,
      excelValue: (r) => r.personPhone || "-",
      pdfStyle: { halign: "center", cellWidth: 26 },
      pdfCell: (r) => ({
        content: r.personPhone || "-",
        styles: { halign: "center" },
      }),
    },
    {
      key: "type",
      excelHeader: "Transaction Type",
      pdfHeader: "Transaction Type",
      isLeadingLabel: true,
      excelValue: (r) => r.displayType,
      pdfStyle: { halign: "center", cellWidth: 28 },
      pdfCell: (r) => ({
        content: r.displayType,
        styles: { halign: "center" },
      }),
    },
    {
      key: "method",
      excelHeader: "Payment Method",
      pdfHeader: "Method",
      isLeadingLabel: true,
      excelValue: (r) => r.paymentType,
      pdfStyle: { halign: "center", cellWidth: 22 },
      pdfCell: (r) => ({
        content: r.paymentType,
        styles: { halign: "center" },
      }),
    },
    {
      key: "description",
      excelHeader: "Description / Ref",
      pdfHeader: "Description / Ref",
      isLeadingLabel: true,
      excelValue: (r) =>
        [r.note, r.refNo ? `(Ref: ${r.refNo})` : ""].filter(Boolean).join(" ") ||
        "-",
      pdfStyle: { halign: "left", cellWidth: 45 },
      pdfCell: (r) => {
        const descText = [
          r.note,
          r.refNo ? `(Ref: ${r.refNo})` : "",
        ]
          .filter(Boolean)
          .join(" ");
        return {
          content: descText || "-",
          styles: { halign: "left" },
        };
      },
    },
    {
      key: "receivable",
      excelHeader: "Receivable (BDT)",
      pdfHeader: "Receivable (BDT)",
      excelValue: (r) => (r.receivableAmount > 0 ? r.receivableAmount : 0),
      excelTotalValue: (t) => t.totalPabo,
      pdfStyle: { halign: "right", cellWidth: 26 },
      pdfCell: (r) =>
        r.receivableAmount > 0
          ? {
              content: formatMoney(r.receivableAmount),
              styles: {
                halign: "right",
                fontStyle: "bold",
                textColor: REPORT_RGB.emerald,
              },
            }
          : {
              content: "-",
              styles: {
                halign: "center",
                textColor: REPORT_RGB.muted,
              },
            },
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalPabo),
        styles: {
          halign: "right",
          fontStyle: "bold",
          textColor: REPORT_RGB.emerald,
        },
      }),
    },
    {
      key: "payable",
      excelHeader: "Payable (BDT)",
      pdfHeader: "Payable (BDT)",
      excelValue: (r) => (r.payableAmount > 0 ? r.payableAmount : 0),
      excelTotalValue: (t) => t.totalDibo,
      pdfStyle: { halign: "right", cellWidth: 26 },
      pdfCell: (r) =>
        r.payableAmount > 0
          ? {
              content: formatMoney(r.payableAmount),
              styles: {
                halign: "right",
                fontStyle: "bold",
                textColor: REPORT_RGB.rose,
              },
            }
          : {
              content: "-",
              styles: {
                halign: "center",
                textColor: REPORT_RGB.muted,
              },
            },
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalDibo),
        styles: {
          halign: "right",
          fontStyle: "bold",
          textColor: REPORT_RGB.rose,
        },
      }),
    },
    {
      key: "commission",
      excelHeader: "Commission (BDT)",
      pdfHeader: "Commission (BDT)",
      excelValue: (r) => r.commission || 0,
      excelTotalValue: (t) => t.totalCommission,
      pdfStyle: { halign: "right", cellWidth: 24 },
      pdfCell: (r) =>
        r.commission > 0
          ? {
              content: formatMoney(r.commission),
              styles: {
                halign: "right",
                fontStyle: "bold",
                textColor: REPORT_RGB.amber,
              },
            }
          : {
              content: "-",
              styles: {
                halign: "center",
                textColor: REPORT_RGB.muted,
              },
            },
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalCommission),
        styles: {
          halign: "right",
          fontStyle: "bold",
          textColor: REPORT_RGB.amber,
        },
      }),
    },
  ];
}

/**
 * Exports Khatabook transactions to styled Excel file
 */
export async function exportKhatabookTransactionsExcel(
  transactions: NormalizedKhatabookTransaction[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<string> {
  if (!transactions || transactions.length === 0) {
    throw new Error("No transactions available to export");
  }

  const totals = transactions.reduce(
    (acc, t) => {
      acc.totalPabo += t.receivableAmount;
      acc.totalDibo += t.payableAmount;
      acc.totalCommission += t.commission;
      return acc;
    },
    { totalPabo: 0, totalDibo: 0, totalCommission: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildKhatabookTxnColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    transactions,
    columns,
    totals,
    `TOTAL SUMMARY (${transactions.length} Transactions)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    fileName: `Khatabook_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Khatabook Ledger",
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    businessLogoUrl: meta.businessLogoUrl,
    reportTitle: "Khatabook Transaction & Ledger Report",
    startDate: meta.startDate,
    endDate: meta.endDate,
    totalSummarySpan,
  });

  return `${transactions.length} টি লেনদেন এক্সেলে এক্সপোর্ট করা হয়েছে`;
}

/**
 * Downloads a corporate PDF for Khatabook transactions
 */
export async function downloadKhatabookTransactionsPdf(
  transactions: NormalizedKhatabookTransaction[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<string> {
  if (!transactions || transactions.length === 0) {
    throw new Error("No transactions available to download");
  }

  const totals = transactions.reduce(
    (acc, t) => {
      acc.totalPabo += t.receivableAmount;
      acc.totalDibo += t.payableAmount;
      acc.totalCommission += t.commission;
      return acc;
    },
    { totalPabo: 0, totalDibo: 0, totalCommission: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildKhatabookTxnColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    transactions,
    columns,
    totals,
    `TOTAL SUMMARY (${transactions.length} Transactions)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Khatabook_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Khatabook Transaction & Ledger Report",
    metaRightLabel: `Total Transactions: ${transactions.length} | Net Balance: BDT ${formatMoney(totals.totalPabo - totals.totalDibo)}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
    orientation: "landscape",
  });

  return "খাতাবই পিডিএফ রিপোর্ট সফলভাবে ডাউনলোড হয়েছে";
}

// ============================================================================
// Person-Wise Summary Excel & PDF Helpers
// ============================================================================

export function buildPersonSummaryColumns(
  _themeRgb: [number, number, number]
): ExportColumnDef<NormalizedPersonSummaryRow, any>[] {
  return [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      excelValue: (_row, idx) => idx + 1,
      pdfStyle: { halign: "center", cellWidth: 10 },
      pdfCell: (_row, idx) => ({
        content: String(idx + 1),
        styles: { halign: "center" },
      }),
    },
    {
      key: "name",
      excelHeader: "Name",
      pdfHeader: "Name",
      isLeadingLabel: true,
      excelValue: (r) => r.name,
      pdfStyle: { halign: "left", cellWidth: 42 },
      pdfCell: (r) => ({
        content: r.name || (r.phone ? `Account (${r.phone})` : "-"),
        styles: { halign: "left" },
      }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      pdfHeader: "Phone",
      isLeadingLabel: true,
      excelValue: (r) => r.phone || "-",
      pdfStyle: { halign: "center", cellWidth: 25 },
      pdfCell: (r) => ({
        content: r.phone || "-",
        styles: { halign: "center" },
      }),
    },
    {
      key: "address",
      excelHeader: "Address",
      pdfHeader: "Address",
      isLeadingLabel: true,
      excelValue: (r) => r.address || "-",
      pdfStyle: { halign: "left", cellWidth: 35 },
      pdfCell: (r) => ({
        content: r.address || "-",
        styles: { halign: "left" },
      }),
    },
    {
      key: "tag",
      excelHeader: "Type / Tag",
      pdfHeader: "Tag",
      isLeadingLabel: true,
      excelValue: (r) => r.tag || r.type || "Regular",
      pdfStyle: { halign: "center", cellWidth: 20 },
      pdfCell: (r) => ({
        content: r.tag || r.type || "Regular",
        styles: { halign: "center" },
      }),
    },
    {
      key: "pabo",
      excelHeader: "Total Receivable (Pabo)",
      pdfHeader: "Total Receivable",
      excelValue: (r) => r.totalPabo,
      excelTotalValue: (t) => t.totalPabo,
      pdfStyle: { halign: "right", cellWidth: 28 },
      pdfCell: (r) => ({
        content: formatMoney(r.totalPabo),
        styles: { halign: "right", fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalPabo),
        styles: { halign: "right", fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "dibo",
      excelHeader: "Total Payable (Dibo)",
      pdfHeader: "Total Payable",
      excelValue: (r) => r.totalDibo,
      excelTotalValue: (t) => t.totalDibo,
      pdfStyle: { halign: "right", cellWidth: 28 },
      pdfCell: (r) => ({
        content: formatMoney(r.totalDibo),
        styles: { halign: "right", fontStyle: "bold", textColor: REPORT_RGB.rose },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.totalDibo),
        styles: { halign: "right", fontStyle: "bold", textColor: REPORT_RGB.rose },
      }),
    },
    {
      key: "netBalance",
      excelHeader: "Net Balance",
      pdfHeader: "Net Balance",
      excelValue: (r) => r.netBalance,
      excelTotalValue: (t) => t.netBalance,
      pdfStyle: { halign: "right", cellWidth: 28 },
      pdfCell: (r) => ({
        content: `${r.netBalance >= 0 ? "+" : "-"} ${formatMoney(Math.abs(r.netBalance))}`,
        styles: {
          halign: "right",
          fontStyle: "bold",
          textColor: r.netBalance > 0 ? REPORT_RGB.emerald : r.netBalance < 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      }),
      pdfSummaryCell: (t) => ({
        content: `${t.netBalance >= 0 ? "+" : "-"} ${formatMoney(Math.abs(t.netBalance))}`,
        styles: {
          halign: "right",
          fontStyle: "bold",
          textColor: t.netBalance > 0 ? REPORT_RGB.emerald : t.netBalance < 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      }),
    },
    {
      key: "txnCount",
      excelHeader: "Transactions",
      pdfHeader: "Txns",
      excelValue: (r) => r.transactionCount,
      excelTotalValue: (t) => t.totalTxns,
      pdfStyle: { halign: "center", cellWidth: 16 },
      pdfCell: (r) => ({
        content: String(r.transactionCount),
        styles: { halign: "center" },
      }),
      pdfSummaryCell: (t) => ({
        content: String(t.totalTxns),
        styles: { halign: "center", fontStyle: "bold" },
      }),
    },
    {
      key: "lastTxnDate",
      excelHeader: "Last Transaction",
      pdfHeader: "Last Txn",
      excelValue: (r) => formatKhatabookDate(r.lastTransactionDate),
      pdfStyle: { halign: "center", cellWidth: 26 },
      pdfCell: (r) => ({
        content: formatKhatabookDate(r.lastTransactionDate),
        styles: { halign: "center" },
      }),
    },
    {
      key: "status",
      excelHeader: "Status",
      pdfHeader: "Status",
      excelValue: (r) => r.status,
      pdfStyle: { halign: "center", cellWidth: 18 },
      pdfCell: (r) => ({
        content: r.status,
        styles: { halign: "center" },
      }),
    },
  ];
}

export async function exportPersonSummaryExcel(
  persons: NormalizedPersonSummaryRow[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<string> {
  if (!persons || persons.length === 0) {
    throw new Error("No person records available to export");
  }

  const totals = persons.reduce(
    (acc, p) => {
      acc.totalPabo += p.totalPabo;
      acc.totalDibo += p.totalDibo;
      acc.netBalance += p.netBalance;
      acc.totalTxns += p.transactionCount;
      return acc;
    },
    { totalPabo: 0, totalDibo: 0, netBalance: 0, totalTxns: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildPersonSummaryColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    persons,
    columns,
    totals,
    `TOTAL SUMMARY (${persons.length} Accounts)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    fileName: `Khatabook_Person_Summary_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Person Summary",
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    businessLogoUrl: meta.businessLogoUrl,
    reportTitle: "Khatabook Accounts & Person Summary Report",
    totalSummarySpan,
  });

  return `${persons.length} টি একাউন্ট এক্সেলে এক্সপোর্ট করা হয়েছে`;
}

export async function downloadPersonSummaryPdf(
  persons: NormalizedPersonSummaryRow[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<string> {
  if (!persons || persons.length === 0) {
    throw new Error("No person records available to download");
  }

  const totals = persons.reduce(
    (acc, p) => {
      acc.totalPabo += p.totalPabo;
      acc.totalDibo += p.totalDibo;
      acc.netBalance += p.netBalance;
      acc.totalTxns += p.transactionCount;
      return acc;
    },
    { totalPabo: 0, totalDibo: 0, netBalance: 0, totalTxns: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildPersonSummaryColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    persons,
    columns,
    totals,
    `TOTAL SUMMARY (${persons.length} Accounts)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Khatabook_Person_Summary_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Khatabook Accounts & Person Summary Report",
    metaRightLabel: `Total Accounts: ${persons.length} | Net Balance: BDT ${formatMoney(totals.netBalance)}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
    orientation: "landscape",
  });

  return "একাউন্টস সামারি পিডিএফ সফলভাবে ডাউনলোড হয়েছে";
}
