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
  DIFFERENCE_REASONS,
  type CashClosingData,
  type CashClosingReportSummary,
} from "@/types";
import {
  type ReportCompanyMeta,
  REPORT_RGB,
  generateAndDownloadCorporatePdf,
} from "@/utils/trade-report-helpers";

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

function formatVarianceStr(amount: number): string {
  if (amount > 0) return `+${formatMoney(amount)}`;
  if (amount < 0) return `-${formatMoney(Math.abs(amount))}`;
  return "0";
}

function buildCashClosingHistoryColumns(includeRemarksFallback: boolean): ExportColumnDef<
  NormalizedCashClosingMetrics,
  { sumDeposit: number; sumExpense: number; sumDiff: number }
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
      key: "date",
      excelHeader: "Closing Date",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (m) =>
        m.closingDate
          ? moment(m.closingDate).format("DD-MMM-YYYY").toUpperCase()
          : "-",
      pdfCell: (m) => ({
        content: m.closingDate
          ? moment(m.closingDate).format("DD-MMM-YYYY").toUpperCase()
          : "-",
        styles: { fontStyle: "bold" },
      }),
    },
    {
      key: "openingCash",
      excelHeader: "Opening Cash (৳)",
      pdfHeader: "Opening (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.openingCash,
      pdfCell: (m) => formatMoney(m.openingCash),
    },
    {
      key: "deposit",
      excelHeader: "Deposit (৳)",
      pdfHeader: "Deposit (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.todayDeposit,
      excelTotalValue: (t) => Number(t.sumDeposit.toFixed(2)),
      pdfCell: (m) => ({
        content: formatMoney(m.todayDeposit),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumDeposit),
        styles: { textColor: REPORT_RGB.emerald },
      }),
    },
    {
      key: "expense",
      excelHeader: "Expense (৳)",
      pdfHeader: "Expense (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.todayExpense,
      excelTotalValue: (t) => Number(t.sumExpense.toFixed(2)),
      pdfCell: (m) => ({
        content: formatMoney(m.todayExpense),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.rose },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumExpense),
        styles: { textColor: REPORT_RGB.rose },
      }),
    },
    {
      key: "expected",
      excelHeader: "Expected Cash (৳)",
      pdfHeader: "Expected (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.expectedCash,
      pdfCell: (m) => ({
        content: formatMoney(m.expectedCash),
        styles: { fontStyle: "bold" },
      }),
    },
    {
      key: "counted",
      excelHeader: "Counted Cash (৳)",
      pdfHeader: "Counted (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.countedCash,
      pdfCell: (m) => ({
        content: formatMoney(m.countedCash),
        styles: { fontStyle: "bold" },
      }),
    },
    {
      key: "variance",
      excelHeader: "Variance (৳)",
      pdfHeader: "Variance (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.differenceAmount,
      excelTotalValue: (t) => Number(t.sumDiff.toFixed(2)),
      pdfCell: (m) => {
        const varColor = m.isMatched
          ? REPORT_RGB.emerald
          : m.differenceAmount < 0
          ? REPORT_RGB.rose
          : REPORT_RGB.amber;
        return {
          content: formatVarianceStr(m.differenceAmount),
          styles: { fontStyle: "bold", textColor: varColor },
        };
      },
      pdfSummaryCell: (t) => {
        const summaryDiffColor =
          t.sumDiff === 0
            ? REPORT_RGB.emerald
            : t.sumDiff < 0
            ? REPORT_RGB.rose
            : REPORT_RGB.amber;
        return {
          content: formatVarianceStr(t.sumDiff),
          styles: { textColor: summaryDiffColor },
        };
      },
    },
    {
      key: "reason",
      excelHeader: "Reason",
      pdfStyle: { halign: "left" },
      excelValue: (m) => m.reasonLabel,
      pdfCell: (m) => m.reasonLabel,
    },
    {
      key: "closedBy",
      excelHeader: "Closed By",
      pdfStyle: { halign: "left" },
      excelValue: (m) => m.closedBy || "-",
      pdfCell: (m) => m.closedBy || "-",
    },
    {
      key: "status",
      excelHeader: "Status",
      pdfStyle: { halign: "center" },
      excelValue: (m) => m.status.toUpperCase(),
      pdfCell: (m) => ({
        content: m.status.toUpperCase(),
        styles: {
          fontStyle: "bold",
          textColor: m.isClosed ? REPORT_RGB.emerald : REPORT_RGB.amber,
        },
      }),
    },
    ...(includeRemarksFallback
      ? [
          {
            key: "remarks",
            excelHeader: "Remarks",
            pdfStyle: { halign: "left" as const },
            excelValue: (m: NormalizedCashClosingMetrics) => m.remarks || "-",
            pdfCell: (m: NormalizedCashClosingMetrics) => m.remarks || "-",
          },
        ]
      : []),
  ];
}

