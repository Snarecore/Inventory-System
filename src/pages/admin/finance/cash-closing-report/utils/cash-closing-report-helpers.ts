import moment from "moment";
import { formatMoney } from "@/utils/formatters";
import {
  buildAndDownloadExcel,
  resolveThemeArgb,
  argbToRgbTuple,
} from "@/utils/excel-export";
import {
  DIFFERENCE_REASONS,
  type CashClosingData,
  type CashClosingReportSummary,
} from "@/types";
import {
  type ReportCompanyMeta,
  REPORT_RGB,
  generateAndDownloadCorporatePdf,
} from "@/utils/trade-report-helpers";
import type { RowInput } from "jspdf-autotable";

export type CashClosingReportTab = "history" | "audit";

export const CASH_CLOSING_MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export const CASH_CLOSING_YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) =>
  String(2020 + i)
);

const REASON_LABELS: Record<string, string> = DIFFERENCE_REASONS.reduce(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {} as Record<string, string>
);

export function formatDifferenceReason(raw?: string | null): string {
  const clean = String(raw || "").trim();
  if (!clean) return "N/A";
  return REASON_LABELS[clean] || clean;
}

export function getPeriodDateBounds(
  selectedMonth: string,
  selectedYear: string
): { startDate: string; endDate: string; periodLabel: string } {
  if (selectedMonth === "ALL") {
    const start = moment(`${selectedYear}-01-01`, "YYYY-MM-DD");
    const isCurrentYear = selectedYear === moment().format("YYYY");
    const end = isCurrentYear
      ? moment()
      : moment(`${selectedYear}-12-31`, "YYYY-MM-DD");
    return {
      startDate: start.format("YYYY-MM-DD"),
      endDate: end.format("YYYY-MM-DD"),
      periodLabel: `Full Year ${selectedYear}`,
    };
  }

  const ym = `${selectedYear}-${selectedMonth}`;
  const m = moment(ym, "YYYY-MM");
  if (!m.isValid()) {
    const now = moment();
    return {
      startDate: now.clone().startOf("month").format("YYYY-MM-DD"),
      endDate: now.clone().endOf("month").format("YYYY-MM-DD"),
      periodLabel: now.format("MMMM YYYY"),
    };
  }

  return {
    startDate: m.clone().startOf("month").format("YYYY-MM-DD"),
    endDate: m.clone().endOf("month").format("YYYY-MM-DD"),
    periodLabel: m.format("MMMM YYYY"),
  };
}

export interface NormalizedCashClosingMetrics {
  closingDate: string;
  openingCash: number;
  todayDeposit: number;
  todayExpense: number;
  expectedCash: number;
  countedCash: number;
  differenceAmount: number;
  reasonCode: string;
  reasonLabel: string;
  remarks: string;
  status: string;
  isClosed: boolean;
  isMatched: boolean;
  varianceType: "MATCHED" | "SHORTAGE" | "SURPLUS";
  closedBy: string;
  closedAt: string;
}

/**
 * Single source of truth for normalizing CashClosingData metrics across tables & exports
 */
export function extractCashClosingMetrics(
  item: CashClosingData
): NormalizedCashClosingMetrics {
  const raw: any = item || {};
  const closingDate = raw.closingDate || raw.date || "";
  const openingCash = Number(raw.openingCash ?? 0);
  const todayDeposit = Number(raw.todayDeposit ?? 0);
  const todayExpense = Number(raw.todayExpense ?? 0);
  const expectedCash = Number(
    raw.expectedCash ?? openingCash + todayDeposit - todayExpense
  );
  const countedCash = Number(raw.countedCash ?? raw.actualCash ?? 0);
  const differenceAmount = Number(
    raw.differenceAmount ?? raw.difference ?? countedCash - expectedCash
  );
  const reasonCode = String(raw.differenceReason || "").trim();
  const reasonLabel = formatDifferenceReason(reasonCode);
  const remarks = String(raw.remarks || "").trim();
  const status = String(raw.status || "Open");
  const isClosed = status.toLowerCase() === "closed";
  const isMatched = differenceAmount === 0;
  const varianceType = isMatched
    ? "MATCHED"
    : differenceAmount < 0
    ? "SHORTAGE"
    : "SURPLUS";

  return {
    closingDate,
    openingCash,
    todayDeposit,
    todayExpense,
    expectedCash,
    countedCash,
    differenceAmount,
    reasonCode,
    reasonLabel,
    remarks,
    status,
    isClosed,
    isMatched,
    varianceType,
    closedBy: String(raw.closedBy || raw.addedBy || "").trim(),
    closedAt: String(raw.closedAt || raw.addedDate || "").trim(),
  };
}

