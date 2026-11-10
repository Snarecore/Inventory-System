import type { PurchaseItem, PurchaseReturnItem, CategoryItem, ProductCategoryItem, BankAccountItem, MfsUserItem, EmployeeItem } from "@/types";
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";

export interface GenericExcelExportOptions {
  fileName?: string;
  sheetName?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessLogoUrl?: string;
  reportTitle?: string;
  startDate?: string;
  endDate?: string;
  themeColorHex?: string;
  includeSignatures?: boolean;
  totalLabel?: string;
  totalSummarySpan?: number;
}

export type ExportPurchasesOptions = GenericExcelExportOptions;
export type ExportSalesOptions = GenericExcelExportOptions;

/**
 * Extracts items count from purchase/sale object across all known schemas
 */
const getItemsCount = (p: any): number => {
  if (!p) return 0;
  const rawDetails = p.purchaseDetails || p.salesDetails || p.returnDetails;

  if (Array.isArray(rawDetails) && rawDetails.length > 0) {
    const uniqueKeys = new Set<string>();
    rawDetails.forEach((d: any) => {
      const k = String(
        d.productId ?? d.productCode ?? d.pcode ?? d.productName ?? ""
      )
        .trim()
        .toLowerCase();
      if (k) uniqueKeys.add(k);
    });
    return uniqueKeys.size > 0 ? uniqueKeys.size : rawDetails.length;
  }
  const explicitCount = Number(p.itemCount ?? p.totalItems ?? 0);
  return explicitCount > 0 ? explicitCount : 1;
};

/**
 * Resolves dynamic CSS variable color (e.g. --table-header-bg, --primary-color) into ExcelJS 8-char ARGB hex
 */
export function resolveThemeArgb(customHex?: string): string {
  const parseColor = (col: string): string | null => {
    const c = col.trim();
    if (c.startsWith("#")) {
      let hex = c.slice(1).toUpperCase();
      if (hex.length === 3) {
        hex = hex.split("").map((ch) => ch + ch).join("");
      }
      if (hex.length === 6) return `FF${hex}`;
      if (hex.length === 8) return hex;
    } else if (c.startsWith("rgb")) {
      const m = c.match(/\d+/g);
      if (m && m.length >= 3) {
        const r = Number(m[0]).toString(16).padStart(2, "0");
        const g = Number(m[1]).toString(16).padStart(2, "0");
        const b = Number(m[2]).toString(16).padStart(2, "0");
        return `FF${r}${g}${b}`.toUpperCase();
      }
    }
    return null;
  };

  if (customHex) {
    const parsed = parseColor(customHex);
    if (parsed) return parsed;
  }

  try {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const style = getComputedStyle(document.documentElement);
      const headerBg = style.getPropertyValue("--table-header-bg")?.trim();
      const primary = style.getPropertyValue("--primary-color")?.trim();
      const parsed =
        (headerBg && parseColor(headerBg)) || (primary && parseColor(primary));
      if (parsed) return parsed;
    }
  } catch {
    // Ignore in SSR
  }
  return "FF009FE3"; // Default Brand Blue
}

/**
 * Converts 8-char ARGB or 6-char hex to [R, G, B] tuple for jsPDF styling
 */
export function argbToRgbTuple(argb: string): [number, number, number] {
  const clean =
    argb.length === 8 ? argb.slice(2) : argb.replace("#", "").slice(0, 6);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [
    Number.isNaN(r) ? 0 : r,
    Number.isNaN(g) ? 159 : g,
    Number.isNaN(b) ? 227 : b,
  ];
}

/**
 * Convert 1-based column number to Excel column letter (1 -> A, 14 -> N, 27 -> AA)
 */
function colToLetter(colIdx: number): string {
  let temp = "";
  let col = colIdx;
  while (col > 0) {
    const rem = (col - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    col = Math.floor((col - 1) / 26);
  }
  return temp;
}

/**
 * Format date string to DD-MMM-YYYY (e.g. 10-NOV-2026) matching PDF
 */
export function formatReportDate(d?: string): string {
  if (!d) return "";
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mmm = months[parsed.getMonth()];
    const yyyy = parsed.getFullYear();
    return `${dd}-${mmm}-${yyyy}`;
  }
  return String(d).toUpperCase();
}

/**
 * Gracefully fetches logo image and converts to base64 for embedding in Excel/PDF
 */