/**
 * Corporate Excel export for Daily Cash Closing History / Reconciliation Report
 */
export async function exportCashClosingReportExcel(
  records: CashClosingData[],
  meta: ReportCompanyMeta,
  options?: {
    selectedMonth?: string;
    selectedYear?: string;
    visibleColumns?: Record<string, boolean>;
  }
): Promise<number> {
  if (!records || records.length === 0) {
    throw new Error("No cash closing history records available to export");
  }

  let sumDeposit = 0;
  let sumExpense = 0;
  let sumDiff = 0;

  const metrics = records.map((item) => {
    const m = extractCashClosingMetrics(item);
    sumDeposit += m.todayDeposit;
    sumExpense += m.todayExpense;
    sumDiff += m.differenceAmount;
    return m;
  });

  const columns = buildCashClosingHistoryColumns(!options?.visibleColumns);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    metrics,
    columns,
    { sumDeposit, sumExpense, sumDiff },
    `TOTAL SUMMARY (${records.length} Days)`,
    options?.visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Cash_Closing_Report_${getCashClosingExportSuffix(options)}.xlsx`,
    sheetName: "Cash Closing Report",
    reportTitle: "Cash Closing Report",
    totalLabel: "Total Closings",
    totalSummarySpan,
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
  options?: {
    selectedMonth?: string;
    selectedYear?: string;
    visibleColumns?: Record<string, boolean>;
  }
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

  const metrics = records.map((item) => {
    const m = extractCashClosingMetrics(item);
    sumDeposit += m.todayDeposit;
    sumExpense += m.todayExpense;
    sumDiff += m.differenceAmount;
    if (m.isMatched) matched += 1;
    else mismatched += 1;
    return m;
  });

  const columns = buildCashClosingHistoryColumns(!options?.visibleColumns);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    metrics,
    columns,
    { sumDeposit, sumExpense, sumDiff },
    `TOTAL SUMMARY (${records.length} Closings)`,
    {
      visibleColumns: options?.visibleColumns,
      trailingSummaryLabel: `Matched: ${matched} | Mismatch: ${mismatched}`,
      trailingSummaryColor: themeRgb,
    }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Cash_Closing_Report_${getCashClosingExportSuffix(options)}.pdf`,
    reportTitle: "Cash Closing Report",
    metaRightLabel: `Closings: ${records.length} (Matched: ${matched})`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

function buildCashClosingAuditColumns(includeStatusFallback: boolean): ExportColumnDef<
  NormalizedCashClosingMetrics,
  { sumDiff: number }
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
      key: "date",
      excelHeader: "Closing Date",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (m) =>
        m.closingDate
          ? moment(m.closingDate).format("DD-MMM-YYYY").toUpperCase()
          : "-",
      pdfCell: (m) => ({
        content: m.closingDate
          ? moment(m.closingDate).format("DD-MMM-YYYY").toUpperCase()
          : "-",
        styles: { fontStyle: "bold" },
      }),
    },
    {
      key: "type",
      excelHeader: "Variance Type",
      pdfHeader: "Type",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (m) => m.varianceType,
      pdfCell: (m) => {
        const varColor =
          m.differenceAmount < 0 ? REPORT_RGB.rose : REPORT_RGB.amber;
        return {
          content: m.varianceType,
          styles: { fontStyle: "bold", textColor: varColor },
        };
      },
    },
    {
      key: "reason",
      excelHeader: "Reason",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (m) => m.reasonLabel,
      pdfCell: (m) => m.reasonLabel,
    },
    {
      key: "expected",
      excelHeader: "Expected Cash (৳)",
      pdfHeader: "Expected (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.expectedCash,
      pdfCell: (m) => formatMoney(m.expectedCash),
    },
    {
      key: "counted",
      excelHeader: "Counted Cash (৳)",
      pdfHeader: "Counted (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.countedCash,
      pdfCell: (m) => formatMoney(m.countedCash),
    },
    {
      key: "variance",
      excelHeader: "Variance (৳)",
      pdfHeader: "Variance (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (m) => m.differenceAmount,
      excelTotalValue: (t) => Number(t.sumDiff.toFixed(2)),
      pdfCell: (m) => {
        const varColor =
          m.differenceAmount < 0 ? REPORT_RGB.rose : REPORT_RGB.amber;
        return {
          content: formatVarianceStr(m.differenceAmount),
          styles: { fontStyle: "bold", textColor: varColor },
        };
      },
      pdfSummaryCell: (t) => ({
        content: formatVarianceStr(t.sumDiff),
        styles: { textColor: t.sumDiff < 0 ? REPORT_RGB.rose : REPORT_RGB.amber },
      }),
    },
    {
      key: "closedBy",
      excelHeader: "Closed By",
      pdfStyle: { halign: "left" },
      excelValue: (m) => m.closedBy || "-",
      pdfCell: (m) => m.closedBy || "-",
    },
    ...(includeStatusFallback
      ? [
          {
            key: "status",
            excelHeader: "Status",
            pdfStyle: { halign: "center" as const },
            excelValue: (m: NormalizedCashClosingMetrics) => m.status.toUpperCase(),
            pdfCell: (m: NormalizedCashClosingMetrics) => m.status.toUpperCase(),
          },
        ]
      : []),
    {
      key: "remarks",
      excelHeader: "Remarks",
      pdfStyle: { halign: "left" },
      excelValue: (m) => m.remarks || "-",
      pdfCell: (m) => m.remarks || "-",
    },
  ];
}

