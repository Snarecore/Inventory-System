import type { RowInput, Styles, CellInput } from "jspdf-autotable";

const SUMMARY_FILL_RGB: [number, number, number] = [241, 245, 249];
const SUMMARY_DARK_RGB: [number, number, number] = [15, 23, 42];

export interface ExportColumnDef<TRow, TTotals = any> {
  /** Column key matching ColumnVisibilityDropdown (never "actions") */
  key: string;
  /** Column header in Excel export */
  excelHeader: string;
  /** Optional column header in PDF export (defaults to excelHeader) */
  pdfHeader?: string;
  /** True for leading identifier/metadata columns merged into the TOTAL SUMMARY label */
  isLeadingLabel?: boolean;
  /** PDF column style passed to jsPDF-AutoTable */
  pdfStyle?: Partial<Styles>;
  /** Value resolver for an Excel data row */
  excelValue: (row: TRow, index: number) => any;
  /** Value resolver for the Excel summary row */
  excelTotalValue?: (totals: TTotals) => any;
  /** Cell resolver for a PDF data row */
  pdfCell?: (row: TRow, index: number) => CellInput;
  /** Cell resolver for the PDF summary row (omit or return null for blank summary cell) */
  pdfSummaryCell?: (totals: TTotals) => {
    content: string | number;
    styles?: Partial<Styles>;
  } | null;
}

/**
 * Filters export column definitions against visibleColumns and strictly excludes "actions".
 */
export function filterExportColumns<TRow, TTotals>(
  columns: ExportColumnDef<TRow, TTotals>[],
  visibleColumns?: Record<string, boolean>
): ExportColumnDef<TRow, TTotals>[] {
  const active = columns.filter(
    (col) =>
      col.key !== "actions" &&
      (!visibleColumns || visibleColumns[col.key] !== false)
  );

  if (active.length === 0) {
    throw new Error("Please select at least one data column to export");
  }

  return active;
}

/**
 * Builds dynamically filtered Excel rows, total summary row, and merge span.
 */
export function buildDynamicExcelPayload<TRow, TTotals>(
  items: TRow[],
  columns: ExportColumnDef<TRow, TTotals>[],
  totals: TTotals,
  summaryLabel: string,
  visibleColumns?: Record<string, boolean>
): {
  rows: Record<string, any>[];
  totalRow?: Record<string, any>;
  totalSummarySpan: number;
} {
  const activeCols = filterExportColumns(columns, visibleColumns);

  const rows = items.map((item, idx) => {
    const record: Record<string, any> = {};
    activeCols.forEach((col) => {
      record[col.excelHeader] = col.excelValue(item, idx);
    });
    return record;
  });

  let leadingLabelSpan = 0;
  for (const col of activeCols) {
    if (col.isLeadingLabel) {
      leadingLabelSpan++;
    } else {
      break;
    }
  }

  const totalRow: Record<string, any> = {};
  let hasNonEmptyTotalMetric = false;

  activeCols.forEach((col, colIdx) => {
    if (leadingLabelSpan > 0 && colIdx === 0) {
      totalRow[col.excelHeader] = summaryLabel;
    } else if (colIdx < leadingLabelSpan) {
      totalRow[col.excelHeader] = "";
    } else if (col.excelTotalValue) {
      const val = col.excelTotalValue(totals);
      totalRow[col.excelHeader] = val ?? "";
      if (val !== undefined && val !== null && val !== "") {
        hasNonEmptyTotalMetric = true;
      }
    } else {
      totalRow[col.excelHeader] = "";
    }
  });

  if (leadingLabelSpan === 0 && !hasNonEmptyTotalMetric) {
    return {
      rows,
      totalRow: undefined,
      totalSummarySpan: 0,
    };
  }

  return {
    rows,
    totalRow,
    totalSummarySpan: leadingLabelSpan,
  };
}

/**
 * Builds dynamically filtered PDF headers, body rows (with summary row), and columnStyles.
 */
export function buildDynamicPdfPayload<TRow, TTotals>(
  items: TRow[],
  columns: ExportColumnDef<TRow, TTotals>[],
  totals: TTotals,
  summaryLabel: string,
  options?: {
    visibleColumns?: Record<string, boolean>;
    trailingSummaryLabel?: string;
    trailingSummaryColor?: [number, number, number];
    preserveFixedWidthsFromCount?: number;
  }
): {
  headers: string[];
  bodyRows: RowInput[];
  columnStyles: { [key: string]: Partial<Styles> };
} {
  const activeCols = filterExportColumns(columns, options?.visibleColumns);
  const headers = activeCols.map((col) => col.pdfHeader || col.excelHeader);

  const dataRows: RowInput[] = items.map((item, idx) =>
    activeCols.map((col) =>
      col.pdfCell ? col.pdfCell(item, idx) : String(col.excelValue(item, idx) ?? "")
    )
  );

  let leadingLabelSpan = 0;
  for (const col of activeCols) {
    if (col.isLeadingLabel) {
      leadingLabelSpan++;
    } else {
      break;
    }
  }

  const summaryCells: CellInput[] = [];
  if (leadingLabelSpan > 0) {
    summaryCells.push({
      content: summaryLabel,
      colSpan: leadingLabelSpan,
      styles: {
        halign: "center",
        fontStyle: "bold",
        fillColor: SUMMARY_FILL_RGB,
        textColor: SUMMARY_DARK_RGB,
      },
    });
  }

  let i = leadingLabelSpan;
  while (i < activeCols.length) {
    const col = activeCols[i];
    const rendered = col.pdfSummaryCell ? col.pdfSummaryCell(totals) : null;
    if (rendered) {
      summaryCells.push({
        content: rendered.content,
        styles: {
          halign: col.pdfStyle?.halign || "right",
          fontStyle: "bold",
          fillColor: SUMMARY_FILL_RGB,
          ...rendered.styles,
        },
      });
      i++;
    } else {
      let blankCount = 1;
      while (
        i + blankCount < activeCols.length &&
        !(activeCols[i + blankCount].pdfSummaryCell?.(totals))
      ) {
        blankCount++;
      }
      const isTrailingEnd = i + blankCount === activeCols.length;
      const isFullWidth = leadingLabelSpan === 0 && i === 0 && isTrailingEnd;
      const fallbackText = isTrailingEnd
        ? (blankCount >= 2 ? options?.trailingSummaryLabel : undefined) ||
          (isFullWidth ? summaryLabel : "")
        : "";

      summaryCells.push({
        content: fallbackText,
        ...(blankCount > 1 ? { colSpan: blankCount } : {}),
        styles: {
          halign: "center",
          fontStyle: "bold",
          fillColor: SUMMARY_FILL_RGB,
          ...(isTrailingEnd && options?.trailingSummaryColor
            ? { textColor: options.trailingSummaryColor }
            : { textColor: SUMMARY_DARK_RGB }),
        },
      });
      i += blankCount;
    }
  }

  const dropFixedWidth =
    options?.preserveFixedWidthsFromCount !== undefined &&
    activeCols.length < options.preserveFixedWidthsFromCount;

  const columnStyles: { [key: string]: Partial<Styles> } = {};
  activeCols.forEach((col, idx) => {
    if (col.pdfStyle) {
      if (dropFixedWidth && col.key !== "sl") {
        const { cellWidth: _ignored, ...rest } = col.pdfStyle;
        columnStyles[String(idx)] = rest;
      } else {
        columnStyles[String(idx)] = { ...col.pdfStyle };
      }
    }
  });

  return {
    headers,
    bodyRows: [...dataRows, summaryCells],
    columnStyles,
  };
}