export async function fetchLogoBase64(
  url?: string
): Promise<{ base64: string; extension: "png" | "jpeg" } | null> {
  if (!url) return null;
  try {
    if (url.startsWith("data:image/")) {
      const ext =
        url.includes("image/jpeg") || url.includes("image/jpg")
          ? "jpeg"
          : "png";
      const base64 = url.split(",")[1];
      return base64 ? { base64, extension: ext } : null;
    }

    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const mime = blob.type.toLowerCase();
    const extension: "png" | "jpeg" =
      mime.includes("jpeg") || mime.includes("jpg") ? "jpeg" : "png";
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = (reader.result as string) || "";
        const base64 = result.split(",")[1];
        resolve(base64 ? { base64, extension } : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not fetch logo for Excel export:", err);
    return null;
  }
}

/**
 * Senior Developer Standard: Dynamic Async ExcelJS Builder & File Generator.
 * Replicates the PDF report design in Excel with:
 * - Embedded Company Business Logo (top-left)
 * - Company Name, Address, Phone & Print Date (top-right)
 * - Centered Report Title & Date Range Meta Row
 * - Dynamic Global Primary Theme Color Table Header with white bold text
 * - Clean grid borders across all cells
 * - Auto number formatting (#,##0.00; - for zero)
 * - Highlighted Total Summary Row (rendered once at the bottom)
 * - Professional Signatures Row (Prepared By, Checked By, Authorized Signatory)
 * - Landscape A4 Print Setup (fit-to-page width)
 */
export async function buildAndDownloadExcel<T extends Record<string, any>>(
  rows: T[],
  totalRow?: Record<string, any>,
  options?: GenericExcelExportOptions
): Promise<void> {
  if (!rows || rows.length === 0) {
    throw new Error("No data available to export");
  }

  // Lazy-load ExcelJS on-demand with resilient ESM/UMD resolution
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
  workbook.creator = options?.businessName || "Cash Boi";
  workbook.created = new Date();

  const rawSheetName = options?.sheetName || "Report";
  const cleanSheetName =
    rawSheetName.replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Report";
  const worksheet = workbook.addWorksheet(cleanSheetName, {
    views: [{ showGridLines: true }],
  });

  const headers = Object.keys(rows[0]);
  const colCount = headers.length;
  const lastColLetter = colToLetter(colCount);
  const themeArgb = resolveThemeArgb(options?.themeColorHex);

  const isCorporateReport = Boolean(
    options?.reportTitle || options?.businessName || options?.businessLogoUrl
  );

  let currentExcelRow = 1;

  // ── Corporate Header Block ──
  if (isCorporateReport) {
    const logoData = await fetchLogoBase64(options?.businessLogoUrl);
    const startTextCol = logoData && colCount >= 4 ? 3 : 1;
    const rightSplitCol = Math.max(startTextCol + 1, colCount - 2);

    // Embed Logo image (spans approx A1:B2)
    if (logoData) {
      try {
        const imageId = workbook.addImage({
          base64: logoData.base64,
          extension: logoData.extension,
        });
        worksheet.addImage(imageId, {
          tl: { col: 0.15, row: 0.15 },
          ext: { width: 85, height: 34 },
          editAs: "oneCell",
        });
      } catch (err) {
        console.warn("Error embedding image into worksheet:", err);
      }
    }

    // Row 1: Company Name (Left) & Print Date (Right)
    const row1 = worksheet.getRow(1);
    row1.height = 20;

    worksheet.mergeCells(
      `${colToLetter(startTextCol)}1:${colToLetter(rightSplitCol - 1)}1`
    );
    const nameCell = worksheet.getCell(`${colToLetter(startTextCol)}1`);
    nameCell.value = options?.businessName || "Cash Boi Trade Ltd";
    nameCell.font = {
      name: "Calibri",
      size: 14,
      bold: true,
      color: { argb: "FF0F172A" },
    };
    nameCell.alignment = { vertical: "middle", horizontal: "left" };

    worksheet.mergeCells(`${colToLetter(rightSplitCol)}1:${lastColLetter}1`);
    const dateCell = worksheet.getCell(`${colToLetter(rightSplitCol)}1`);
    dateCell.value = `Print Date: ${formatReportDate(new Date().toISOString())}`;
    dateCell.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: "FF0F172A" },
    };
    dateCell.alignment = { vertical: "middle", horizontal: "right" };

    // Row 2: Company Address
    const row2 = worksheet.getRow(2);
    row2.height = 16;
    if (options?.businessAddress) {
      worksheet.mergeCells(`${colToLetter(startTextCol)}2:${lastColLetter}2`);
      const addrCell = worksheet.getCell(`${colToLetter(startTextCol)}2`);
      addrCell.value = options.businessAddress;
      addrCell.font = {
        name: "Calibri",
        size: 9.5,
        color: { argb: "FF475569" },
      };
      addrCell.alignment = { vertical: "middle", horizontal: "left" };
    }

    // Row 3: Centered Report Title
    const row3 = worksheet.getRow(3);
    row3.height = 20;
    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const titleCell = worksheet.getCell("A3");
    titleCell.value = (options?.reportTitle || "SALES REPORT").toUpperCase();
    titleCell.font = {
      name: "Calibri",
      size: 13,
      bold: true,
      color: { argb: "FF0F172A" },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    // Row 4: Date Period & Total Records Meta
    const row4 = worksheet.getRow(4);
    row4.height = 18;
    const metaSplit = Math.max(2, Math.floor(colCount * 0.65));

    const fromStr = options?.startDate
      ? formatReportDate(options.startDate)
      : "ALL";
    const toStr = options?.endDate
      ? formatReportDate(options.endDate)
      : formatReportDate(new Date().toISOString());

    worksheet.mergeCells(`A4:${colToLetter(metaSplit)}4`);
    const metaLeft = worksheet.getCell("A4");
    metaLeft.value = `From Date: ${fromStr}   To Date: ${toStr}`;
    metaLeft.font = {
      name: "Calibri",
      size: 9.5,
      bold: true,
      color: { argb: "FF334155" },
    };
    metaLeft.alignment = { vertical: "middle", horizontal: "left" };

    worksheet.mergeCells(`${colToLetter(metaSplit + 1)}4:${lastColLetter}4`);
    const metaRight = worksheet.getCell(`${colToLetter(metaSplit + 1)}4`);
    metaRight.value = `${options?.totalLabel || "Total Invoices"}: ${rows.length}`;
    metaRight.font = {
      name: "Calibri",
      size: 9.5,
      bold: true,
      color: { argb: "FF334155" },
    };
    metaRight.alignment = { vertical: "middle", horizontal: "right" };

    // Bottom border for meta row
    for (let c = 1; c <= colCount; c++) {
      const cell = worksheet.getCell(4, c);
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    }

    // Row 5: Blank compact spacer
    const row5 = worksheet.getRow(5);
    row5.height = 6;

    currentExcelRow = 6;
  }

  // ── Column Alignment Classifier ──
  const getColAlign = (h: string): "center" | "right" | "left" => {
    const headerLower = h.toLowerCase();
    if (
      /^(sl|items|method|status|type|system default|has card|app access)$/i.test(
        headerLower
      ) ||
      /date|phone/i.test(headerLower)
    ) {
      return "center";
    }
    if (
      /(৳|bdt|amount|total|subtotal|discount|vat|paid|due|balance|salary|revenue|value|delivery|transport|share|quantity|qty)/i.test(
        headerLower
      )
    ) {
      return "right";
    }
    return "left";
  };

  const isMoneyCol = (h: string): boolean => {
    return /(৳|bdt|amount|total|subtotal|discount|vat|paid|due|balance|salary|revenue|value|delivery|transport)/i.test(
      h
    );
  };

  // ── Table Header Row ──
  const headerRow = worksheet.getRow(currentExcelRow);
  headerRow.height = 24;

  for (let c = 1; c <= colCount; c++) {
    const h = headers[c - 1];
    const cell = headerRow.getCell(c);
    cell.value = h;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: themeArgb },
    };
    cell.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: getColAlign(h),
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      left: { style: "thin", color: { argb: "FF94A3B8" } },
      right: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "medium", color: { argb: "FF475569" } },
    };
  }

  currentExcelRow++;

  // ── Table Data Rows ──
  rows.forEach((rowObj: any, rIdx: number) => {
    const dataRow = worksheet.getRow(currentExcelRow);
    dataRow.height = 19;
    const isEven = rIdx % 2 === 1;

    for (let c = 1; c <= colCount; c++) {
      const h = headers[c - 1];
      const val = rowObj[h];
      const cell = dataRow.getCell(c);
      const align = getColAlign(h);

      // Borders
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      // Subtle zebra background
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" },
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: align,
      };

      // Cell Value & Number Formatting
      if (typeof val === "number") {
        cell.value = val;
        if (isMoneyCol(h)) {
          cell.numFmt = '#,##0.00;-#,##0.00;"-"';
        } else {
          cell.numFmt = "#,##0";
        }
      } else {
        cell.value = val !== undefined && val !== null ? String(val) : "";
      }

      // Semantic Font Styling (matching PDF)
      let fontColor = "FF0F172A";
      let isBold = false;

      if (
        h === "Order ID" ||
        h.includes("Grand Total") ||
        h === "Customer Name" ||
        h === "Supplier Name"
      ) {
        isBold = true;
      }

      if (h.includes("Paid") || h.includes("Deposit")) {
        isBold = true;
        fontColor = "FF047857"; // Emerald Green
      } else if (h.includes("Due") || h.includes("Expense")) {
        isBold = true;
        fontColor = Number(val) !== 0 ? "FFB91C1C" : "FF64748B"; // Rose Red / Gray
      } else if (h.includes("Variance")) {
        isBold = true;
        const nVal = Number(val);
        fontColor =
          nVal === 0 ? "FF047857" : nVal < 0 ? "FFB91C1C" : "FFD97706";
      } else if (h === "Status" || h === "Payment Status") {
        isBold = true;
        const statusUpper = String(val).toUpperCase();
        if (statusUpper === "PAID" || statusUpper === "CLOSED") {
          fontColor = "FF047857";
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFECFDF5" },
          };
        } else if (statusUpper === "PARTIAL" || statusUpper === "OPEN") {
          fontColor = "FFD97706";
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF3C7" },
          };
        } else if (statusUpper === "DUE" || statusUpper === "PENDING") {
          fontColor = "FFB91C1C";
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEF2F2" },
          };
        }
      }

      cell.font = {
        name: "Calibri",
        size: 9.5,
        bold: isBold,
        color: { argb: fontColor },
      };
    }

    currentExcelRow++;
  });

  // ── Total Summary Row (Appears Once on the Last Row) ──
  if (totalRow && Object.keys(totalRow).length > 0) {
    const summaryRow = worksheet.getRow(currentExcelRow);
    summaryRow.height = 24;

    const span = Math.min(options?.totalSummarySpan || 0, colCount);

    for (let c = 1; c <= colCount; c++) {
      const h = headers[c - 1];
      const val = totalRow[h];
      const cell = summaryRow.getCell(c);
      const align = getColAlign(h);

      if (typeof val === "number") {
        cell.value = val;
        if (isMoneyCol(h)) {
          cell.numFmt = '#,##0.00;-#,##0.00;"-"';
        } else {
          cell.numFmt = "#,##0";
        }
      } else {
        cell.value = val !== undefined && val !== null ? String(val) : "";
      }

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };

      cell.border = {
        top: { style: "medium", color: { argb: "FF64748B" } },
        bottom: { style: "double", color: { argb: "FF475569" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: c <= span ? "center" : align,
      };

      let fontColor = "FF0F172A";
      if (h.includes("Grand Total") || h.includes("Expected")) fontColor = themeArgb;
      else if (h.includes("Paid") || h.includes("Deposit")) fontColor = "FF047857";
      else if (h.includes("Due") || h.includes("Expense")) fontColor = "FFB91C1C";
      else if (h.includes("Variance")) {
        const nVal = Number(val);
        fontColor =
          nVal === 0 ? "FF047857" : nVal < 0 ? "FFB91C1C" : "FFD97706";
      }

      cell.font = {
        name: "Calibri",
        size: 10,
        bold: true,
        color: { argb: fontColor },
      };
    }

    // Merge leading label columns (e.g. SL to Phone)
    if (span > 1) {
      worksheet.mergeCells(
        `A${currentExcelRow}:${colToLetter(span)}${currentExcelRow}`
      );
    }

    currentExcelRow++;
  }

  // ── Signatures Section ──
  if (isCorporateReport || options?.includeSignatures) {
    currentExcelRow += 2; // Blank spacing
    const sigRow = worksheet.getRow(currentExcelRow);
    sigRow.height = 20;

    if (colCount >= 9) {
      const b1End = Math.max(2, Math.floor(colCount * 0.28));
      const b2Start = Math.floor(colCount * 0.42);
      const b2End = Math.floor(colCount * 0.65);
      const b3Start = Math.floor(colCount * 0.78);

      // Block 1: Prepared By
      worksheet.mergeCells(`B${currentExcelRow}:${colToLetter(b1End)}${currentExcelRow}`);
      const sig1 = worksheet.getCell("B" + currentExcelRow);
      sig1.value = "Prepared By";
      sig1.font = { name: "Calibri", size: 9.5, color: { argb: "FF475569" } };
      sig1.alignment = { vertical: "middle", horizontal: "center" };
      for (let c = 2; c <= b1End; c++) {
        worksheet.getCell(currentExcelRow, c).border = {
          top: { style: "thin", color: { argb: "FF94A3B8" } },
        };
      }

      // Block 2: Checked By
      worksheet.mergeCells(
        `${colToLetter(b2Start)}${currentExcelRow}:${colToLetter(b2End)}${currentExcelRow}`
      );
      const sig2 = worksheet.getCell(`${colToLetter(b2Start)}${currentExcelRow}`);
      sig2.value = "Checked By";
      sig2.font = { name: "Calibri", size: 9.5, color: { argb: "FF475569" } };
      sig2.alignment = { vertical: "middle", horizontal: "center" };
      for (let c = b2Start; c <= b2End; c++) {
        worksheet.getCell(currentExcelRow, c).border = {
          top: { style: "thin", color: { argb: "FF94A3B8" } },
        };
      }

      // Block 3: Authorized Signatory
      worksheet.mergeCells(
        `${colToLetter(b3Start)}${currentExcelRow}:${lastColLetter}${currentExcelRow}`
      );
      const sig3 = worksheet.getCell(`${colToLetter(b3Start)}${currentExcelRow}`);
      sig3.value = "Authorized Signatory";
      sig3.font = { name: "Calibri", size: 9.5, color: { argb: "FF475569" } };
      sig3.alignment = { vertical: "middle", horizontal: "center" };
      for (let c = b3Start; c <= colCount; c++) {
        worksheet.getCell(currentExcelRow, c).border = {
          top: { style: "thin", color: { argb: "FF94A3B8" } },
        };
      }
    } else if (colCount >= 4) {
      // Compact 2-signature layout for narrower tables
      worksheet.mergeCells(`A${currentExcelRow}:B${currentExcelRow}`);
      const sig1 = worksheet.getCell(`A${currentExcelRow}`);
      sig1.value = "Prepared By";
      sig1.font = { name: "Calibri", size: 9.5, color: { argb: "FF475569" } };
      sig1.alignment = { vertical: "middle", horizontal: "center" };
      for (let c = 1; c <= 2; c++) {
        worksheet.getCell(currentExcelRow, c).border = {
          top: { style: "thin", color: { argb: "FF94A3B8" } },
        };
      }

      worksheet.mergeCells(
        `${colToLetter(colCount - 1)}${currentExcelRow}:${lastColLetter}${currentExcelRow}`
      );
      const sig2 = worksheet.getCell(
        `${colToLetter(colCount - 1)}${currentExcelRow}`
      );
      sig2.value = "Authorized Signatory";
      sig2.font = { name: "Calibri", size: 9.5, color: { argb: "FF475569" } };
      sig2.alignment = { vertical: "middle", horizontal: "center" };
      for (let c = colCount - 1; c <= colCount; c++) {
        worksheet.getCell(currentExcelRow, c).border = {
          top: { style: "thin", color: { argb: "FF94A3B8" } },
        };
      }
    }
  }

  // ── Auto Calculate Column Widths Safely (Preserves Merged Header Cells) ──
  const spanCount = options?.totalSummarySpan || 0;
  headers.forEach((key, idx) => {
    let maxLen = key.length;
    rows.forEach((r: any) => {
      const v = r[key];
      if (v !== undefined && v !== null) {
        const l = String(v).length;
        if (l > maxLen) maxLen = l;
      }
    });

    if (
      totalRow &&
      idx >= spanCount &&
      totalRow[key] !== undefined &&
      totalRow[key] !== null
    ) {
      const l = String(totalRow[key]).length + 2;
      if (l > maxLen) maxLen = l;
    }

    const isMoney = isMoneyCol(key);
    let minW = 10;
    if (key === "SL") minW = 6;
    else if (key.includes("Order")) minW = 16;
    else if (key.includes("Date")) minW = 14;
    else if (key.includes("Customer") || key.includes("Name")) minW = 22;
    else if (key.includes("Phone")) minW = 15;
    else if (isMoney) minW = 15;

    worksheet.getColumn(idx + 1).width = Math.min(
      Math.max(maxLen + (isMoney ? 4 : 3), minW),
      38
    );
  });

  // ── Page Setup for Printing from Excel ──
  worksheet.pageSetup = {
    orientation: colCount > 6 ? "landscape" : "portrait",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  // ── Trigger Download in Browser ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = options?.fileName || "export.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Enterprise standard Excel export for Purchases
 */
export async function exportPurchasesToExcel(
  purchases: PurchaseItem[],
  options?: ExportPurchasesOptions
): Promise<void> {
  if (!purchases || purchases.length === 0) {
    throw new Error("No purchase data available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Purchases_Report_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Purchases";

  let sumGrandTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumItems = 0;

  const rows = purchases.map((item: any, index: number) => {
    const grandTotal = Number(item.grandTotal ?? item.totalAmount ?? 0);
    const paidAmount = Number(item.paidAmount ?? 0);
    const dueAmount = Number(item.dueAmount ?? 0);
    const itemsCount = getItemsCount(item);
    const discount = Number(item.discount ?? 0);
    const vat = Number(item.vat ?? 0);
    const transport = Number(item.transportCost ?? 0);

    sumGrandTotal += grandTotal;
    sumPaid += paidAmount;
    sumDue += dueAmount;
    sumItems += itemsCount;

    let status = "PAID";
    if (dueAmount > 0 && paidAmount > 0) status = "PARTIAL";
    else if (dueAmount > 0 && paidAmount === 0) status = "DUE";

    return {
      SL: index + 1,
      "Order ID": item.orderNo || "",
      "Purchase Date":
        item.purchaseDate || (item.createdAt ? item.createdAt.substring(0, 10) : ""),
      "Supplier Name": item.supplierName || "Direct Supplier",
      "Supplier Phone": item.supplierPhone || "",
      "Supplier Address": item.supplierAddress || "",
      "Items Count": itemsCount,
      "Subtotal (BDT)": Number(
        (item.totalAmount || grandTotal - vat - transport + discount).toFixed(2)
      ),
      "Discount (BDT)": discount,
      "VAT (BDT)": vat,
      "Transport (BDT)": transport,
      "Grand Total (BDT)": grandTotal,
      "Paid Amount (BDT)": paidAmount,
      "Due Amount (BDT)": dueAmount,
      "Payment Method": (item.paymentType || "CASH").toUpperCase(),
      "Payment Status": status,
      "Challan No": item.challanNo || "",
      "Vehicle No": item.vehicleNo || "",
      "Driver Name": item.driverName || "",
      Notes: item.note || "",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Order ID": `Total Invoices: ${purchases.length}`,
    "Purchase Date": "",
    "Supplier Name": "",
    "Supplier Phone": "",
    "Supplier Address": "",
    "Items Count": sumItems,
    "Subtotal (BDT)": "",
    "Discount (BDT)": "",
    "VAT (BDT)": "",
    "Transport (BDT)": "",
    "Grand Total (BDT)": Number(sumGrandTotal.toFixed(2)),
    "Paid Amount (BDT)": Number(sumPaid.toFixed(2)),
    "Due Amount (BDT)": Number(sumDue.toFixed(2)),
    "Payment Method": "",
    "Payment Status": "",
    "Challan No": "",
    "Vehicle No": "",
    "Driver Name": "",
    Notes: "",
  };

  await buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Enterprise standard Excel export for Sales Invoices / Orders.
 * Matches the PDF report design identically with:
 * - 14 standard columns matching PDF
 * - SL, Order ID, Date, Customer Name, Phone, Items, Subtotal (৳), Discount (৳), VAT (৳), Grand Total (৳), Paid (৳), Due (৳), Method, Status
 * - TOTAL SUMMARY row spanning first 5 columns with full totals
 * - Business Logo, Theme Color headers, and Signatures
 */
export async function exportSalesToExcel(
  sales: any[],
  options?: ExportSalesOptions
): Promise<void> {
  if (!sales || sales.length === 0) {
    throw new Error("No sales data available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Sales_Report_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Sales Report";

  let sumGrandTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;
  let sumSubtotal = 0;
  let sumDiscount = 0;
  let sumVat = 0;
  let sumItems = 0;

  const rows = sales.map((item: any, index: number) => {
    const gt = Number(item.grandTotal ?? item.grand_total ?? item.totalAmount ?? 0);
    const paid = Number(item.paidAmount ?? item.paid_amount ?? 0);
    const due = Number(item.dueAmount ?? item.due_amount ?? Math.max(0, gt - paid));
    const sub = Number(item.totalAmount ?? item.total_amount ?? gt);
    const disc = Number(item.discount ?? 0);
    const vat = Number(item.vat ?? 0);
    const pType = String(item.paymentType || item.payment_type || "CASH").toUpperCase();

    const details =
      item.salesDetails || item.saleDetails || item.details || item.items || [];
    const itemsCount =
      Array.isArray(details) && details.length > 0
        ? details.length
        : Number(item.itemsCount || getItemsCount(item) || 1);

    const status =
      due <= 0 && gt > 0 ? "PAID" : due > 0 && paid > 0 ? "PARTIAL" : "DUE";

    const dateStr =
      item.salesDate || item.date
        ? formatReportDate(item.salesDate || item.date)
        : "-";

    sumGrandTotal += gt;
    sumPaid += paid;
    sumDue += due;
    sumSubtotal += sub;
    sumDiscount += disc;
    sumVat += vat;
    sumItems += itemsCount;

    return {
      SL: index + 1,
      "Order ID": item.orderNo || item.invoiceNo || `ORD-${item.id || index + 1}`,
      Date: dateStr,
      "Customer Name": item.customerName || item.customer_name || "Walk-in Customer",
      Phone: item.customerPhone || item.customer_phone || "-",
      Items: itemsCount,
      "Subtotal (৳)": sub,
      "Discount (৳)": disc,
      "VAT (৳)": vat,
      "Grand Total (৳)": gt,
      "Paid (৳)": paid,
      "Due (৳)": due,
      Method: pType,
      Status: status,
    };
  });

  const totalRow = {
    SL: `TOTAL SUMMARY (${sales.length} Invoices)`,
    "Order ID": "",
    Date: "",
    "Customer Name": "",
    Phone: "",
    Items: sumItems,
    "Subtotal (৳)": Number(sumSubtotal.toFixed(2)),
    "Discount (৳)": Number(sumDiscount.toFixed(2)),
    "VAT (৳)": Number(sumVat.toFixed(2)),
    "Grand Total (৳)": Number(sumGrandTotal.toFixed(2)),
    "Paid (৳)": Number(sumPaid.toFixed(2)),
    "Due (৳)": Number(sumDue.toFixed(2)),
    Method: "",
    Status: "",
  };

  await buildAndDownloadExcel(rows, totalRow, {
    fileName,
    sheetName,
    reportTitle: options?.reportTitle || "Sales Report",
    businessName: options?.businessName,
    businessAddress: options?.businessAddress,
    businessPhone: options?.businessPhone,
    businessLogoUrl: options?.businessLogoUrl,
    startDate: options?.startDate,
    endDate: options?.endDate,
    totalLabel: "Total Invoices",
    totalSummarySpan: 5, // Merges SL through Phone (5 columns)
    includeSignatures: true,
  });
}

/**
 * Enterprise standard Excel export for Sales Returns
 */
export function exportSalesReturnToExcel(
  returns: any[],
  options?: { fileName?: string; sheetName?: string }
): void {
  if (!returns || returns.length === 0) {
    throw new Error("No sales return data available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Sales_Returns_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Sales Returns";

  let sumReturnAmount = 0;
  let sumRefundAmount = 0;
  let sumItems = 0;

  const rows = returns.map((item: any, index: number) => {
    const returnAmount = Number(item.returnTotalAmount ?? item.totalAmount ?? 0);
    const refundAmount = Number(item.refundAmount ?? returnAmount);
    const details = item.returnDetails || item.details || [];
    const itemsCount = details.length > 0 ? details.length : Number(item.itemsCount || 1);

    sumReturnAmount += returnAmount;
    sumRefundAmount += refundAmount;
    sumItems += itemsCount;

    return {
      SL: index + 1,
      "Order ID": item.orderNo || "",
      "Return No": item.returnNo || "",
      "Return Date": item.returnDate || todayStr,
      "Original Invoice": item.salesInvoiceNo || item.invoiceNo || "",
      "Customer Name": item.customerName || "Walk-in Customer",
      "Customer Phone": item.customerPhone || "",
      "Items Count": itemsCount,
      "Refund Channel": (item.paymentType || "CASH").toUpperCase(),
      "Return Value (BDT)": Number(returnAmount.toFixed(2)),
      "Refunded Amount (BDT)": Number(refundAmount.toFixed(2)),
      Status: (item.status || "COMPLETED").toUpperCase(),
      Remarks: item.note || item.remarks || "",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Order ID": `Total Returns: ${returns.length}`,
    "Return No": "",
    "Return Date": "",
    "Original Invoice": "",
    "Customer Name": "",
    "Customer Phone": "",
    "Items Count": sumItems,
    "Refund Channel": "",
    "Return Value (BDT)": Number(sumReturnAmount.toFixed(2)),
    "Refunded Amount (BDT)": Number(sumRefundAmount.toFixed(2)),
    Status: "",
    Remarks: "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Enterprise standard Excel export for Purchase Returns
 */
export function exportPurchaseReturnToExcel(
  returns: PurchaseReturnItem[],
  options?: { fileName?: string; sheetName?: string }
): void {
  if (!returns || returns.length === 0) {
    throw new Error("No purchase return data available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Purchase_Returns_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Purchase Returns";

  let sumReturnAmount = 0;
  let sumRefundAmount = 0;
  let sumItems = 0;

  const rows = returns.map((item: any, index: number) => {
    const returnAmount = Number(item.totalAmount ?? 0);
    const refundAmount = Number(item.refundAmount ?? returnAmount);
    const details = item.returnDetails ?? [];
    const itemsCount = details.length > 0 ? details.length : Number(item.itemsCount || 1);

    sumReturnAmount += returnAmount;
    sumRefundAmount += refundAmount;
    sumItems += itemsCount;

    return {
      SL: index + 1,
      "Order ID": item.orderNo || "",
      "Return No": item.returnNo || "",
      "Return Date": item.returnDate || todayStr,
      "Original Invoice": item.purchaseInvoiceNo || item.invoiceNo || "",
      "Supplier Name": item.supplierName || "Direct Supplier",
      "Supplier Phone": item.supplierPhone || "",
      "Items Count": itemsCount,
      "Refund Channel": (item.paymentType || "CASH").toUpperCase(),
      "Return Value (BDT)": Number(returnAmount.toFixed(2)),
      "Refunded Amount (BDT)": Number(refundAmount.toFixed(2)),
      Status: (item.status || "COMPLETED").toUpperCase(),
      Remarks: item.note || item.remarks || "",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Order ID": `Total Returns: ${returns.length}`,
    "Return No": "",
    "Return Date": "",
    "Original Invoice": "",
    "Supplier Name": "",
    "Supplier Phone": "",
    "Items Count": sumItems,
    "Refund Channel": "",
    "Return Value (BDT)": Number(sumReturnAmount.toFixed(2)),
    "Refunded Amount (BDT)": Number(sumRefundAmount.toFixed(2)),
    Status: "",
    Remarks: "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Enterprise standard Excel export for Categories
 */
export function exportCategoriesToExcel(
  categories: CategoryItem[],
  options?: GenericExcelExportOptions
): void {
  if (!categories || categories.length === 0) {
    throw new Error("No category records available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Expense_Income_Categories_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Categories";

  const rows = categories.map((item, index) => {
    return {
      SL: index + 1,
      "Category Name": item.categoryName || "",
      Type: normalizeCategoryType(item.type),
      Status: item.status || "Active",
      "System Default": isCategoryAdmin(item) ? "Yes" : "No",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Category Name": `Total Categories: ${categories.length}`,
    Type: "",
    Status: "",
    "System Default": "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Enterprise standard Excel export for Product Categories
 */
export function exportProductCategoriesToExcel(
  categories: ProductCategoryItem[],
  options?: GenericExcelExportOptions
): void {
  if (!categories || categories.length === 0) {
    throw new Error("No product category records available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Product_Categories_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Product Categories";

  const rows = categories.map((item, index) => {
    return {
      SL: index + 1,
      "Category Name": item.name || "",
      Description: item.description || "—",
      Status: item.status || "Active",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Category Name": `Total Categories: ${categories.length}`,
    Description: "",
    Status: "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Enterprise standard Excel export for Bank Accounts
 */
export function exportBankAccountsToExcel(
  bankAccounts: BankAccountItem[],
  options?: GenericExcelExportOptions
): void {
  if (!bankAccounts || bankAccounts.length === 0) {
    throw new Error("No bank account records available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Bank_Accounts_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Bank Accounts";

  let totalBalance = 0;

  const rows = bankAccounts.map((item, index) => {
    const bal = Number(item.currentBalance || 0);
    totalBalance += bal;

    return {
      SL: index + 1,
      "Bank Name": item.bankName || "—",
      "Account Name": item.bankAccountName || "—",
      "Account Number": item.accountNo || "—",
      Branch: item.branchName || "—",
      "Current Balance": bal,
      Status: item.status || "Active",
      "Has Card": item.hasCard ? "Yes" : "No",
      "Card Type": item.cardType ? item.cardType.toUpperCase() : "—",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Bank Name": `Total Accounts: ${bankAccounts.length}`,
    "Account Name": "",
    "Account Number": "",
    Branch: "",
    "Current Balance": totalBalance,
    Status: "",
    "Has Card": "",
    "Card Type": "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Senior Developer Standard: Export MFS Wallets to Excel
 */
export function exportMfsAccountsToExcel(
  mfsAccounts: MfsUserItem[],
  options?: GenericExcelExportOptions
): void {
  if (!mfsAccounts || mfsAccounts.length === 0) {
    throw new Error("No MFS account records available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `MFS_Accounts_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "MFS Accounts";

  let totalBalance = 0;

  const rows = mfsAccounts.map((item, index) => {
    const bal = Number(item.currentBalance || 0);
    totalBalance += bal;

    return {
      SL: index + 1,
      Provider: item.method || "—",
      "Account Name": item.name || "—",
      "Phone Number": item.phoneNumber || "—",
      "Opening Balance": Number(item.openingBalance || 0),
      "Current Balance": bal,
      Status: item.status || "Active",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    Provider: `Total Accounts: ${mfsAccounts.length}`,
    "Account Name": "",
    "Phone Number": "",
    "Opening Balance": "",
    "Current Balance": totalBalance,
    Status: "",
  };
  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}

/**
 * Senior Developer Standard: Export Employee Roster to Excel
 */
export function exportEmployeesToExcel(
  employees: EmployeeItem[],
  options?: GenericExcelExportOptions
): void {
  if (!employees || employees.length === 0) {
    throw new Error("No employee records available to export");
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const fileName = options?.fileName || `Employees_List_${todayStr}.xlsx`;
  const sheetName = options?.sheetName || "Employees";

  let totalSalary = 0;

  const rows = employees.map((emp, index) => {
    const salary = Number(emp.presentSalary || 0);
    totalSalary += salary;

    return {
      SL: index + 1,
      "Employee Code": emp.employeeCode || "—",
      "Full Name": emp.fullName || "—",
      "Phone Number": emp.phoneNumber || "—",
      Designation: emp.designation || "—",
      Department: emp.department || "—",
      "Employment Type": emp.employmentType || "FULL_TIME",
      "Joining Date": emp.dateOfJoining ? String(emp.dateOfJoining).slice(0, 10) : "—",
      "Present Salary": salary,
      Currency: emp.salaryCurrency || "BDT",
      "Work Location": emp.workLocation || "—",
      "App Access": emp.hasAppAccess ? "Enabled" : "Disabled",
      "App Username": emp.hasAppAccess ? emp.appUsername || emp.phoneNumber || "—" : "—",
      Status: emp.active !== false ? "Active" : "Inactive",
      "National ID": emp.nationalId || "—",
      Email: emp.email || "—",
      City: emp.city || "—",
      Address: emp.address || "—",
      "Emergency Contact": emp.emergencyContactName
        ? `${emp.emergencyContactName} (${emp.emergencyContactRelation || "Contact"}: ${emp.emergencyContactPhone || ""})`
        : "—",
    };
  });

  const totalRow = {
    SL: "TOTAL",
    "Employee Code": `Count: ${employees.length}`,
    "Full Name": "",
    "Phone Number": "",
    Designation: "",
    Department: "",
    "Employment Type": "",
    "Joining Date": "",
    "Present Salary": totalSalary,
    Currency: "BDT",
    "Work Location": "",
    "App Access": "",
    "App Username": "",
    Status: "",
    "National ID": "",
    Email: "",
    City: "",
    Address: "",
    "Emergency Contact": "",
  };

  buildAndDownloadExcel(rows, totalRow, { fileName, sheetName });
}