export interface CashClosingKpiTotals {
  totalRecords: number;
  matchedDays: number;
  mismatchedDays: number;
  totalDeposits: number;
  totalExpenses: number;
  totalDiff: number;
}

export function computeCashClosingKpiTotals(
  records: CashClosingData[],
  apiSummary?: CashClosingReportSummary
): CashClosingKpiTotals {
  let matched = 0;
  let mismatched = 0;
  let totalDeposits = 0;
  let totalExpenses = 0;
  let totalDiff = 0;

  records.forEach((rec) => {
    const m = extractCashClosingMetrics(rec);
    totalDeposits += m.todayDeposit;
    totalExpenses += m.todayExpense;
    totalDiff += m.differenceAmount;
    if (m.isMatched) matched += 1;
    else mismatched += 1;
  });

  return {
    totalRecords: records.length,
    matchedDays:
      records.length > 0 ? matched : apiSummary?.matchedDays ?? 0,
    mismatchedDays:
      records.length > 0 ? mismatched : apiSummary?.mismatchedDays ?? 0,
    totalDeposits,
    totalExpenses,
    totalDiff: records.length > 0 ? totalDiff : apiSummary?.totalDiff ?? 0,
  };
}

export interface VarianceReasonSummary {
  reason: string;
  occurrences: number;
  totalExpected: number;
  totalCounted: number;
  netVariance: number;
}

export function aggregateVarianceReasons(
  records: CashClosingData[]
): VarianceReasonSummary[] {
  const map: Record<string, VarianceReasonSummary> = {};

  records.forEach((rec) => {
    const m = extractCashClosingMetrics(rec);
    if (m.isMatched) return;

    const key =
      m.reasonLabel !== "N/A"
        ? m.reasonLabel
        : m.varianceType === "SHORTAGE"
        ? "Unspecified Shortage"
        : "Unspecified Surplus";

    if (!map[key]) {
      map[key] = {
        reason: key,
        occurrences: 0,
        totalExpected: 0,
        totalCounted: 0,
        netVariance: 0,
      };
    }

    map[key].occurrences += 1;
    map[key].totalExpected += m.expectedCash;
    map[key].totalCounted += m.countedCash;
    map[key].netVariance += m.differenceAmount;
  });

  return Object.values(map).sort(
    (a, b) => Math.abs(b.netVariance) - Math.abs(a.netVariance)
  );
}

function getCashClosingExportSuffix(options?: {
  selectedMonth?: string;
  selectedYear?: string;
}): string {
  if (options?.selectedYear && options?.selectedMonth) {
    return `${options.selectedYear}_${options.selectedMonth}`;
  }
  return moment().format("YYYY-MM-DD");
}

/**
 * Corporate Excel export for Daily Cash Closing History / Reconciliation Report
 */