/**
 * Corporate Excel export specifically for Cash Closing Variance & Discrepancy Audit
 */
export async function exportCashClosingAuditExcel(
  records: CashClosingData[],
  meta: ReportCompanyMeta,
  options?: {
    selectedMonth?: string;
    selectedYear?: string;
    visibleColumns?: Record<string, boolean>;
  }
): Promise<number> {
  if (!records || records.length === 0) {
    throw new Error("No variance records available to export");
  }

  let sumDiff = 0;
  const metrics = records.map((item) => {
    const m = extractCashClosingMetrics(item);
    sumDiff += m.differenceAmount;
    return m;
  });

  const columns = buildCashClosingAuditColumns(!options?.visibleColumns);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    metrics,
    columns,
    { sumDiff },
    `TOTAL AUDIT (${records.length} Discrepancies)`,
    options?.visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Cash_Variance_Audit_${getCashClosingExportSuffix(options)}.xlsx`,
    sheetName: "Variance Audit",
    reportTitle: "Cash Closing Variance Audit Report",
    totalLabel: "Total Discrepancies",
    totalSummarySpan,
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
  options?: {
    selectedMonth?: string;
    selectedYear?: string;
    visibleColumns?: Record<string, boolean>;
  }
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error("No variance records available to download PDF");
  }

  let sumDiff = 0;
  let shortageCount = 0;
  let surplusCount = 0;

  const metrics = records.map((item) => {
    const m = extractCashClosingMetrics(item);
    sumDiff += m.differenceAmount;
    if (m.differenceAmount < 0) shortageCount += 1;
    else surplusCount += 1;
    return m;
  });

  const columns = buildCashClosingAuditColumns(!options?.visibleColumns);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    metrics,
    columns,
    { sumDiff },
    `TOTAL AUDIT (${records.length} Discrepancies)`,
    {
      visibleColumns: options?.visibleColumns,
      trailingSummaryLabel: `Shortage: ${shortageCount} | Surplus: ${surplusCount}`,
      trailingSummaryColor: REPORT_RGB.dark,
    }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Cash_Variance_Audit_${getCashClosingExportSuffix(options)}.pdf`,
    reportTitle: "Cash Closing Variance Audit Report",
    metaRightLabel: `Total Discrepancies: ${records.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}