export async function exportCashClosingReportExcel(
  records: CashClosingData[],
  meta: ReportCompanyMeta,
  options?: { selectedMonth?: string; selectedYear?: string }
): Promise<number> {
  if (!records || records.length === 0) {
    throw new Error("No cash closing history records available to export");
  }

  let sumDeposit = 0;
  let sumExpense = 0;
  let sumDiff = 0;

  const rows = records.map((item, idx) => {
    const m = extractCashClosingMetrics(item);
    sumDeposit += m.todayDeposit;
    sumExpense += m.todayExpense;
    sumDiff += m.differenceAmount;

    return {
      SL: idx + 1,
      "Closing Date": m.closingDate
        ? moment(m.closingDate).format("DD-MMM-YYYY").toUpperCase()
        : "-",
      "Opening Cash (৳)": m.openingCash,
      "Deposit (৳)": m.todayDeposit,
      "Expense (৳)": m.todayExpense,
      "Expected Cash (৳)": m.expectedCash,
      "Counted Cash (৳)": m.countedCash,
      "Variance (৳)": m.differenceAmount,
      Reason: m.reasonLabel,
      Status: m.status.toUpperCase(),
      Remarks: m.remarks || "-",
    };
  });

  const totalRow = {
    SL: `TOTAL SUMMARY (${records.length} Days)`,
    "Closing Date": "",
    "Opening Cash (৳)": "",
    "Deposit (৳)": Number(sumDeposit.toFixed(2)),
    "Expense (৳)": Number(sumExpense.toFixed(2)),
    "Expected Cash (৳)": "",
    "Counted Cash (৳)": "",
    "Variance (৳)": Number(sumDiff.toFixed(2)),
    Reason: "",
    Status: "",
    Remarks: "",
  };

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Cash_Closing_Report_${getCashClosingExportSuffix(options)}.xlsx`,
    sheetName: "Cash Closing Report",
    reportTitle: "Cash Closing Report",
    totalLabel: "Total Closings",
    totalSummarySpan: 2,
    includeSignatures: true,
  });

  return rows.length;
}

/**
 * Corporate PDF download for Daily Cash Closing Report
 */
export async function downloadCashClosingReportPdf(
  records: CashClosingData[],
  meta: ReportCompanyMeta,
  options?: { selectedMonth?: string; selectedYear?: string }
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error("No cash closing records available to download PDF");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  let sumDeposit = 0;
  let sumExpense = 0;
  let sumDiff = 0;
  let matched = 0;
  let mismatched = 0;

  const dataRows: RowInput[] = records.map((item, idx) => {
    const m = extractCashClosingMetrics(item);
    sumDeposit += m.todayDeposit;
    sumExpense += m.todayExpense;
    sumDiff += m.differenceAmount;
    if (m.isMatched) matched += 1;
    else mismatched += 1;

    const varColor = m.isMatched
      ? REPORT_RGB.emerald
      : m.differenceAmount < 0
      ? REPORT_RGB.rose
      : REPORT_RGB.amber;

    const varianceStr =
      m.differenceAmount > 0
        ? `+${formatMoney(m.differenceAmount)}`
        : m.differenceAmount < 0
        ? `-${formatMoney(Math.abs(m.differenceAmount))}`
        : "0";

    return [
      idx + 1,
      {
        content: m.closingDate
          ? moment(m.closingDate).format("DD-MMM-YYYY").toUpperCase()
          : "-",
        styles: { fontStyle: "bold" },
      },
      formatMoney(m.openingCash),
      {
        content: formatMoney(m.todayDeposit),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      },
      {
        content: formatMoney(m.todayExpense),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.rose },
      },
      {
        content: formatMoney(m.expectedCash),
        styles: { fontStyle: "bold" },
      },
      {
        content: formatMoney(m.countedCash),
        styles: { fontStyle: "bold" },
      },
      {
        content: varianceStr,
        styles: { fontStyle: "bold", textColor: varColor },
      },
      m.reasonLabel,
      {
        content: m.status.toUpperCase(),
        styles: {
          fontStyle: "bold",
          textColor: m.isClosed ? REPORT_RGB.emerald : REPORT_RGB.amber,
        },
      },
      m.remarks || "-",
    ];
  });

  const summaryDiffColor =
    sumDiff === 0
      ? REPORT_RGB.emerald
      : sumDiff < 0
      ? REPORT_RGB.rose
      : REPORT_RGB.amber;

  const sumDiffStr =
    sumDiff > 0
      ? `+${formatMoney(sumDiff)}`
      : sumDiff < 0
      ? `-${formatMoney(Math.abs(sumDiff))}`
      : "0";

  const summaryRow: RowInput = [
    {
      content: `TOTAL SUMMARY (${records.length} Closings)`,
      colSpan: 3,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: formatMoney(sumDeposit),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.emerald,
      },
    },
    {
      content: formatMoney(sumExpense),
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.rose,
      },
    },
    {
      content: "",
      colSpan: 2,
      styles: { fillColor: REPORT_RGB.summaryFill },
    },
    {
      content: sumDiffStr,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: summaryDiffColor,
      },
    },
    {
      content: `Matched: ${matched} | Mismatch: ${mismatched}`,
      colSpan: 3,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: themeRgb,
      },
    },
  ];

  await generateAndDownloadCorporatePdf({
    fileName: `Cash_Closing_Report_${getCashClosingExportSuffix(options)}.pdf`,
    reportTitle: "Cash Closing Report",
    metaRightLabel: `Closings: ${records.length} (Matched: ${matched})`,
    headers: [
      "SL",
      "Closing Date",
      "Opening (BDT)",
      "Deposit (BDT)",
      "Expense (BDT)",
      "Expected (BDT)",
      "Counted (BDT)",
      "Variance (BDT)",
      "Reason",
      "Status",
      "Remarks",
    ],
    bodyRows: [...dataRows, summaryRow],
    columnStyles: {
      "0": { halign: "center", cellWidth: 10 },
      "1": { halign: "center" },
      "2": { halign: "right" },
      "3": { halign: "right" },
      "4": { halign: "right" },
      "5": { halign: "right" },
      "6": { halign: "right" },
      "7": { halign: "right" },
      "8": { halign: "left" },
      "9": { halign: "center" },
      "10": { halign: "left" },
    },
    meta,
  });
}

/**
 * Corporate Excel export specifically for Cash Closing Variance & Discrepancy Audit
 */
export async function exportCashClosingAuditExcel(
  records: CashClosingData[],
  meta: ReportCompanyMeta,
  options?: { selectedMonth?: string; selectedYear?: string }
): Promise<number> {
  if (!records || records.length === 0) {
    throw new Error("No variance records available to export");
  }

  let sumDiff = 0;

  const rows = records.map((item, idx) => {
    const m = extractCashClosingMetrics(item);
    sumDiff += m.differenceAmount;

    return {
      SL: idx + 1,
      "Closing Date": m.closingDate
        ? moment(m.closingDate).format("DD-MMM-YYYY").toUpperCase()
        : "-",
      "Variance Type": m.varianceType,
      "Reason": m.reasonLabel,
      "Expected Cash (৳)": m.expectedCash,
      "Counted Cash (৳)": m.countedCash,
      "Variance (৳)": m.differenceAmount,
      "Closed By": m.closedBy || "-",
      Status: m.status.toUpperCase(),
      Remarks: m.remarks || "-",
    };
  });

  const totalRow = {
    SL: `TOTAL AUDIT (${records.length} Discrepancies)`,
    "Closing Date": "",
    "Variance Type": "",
    Reason: "",
    "Expected Cash (৳)": "",
    "Counted Cash (৳)": "",
    "Variance (৳)": Number(sumDiff.toFixed(2)),
    "Closed By": "",
    Status: "",
    Remarks: "",
  };

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Cash_Variance_Audit_${getCashClosingExportSuffix(options)}.xlsx`,
    sheetName: "Variance Audit",
    reportTitle: "Cash Closing Variance Audit Report",
    totalLabel: "Total Discrepancies",
    totalSummarySpan: 4,
    includeSignatures: true,
  });

  return rows.length;
}

/**
 * Corporate PDF export for Cash Closing Variance Audit
 */
export async function downloadCashClosingAuditPdf(
  records: CashClosingData[],
  meta: ReportCompanyMeta,
  options?: { selectedMonth?: string; selectedYear?: string }
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error("No variance records available to download PDF");
  }

  let sumDiff = 0;
  let shortageCount = 0;
  let surplusCount = 0;

  const dataRows: RowInput[] = records.map((item, idx) => {
    const m = extractCashClosingMetrics(item);
    sumDiff += m.differenceAmount;
    if (m.differenceAmount < 0) shortageCount += 1;
    else surplusCount += 1;

    const varColor =
      m.differenceAmount < 0 ? REPORT_RGB.rose : REPORT_RGB.amber;
    const varStr =
      m.differenceAmount > 0
        ? `+${formatMoney(m.differenceAmount)}`
        : `-${formatMoney(Math.abs(m.differenceAmount))}`;

    return [
      idx + 1,
      {
        content: m.closingDate
          ? moment(m.closingDate).format("DD-MMM-YYYY").toUpperCase()
          : "-",
        styles: { fontStyle: "bold" },
      },
      {
        content: m.varianceType,
        styles: { fontStyle: "bold", textColor: varColor },
      },
      m.reasonLabel,
      formatMoney(m.expectedCash),
      formatMoney(m.countedCash),
      {
        content: varStr,
        styles: { fontStyle: "bold", textColor: varColor },
      },
      m.closedBy || "-",
      m.status.toUpperCase(),
      m.remarks || "-",
    ];
  });

  const sumStr =
    sumDiff > 0
      ? `+${formatMoney(sumDiff)}`
      : sumDiff < 0
      ? `-${formatMoney(Math.abs(sumDiff))}`
      : "0";

  const summaryRow: RowInput = [
    {
      content: `TOTAL AUDIT (${records.length} Discrepancies)`,
      colSpan: 6,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.dark,
      },
    },
    {
      content: sumStr,
      styles: {
        halign: "right",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: sumDiff < 0 ? REPORT_RGB.rose : REPORT_RGB.amber,
      },
    },
    {
      content: `Shortage: ${shortageCount} | Surplus: ${surplusCount}`,
      colSpan: 3,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: REPORT_RGB.summaryFill,
        textColor: REPORT_RGB.dark,
      },
    },
  ];

  await generateAndDownloadCorporatePdf({
    fileName: `Cash_Variance_Audit_${getCashClosingExportSuffix(options)}.pdf`,
    reportTitle: "Cash Closing Variance Audit Report",
    metaRightLabel: `Total Discrepancies: ${records.length}`,
    headers: [
      "SL",
      "Closing Date",
      "Type",
      "Reason",
      "Expected (BDT)",
      "Counted (BDT)",
      "Variance (BDT)",
      "Closed By",
      "Status",
      "Remarks",
    ],
    bodyRows: [...dataRows, summaryRow],
    columnStyles: {
      "0": { halign: "center", cellWidth: 10 },
      "1": { halign: "center" },
      "2": { halign: "center" },
      "3": { halign: "left" },
      "4": { halign: "right" },
      "5": { halign: "right" },
      "6": { halign: "right" },
      "7": { halign: "left" },
      "8": { halign: "center" },
      "9": { halign: "left" },
    },
    meta,
  });
}
