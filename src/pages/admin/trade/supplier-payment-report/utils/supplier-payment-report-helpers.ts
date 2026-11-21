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
  formatShortReportDate,
  generateAndDownloadCorporatePdf,
  isDateInReportRange,
  parseFlexibleReportDate,
} from "@/utils/trade-report-helpers";
import type {
  PaymentReportItem,
  SupplierDueItem,
  PaymentReceiptData,
  PaymentAllocation,
} from "@/types/payment.types";

export type PaymentReportTab = "vouchers" | "suppliers" | "dues";

export interface NormalizedPaymentRecord {
  id: string | number;
  voucherNo: string;
  paymentDate: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  paymentMode: string;
  cashPaid: number;
  digitalPaid: number;
  totalAmount: number;
  totalDiscount: number;
  billsCount: number;
  billsSummary: string;
  remark: string;
  receiptData: PaymentReceiptData;
}

export interface SupplierPaymentSummary {
  supplierKey: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  voucherCount: number;
  billsSettled: number;
  cashPaid: number;
  digitalPaid: number;
  totalDiscount: number;
  totalPaid: number;
  currentDue: number;
  lastPaymentDate: string;
}

export interface NormalizedSupplierDueRow {
  supplierKey: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierAddress: string;
  invoiceCount: number;
  lastPurchaseDate: string;
  totalDue: number;
}

export type SupplierStatementEventType =
  | "PURCHASE"
  | "PAYMENT"
  | "PURCHASE_RETURN"
  | "OPENING_BALANCE";

export interface SupplierStatementEntry {
  sl: number;
  rawDate: string;
  dateStr: string;
  timeStr: string;
  hasTime: boolean;
  type: SupplierStatementEventType;
  typeLabel: string;
  refNo: string;
  description: string;
  note?: string;
  paymentMode?: string;
  billAmount: number;     // Purchase / Bill (credit)
  paymentAmount: number;  // Payment / Return (debit)
  discountAmount?: number;
  runningBalance: number; // Net payable to supplier
  receiptData?: PaymentReceiptData;
  rawRecord?: any;
}

export interface SupplierStatementResult {
  supplier: SupplierPaymentSummary;
  entries: SupplierStatementEntry[];
  openingBalance: number;
  totalPurchases: number;
  totalPayments: number;
  totalReturns: number;
  totalDiscounts: number;
  closingBalance: number;
}

function getSupplierLookupKey(
  supplierId?: string | number | null,
  phone?: string | null,
  name?: string | null
): string {
  const idStr = String(supplierId ?? "").trim();
  if (idStr && idStr !== "0" && idStr !== "direct") return `id_${idStr}`;
  const phoneStr = String(phone ?? "").replace(/\s+/g, "").trim();
  if (phoneStr && phoneStr !== "-") return `ph_${phoneStr}`;
  return `name_${String(name || "Supplier").trim().toLowerCase()}`;
}

export function isSameSupplier(
  record: any,
  target: {
    supplierId?: string | number | null;
    supplierPhone?: string | null;
    supplierName?: string | null;
    supplierKey?: string | null;
  }
): boolean {
  if (!record || !target) return false;

  const targetId = String(target.supplierId ?? "").trim();
  const recId = String(
    record.supplierId ??
      record.supplier_id ??
      record.partyId ??
      record.party_id ??
      record.id ??
      ""
  ).trim();

  if (
    targetId &&
    recId &&
    targetId !== "0" &&
    targetId !== "direct" &&
    targetId === recId
  ) {
    return true;
  }

  const cleanPhone = (p?: any) => {
    const digits = String(p ?? "").replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : "";
  };

  const targetPhone = cleanPhone(target.supplierPhone);
  const recPhone = cleanPhone(
    record.supplierPhone ??
      record.supplier_phone ??
      record.phone ??
      record.partyPhone ??
      record.party_phone
  );

  if (targetPhone && recPhone && targetPhone === recPhone) {
    return true;
  }

  const cleanName = (n?: any) => String(n ?? "").toLowerCase().trim();
  const targetName = cleanName(target.supplierName);
  const recName = cleanName(
    record.supplierName ??
      record.supplier_name ??
      record.name ??
      record.partyName ??
      record.party_name ??
      record.supplier
  );

  if (
    targetName &&
    recName &&
    targetName === recName &&
    targetName !== "supplier" &&
    targetName !== "direct supplier"
  ) {
    return true;
  }

  return false;
}

/**
 * Normalizes payment report records and filters inclusively by date range.
 */
export function normalizePaymentReportRecords(
  rawList: PaymentReportItem[],
  startDate?: string,
  endDate?: string
): NormalizedPaymentRecord[] {
  if (!Array.isArray(rawList)) return [];

  const result: NormalizedPaymentRecord[] = [];

  rawList.forEach((item: any, idx: number) => {
    const rawDate =
      item.paymentDate ||
      item.date ||
      item.collectionDate ||
      item.addedDate ||
      item.createdAt ||
      "";
    if (!isDateInReportRange(rawDate, startDate, endDate)) return;

    const details: any[] = Array.isArray(item.paymentDetails)
      ? item.paymentDetails
      : Array.isArray(item.details)
      ? item.details
      : [];

    const voucherNo = String(
      item.paymentNo || item.voucherNo || item.id || `PAY-${idx + 1}`
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

    const supplierName = String(
      item.supplierName || item.customerName || item.name || "Supplier"
    ).trim();
    const supplierPhone = String(
      item.supplierPhone || item.customerPhone || item.phone || ""
    ).trim();

    const allocations = details.map((d: any) => ({
      invoiceNo: d.invoiceNo || "-",
      paidAmount: Number(d.paidAmount || 0),
      discountAmount: Number(d.discountAmount || d.discount || 0),
      dueAmount: Number(d.dueAmount || 0),
    }));

    const receiptData: PaymentReceiptData = {
      receiptNo: voucherNo,
      paymentDate: formatShortReportDate(rawDate, rawDate || "-"),
      supplierName,
      supplierPhone: supplierPhone || "-",
      supplierId: item.supplierId ?? item.id ?? "",
      totalAmount,
      totalDiscount,
      paymentMode,
      remark: item.remark || item.notes || "",
      cashAmount: item.cashAmount,
      bankAmount: item.bankAmount,
      mfsAmount: item.mfsAmount,
      bankDetails: item.bankDetails,
      mfsDetails: item.mfsDetails,
      allocations,
    };

    result.push({
      id: item.id || voucherNo || idx,
      voucherNo,
      paymentDate: rawDate,
      supplierId: String(item.supplierId ?? ""),
      supplierName,
      supplierPhone,
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
    const mA = parseFlexibleReportDate(a.paymentDate);
    const mB = parseFlexibleReportDate(b.paymentDate);
    return (mB ? mB.valueOf() : 0) - (mA ? mA.valueOf() : 0);
  });
}

/**
 * Enriches supplier due items with master party addresses and purchases due invoice counts.
 */
export function normalizeSupplierDueRows(
  suppliersDue: SupplierDueItem[],
  rawPartyData?: any,
  purchasesList?: any[]
): NormalizedSupplierDueRow[] {
  if (!Array.isArray(suppliersDue)) return [];

  const addressByKey = new Map<string, string>();
  let partyList: any[] = [];
  if (Array.isArray(rawPartyData)) partyList = rawPartyData;
  else if (rawPartyData && typeof rawPartyData === "object") {
    partyList =
      rawPartyData.supplierList ||
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
  const lastPurchaseDateById = new Map<string, string>();
  const lastPurchaseDateByPhone = new Map<string, string>();

  if (Array.isArray(purchasesList)) {
    purchasesList.forEach((p: any, idx: number) => {
      const sId = String(p.supplierId ?? p.supplier_id ?? "").trim();
      const sPhone = String(
        p.supplierPhone ?? p.supplier_phone ?? p.phone ?? ""
      ).trim();
      const rawDate = String(
        p.purchaseDate || p.date || p.createdAt || p.createdDate || ""
      ).trim();

      if (rawDate) {
        if (sId && (!lastPurchaseDateById.has(sId) || rawDate > (lastPurchaseDateById.get(sId) || ""))) {
          lastPurchaseDateById.set(sId, rawDate);
        }
        if (sPhone && (!lastPurchaseDateByPhone.has(sPhone) || rawDate > (lastPurchaseDateByPhone.get(sPhone) || ""))) {
          lastPurchaseDateByPhone.set(sPhone, rawDate);
        }
      }

      const due = Number(p.dueAmount ?? p.due_amount ?? 0);
      if (due <= 0) return;
      const invNo = String(p.invoiceNo || p.orderNo || p.id || `pur-${idx}`);

      if (sId) {
        if (!dueInvoicesById.has(sId)) dueInvoicesById.set(sId, new Set());
        dueInvoicesById.get(sId)!.add(invNo);
      }
      if (sPhone) {
        if (!dueInvoicesByPhone.has(sPhone)) {
          dueInvoicesByPhone.set(sPhone, new Set());
        }
        dueInvoicesByPhone.get(sPhone)!.add(invNo);
      }
    });
  }

  return suppliersDue
    .map((s, idx) => {
      const idStr = String(s.supplierId ?? s.id ?? idx);
      const phoneStr = String(s.supplierPhone ?? "").trim();
      const totalDue = Number(s.totalDue ?? s.dueAmount ?? s.due_amount ?? 0);
      const resolvedAddr =
        (s.supplierAddress && s.supplierAddress !== "-"
          ? s.supplierAddress
          : addressByKey.get(idStr) || addressByKey.get(phoneStr)) || "-";

      const matchedCount =
        dueInvoicesById.get(idStr)?.size ??
        (phoneStr ? dueInvoicesByPhone.get(phoneStr)?.size : undefined) ??
        0;
      const invoiceCount =
        matchedCount > 0
          ? matchedCount
          : Number(s.invoiceCount || 0) > 0
          ? Number(s.invoiceCount)
          : totalDue > 0
          ? 1
          : 0;

      const lastPurchaseDate =
        String(s.lastPurchaseDate || "") ||
        lastPurchaseDateById.get(idStr) ||
        (phoneStr ? lastPurchaseDateByPhone.get(phoneStr) : "") ||
        "";

      return {
        supplierKey: getSupplierLookupKey(idStr, phoneStr, s.supplierName),
        supplierId: idStr,
        supplierName: String(s.supplierName || "Supplier"),
        supplierPhone: phoneStr || "-",
        supplierAddress: resolvedAddr,
        invoiceCount,
        lastPurchaseDate,
        totalDue,
      };
    })
    .filter((row) => row.totalDue > 0);
}

export function computeSupplierPaymentReportKpis(
  payments: NormalizedPaymentRecord[],
  dueRows: NormalizedSupplierDueRow[]
): {
  totalPaid: number;
  totalDiscount: number;
  voucherCount: number;
  cashPaid: number;
  digitalPaid: number;
  avgPayment: number;
  totalOutstandingDue: number;
  dueSuppliersCount: number;
} {
  let totalPaid = 0;
  let totalDiscount = 0;
  let cashPaid = 0;
  let digitalPaid = 0;

  payments.forEach((p) => {
    totalPaid += p.totalAmount;
    totalDiscount += p.totalDiscount;
    cashPaid += p.cashPaid;
    digitalPaid += p.digitalPaid;
  });

  const totalOutstandingDue = dueRows.reduce((s, d) => s + d.totalDue, 0);

  return {
    totalPaid,
    totalDiscount,
    voucherCount: payments.length,
    cashPaid,
    digitalPaid,
    avgPayment: payments.length > 0 ? totalPaid / payments.length : 0,
    totalOutstandingDue,
    dueSuppliersCount: dueRows.length,
  };
}

export function aggregateSupplierPayments(
  payments: NormalizedPaymentRecord[],
  dueRows: NormalizedSupplierDueRow[]
): SupplierPaymentSummary[] {
  const dueLookup = new Map<string, number>();
  dueRows.forEach((d) => {
    dueLookup.set(d.supplierKey, d.totalDue);
  });

  const map = new Map<string, SupplierPaymentSummary>();

  payments.forEach((p) => {
    const key = getSupplierLookupKey(p.supplierId, p.supplierPhone, p.supplierName);

    if (!map.has(key)) {
      map.set(key, {
        supplierKey: key,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        supplierPhone: p.supplierPhone || "-",
        voucherCount: 0,
        billsSettled: 0,
        cashPaid: 0,
        digitalPaid: 0,
        totalDiscount: 0,
        totalPaid: 0,
        currentDue: dueLookup.get(key) || 0,
        lastPaymentDate: p.paymentDate,
      });
    }

    const summary = map.get(key)!;
    summary.voucherCount += 1;
    summary.billsSettled += p.billsCount;
    summary.cashPaid += p.cashPaid;
    summary.digitalPaid += p.digitalPaid;
    summary.totalDiscount += p.totalDiscount;
    summary.totalPaid += p.totalAmount;

    const currentM = parseFlexibleReportDate(p.paymentDate);
    const prevM = parseFlexibleReportDate(summary.lastPaymentDate);
    if (currentM && (!prevM || currentM.isAfter(prevM))) {
      summary.lastPaymentDate = p.paymentDate;
    }
  });

  // Ensure suppliers that only have due (no payments in selected range) can still be represented if needed
  dueRows.forEach((d) => {
    if (!map.has(d.supplierKey)) {
      map.set(d.supplierKey, {
        supplierKey: d.supplierKey,
        supplierId: d.supplierId,
        supplierName: d.supplierName,
        supplierPhone: d.supplierPhone,
        voucherCount: 0,
        billsSettled: 0,
        cashPaid: 0,
        digitalPaid: 0,
        totalDiscount: 0,
        totalPaid: 0,
        currentDue: d.totalDue,
        lastPaymentDate: "",
      });
    }
  });

  return Array.from(map.values());
}

/**
 * Builds chronological supplier statement ledger entries:
 * SL | Date | Description | Bill / Purchase (Debit) | Payment / Return (Credit) | Running Balance
 */
export function buildSupplierStatementEntries(
  supplier: SupplierPaymentSummary,
  allPayments: NormalizedPaymentRecord[],
  purchasesList: any[] = [],
  returnRecords: any[] = [],
  rawPartyData?: any,
  options?: {
    startDate?: string;
    endDate?: string;
  }
): SupplierStatementResult {
  let partyList: any[] = [];
  if (Array.isArray(rawPartyData)) partyList = rawPartyData;
  else if (rawPartyData && typeof rawPartyData === "object") {
    partyList =
      rawPartyData.supplierList ||
      rawPartyData.partyList ||
      rawPartyData.partyInfoList ||
      rawPartyData.data ||
      [];
  }

  const matchedParty = partyList.find((p) => isSameSupplier(p, supplier));
  const explicitOpeningBalance = Number(
    matchedParty?.openingBalance ?? matchedParty?.balance ?? 0
  );

  const matchedPayments = allPayments.filter((p) =>
    isSameSupplier(p, supplier)
  );

  const rawPurchases = Array.isArray(purchasesList) ? purchasesList : [];
  const matchedPurchases = rawPurchases.filter((p) => isSameSupplier(p, supplier));

  const rawReturns = Array.isArray(returnRecords) ? returnRecords : [];
  const matchedReturns = rawReturns.filter((r) => isSameSupplier(r, supplier));

  type UnsortedEntry = {
    sortMoment: moment.Moment;
    priority: number;
    rawDate: string;
    dateStr: string;
    timeStr: string;
    hasTime: boolean;
    type: SupplierStatementEventType;
    typeLabel: string;
    refNo: string;
    description: string;
    note?: string;
    paymentMode?: string;
    billAmount: number;
    paymentAmount: number;
    discountAmount?: number;
    receiptData?: PaymentReceiptData;
    rawRecord?: any;
  };

  const rawEntries: UnsortedEntry[] = [];

  // Track settled invoice numbers to avoid double-counting on-the-spot purchase payments
  const voucherSettledInvoices = new Set<string>();
  matchedPayments.forEach((p) => {
    if (Array.isArray(p.receiptData?.allocations)) {
      p.receiptData.allocations.forEach((a) => {
        const inv = String(a.invoiceNo || "").trim().toLowerCase();
        if (inv && inv !== "-") {
          voucherSettledInvoices.add(inv);
        }
      });
    }
    if (p.billsSummary && p.billsSummary !== "-") {
      p.billsSummary.split(",").forEach((s) => {
        const inv = s.trim().toLowerCase();
        if (inv && inv !== "-") {
          voucherSettledInvoices.add(inv);
        }
      });
    }
  });

  // 1. Purchases
  matchedPurchases.forEach((pur: any) => {
    const rawDate =
      pur.purchaseDate || pur.date || pur.createdAt || pur.createdDate || "";
    const m = parseFlexibleReportDate(rawDate) || moment(0);
    const invNo = pur.invoiceNo || pur.orderNo || pur.challanNo || "PUR";
    const grandTotal = Number(pur.grandTotal ?? pur.totalAmount ?? 0);
    const paidAtPurchase = Number(pur.paidAmount ?? pur.paid_amount ?? 0);

    rawEntries.push({
      sortMoment: m,
      priority: 1,
      rawDate,
      dateStr: formatShortReportDate(rawDate),
      timeStr: "",
      hasTime: false,
      type: "PURCHASE",
      typeLabel: "Purchase Bill",
      refNo: invNo,
      description: `Purchase Bill #${invNo}${
        pur.itemsCount ? ` (${pur.itemsCount} items)` : ""
      }`,
      note: pur.note || pur.remarks || "",
      billAmount: grandTotal,
      paymentAmount: 0,
      rawRecord: pur,
    });

    // If paid on the spot and not settled via a Payment voucher
    const isSettledByVoucher = voucherSettledInvoices.has(
      String(invNo).trim().toLowerCase()
    );
    if (paidAtPurchase > 0 && !isSettledByVoucher) {
      rawEntries.push({
        sortMoment: m,
        priority: 2,
        rawDate,
        dateStr: formatShortReportDate(rawDate),
        timeStr: "",
        hasTime: false,
        type: "PAYMENT",
        typeLabel: "Paid with Bill",
        refNo: invNo,
        description: `Direct Payment for Bill #${invNo}`,
        paymentMode: pur.paymentType || "Cash",
        billAmount: 0,
        paymentAmount: paidAtPurchase,
        rawRecord: pur,
      });
    }
  });

  // 2. Payments (Vouchers)
  matchedPayments.forEach((pay) => {
    const rawDate = pay.paymentDate;
    const m = parseFlexibleReportDate(rawDate) || moment(0);

    rawEntries.push({
      sortMoment: m,
      priority: 3,
      rawDate,
      dateStr: formatShortReportDate(rawDate),
      timeStr: "",
      hasTime: false,
      type: "PAYMENT",
      typeLabel: "Payment Voucher",
      refNo: pay.voucherNo,
      description:
        pay.billsSummary && pay.billsSummary !== "-"
          ? `Settled: ${pay.billsSummary}`
          : `Supplier Payment Voucher`,
      note: pay.remark !== "-" ? pay.remark : "",
      paymentMode: pay.paymentMode,
      billAmount: 0,
      paymentAmount: pay.totalAmount,
      discountAmount: pay.totalDiscount,
      receiptData: pay.receiptData,
      rawRecord: pay,
    });
  });

  // 3. Purchase Returns
  matchedReturns.forEach((ret: any) => {
    const rawDate = ret.returnDate || ret.createdAt || "";
    const m = parseFlexibleReportDate(rawDate) || moment(0);
    const retNo = ret.returnNo || ret.orderNo || "PR";
    const refund = Number(ret.refundAmount ?? ret.grandTotal ?? 0);

    rawEntries.push({
      sortMoment: m,
      priority: 4,
      rawDate,
      dateStr: formatShortReportDate(rawDate),
      timeStr: "",
      hasTime: false,
      type: "PURCHASE_RETURN",
      typeLabel: "Purchase Return",
      refNo: retNo,
      description: `Purchase Return #${retNo}${
        ret.itemsCount ? ` (${ret.itemsCount} items)` : ""
      }`,
      note: ret.reasonSummary || ret.reason || "",
      billAmount: 0,
      paymentAmount: refund,
      rawRecord: ret,
    });
  });

  // Sort strictly chronological (Oldest First)
  rawEntries.sort((a, b) => {
    const diff = a.sortMoment.valueOf() - b.sortMoment.valueOf();
    if (diff !== 0) return diff;
    return a.priority - b.priority;
  });

  // Calculate Running Balance
  // Running balance for supplier = Cumulative Bills - Cumulative Payments - Cumulative Returns - Cumulative Discounts
  let currentBalance = explicitOpeningBalance;
  let totalPurchases = 0;
  let totalPayments = 0;
  let totalReturns = 0;
  let totalDiscounts = 0;

  const entries: SupplierStatementEntry[] = rawEntries.map((item, idx) => {
    if (item.type === "PURCHASE") {
      totalPurchases += item.billAmount;
      currentBalance += item.billAmount;
    } else if (item.type === "PURCHASE_RETURN") {
      totalReturns += item.paymentAmount;
      currentBalance -= item.paymentAmount;
    } else if (item.type === "PAYMENT") {
      totalPayments += item.paymentAmount;
      currentBalance -= item.paymentAmount;
      if (item.discountAmount) {
        totalDiscounts += item.discountAmount;
        currentBalance -= item.discountAmount;
      }
    }

    return {
      sl: idx + 1,
      rawDate: item.rawDate,
      dateStr: item.dateStr,
      timeStr: item.timeStr,
      hasTime: item.hasTime,
      type: item.type,
      typeLabel: item.typeLabel,
      refNo: item.refNo,
      description: item.description,
      note: item.note,
      paymentMode: item.paymentMode,
      billAmount: item.billAmount,
      paymentAmount: item.paymentAmount,
      discountAmount: item.discountAmount,
      runningBalance: currentBalance,
      receiptData: item.receiptData,
      rawRecord: item.rawRecord,
    };
  });

  // Optional date filtering
  let finalEntries = entries;
  if (options?.startDate || options?.endDate) {
    finalEntries = entries.filter((e) =>
      isDateInReportRange(e.rawDate, options.startDate, options.endDate)
    );
  }

  return {
    supplier,
    entries: finalEntries,
    openingBalance: explicitOpeningBalance,
    totalPurchases,
    totalPayments,
    totalReturns,
    totalDiscounts,
    closingBalance: currentBalance,
  };
}

// ============================================================================
// Tab 1 Export: Payment Vouchers Excel & PDF
// ============================================================================

function buildPaymentVoucherColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<
  NormalizedPaymentRecord,
  { sumDiscount: number; sumPaid: number }
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
      key: "paymentDate",
      excelHeader: "Payment Date",
      pdfHeader: "Date",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => formatShortReportDate(r.paymentDate),
      pdfCell: (r) => formatShortReportDate(r.paymentDate),
    },
    {
      key: "voucherNo",
      excelHeader: "Voucher No",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (r) => r.voucherNo,
      pdfCell: (r) => ({ content: r.voucherNo, styles: { fontStyle: "bold" } }),
    },
    {
      key: "supplier",
      excelHeader: "Supplier Name",
      pdfHeader: "Supplier",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (r) => r.supplierName,
      pdfCell: (r) => ({ content: r.supplierName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (r) => r.supplierPhone || "-",
      pdfCell: (r) => r.supplierPhone || "-",
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
      key: "paid",
      excelHeader: "Paid Amount (BDT)",
      pdfHeader: "Paid (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (r) => Number(r.totalAmount.toFixed(2)),
      excelTotalValue: (t) => Number(t.sumPaid.toFixed(2)),
      pdfCell: (r) => ({
        content: formatMoney(r.totalAmount),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.sumPaid),
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

export async function exportPaymentVouchersExcel(
  records: NormalizedPaymentRecord[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!records || records.length === 0) {
    throw new Error("No payment records available to export");
  }

  const totals = records.reduce(
    (acc, r) => {
      acc.sumDiscount += r.totalDiscount;
      acc.sumPaid += r.totalAmount;
      return acc;
    },
    { sumDiscount: 0, sumPaid: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildPaymentVoucherColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    records,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Vouchers)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Supplier_Payment_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Payment History",
    reportTitle: "Supplier Payment Report",
    totalLabel: "Total Vouchers",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadPaymentVouchersPdf(
  records: NormalizedPaymentRecord[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error("No payment records available to download PDF");
  }

  const totals = records.reduce(
    (acc, r) => {
      acc.sumDiscount += r.totalDiscount;
      acc.sumPaid += r.totalAmount;
      return acc;
    },
    { sumDiscount: 0, sumPaid: 0 }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildPaymentVoucherColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    records,
    columns,
    totals,
    `TOTAL SUMMARY (${records.length} Vouchers)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Supplier_Payment_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Supplier Payment Report",
    metaRightLabel: `Total Vouchers: ${records.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Tab 2 Export: Supplier-Wise Payments Excel & PDF
// ============================================================================

function buildSupplierPaymentSummaryColumns(
  themeRgb: [number, number, number]
): ExportColumnDef<
  SupplierPaymentSummary,
  {
    vouchers: number;
    bills: number;
    cash: number;
    digital: number;
    discount: number;
    paid: number;
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
      key: "supplierName",
      excelHeader: "Supplier Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (s) => s.supplierName,
      pdfCell: (s) => ({ content: s.supplierName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (s) => s.supplierPhone,
      pdfCell: (s) => s.supplierPhone,
    },
    {
      key: "voucherCount",
      excelHeader: "Vouchers",
      pdfStyle: { halign: "center" },
      excelValue: (s) => s.voucherCount,
      excelTotalValue: (t) => t.vouchers,
      pdfCell: (s) => s.voucherCount,
      pdfSummaryCell: (t) => ({
        content: t.vouchers,
        styles: { halign: "center" },
      }),
    },
    {
      key: "billsSettled",
      excelHeader: "Bills Settled",
      pdfStyle: { halign: "center" },
      excelValue: (s) => s.billsSettled,
      excelTotalValue: (t) => t.bills,
      pdfCell: (s) => s.billsSettled,
      pdfSummaryCell: (t) => ({
        content: t.bills,
        styles: { halign: "center" },
      }),
    },
    {
      key: "cashPaid",
      excelHeader: "Cash Paid (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (s) => Number(s.cashPaid.toFixed(2)),
      excelTotalValue: (t) => Number(t.cash.toFixed(2)),
      pdfCell: (s) => formatMoney(s.cashPaid),
      pdfSummaryCell: (t) => ({ content: formatMoney(t.cash) }),
    },
    {
      key: "digitalPaid",
      excelHeader: "Bank / MFS (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (s) => Number(s.digitalPaid.toFixed(2)),
      excelTotalValue: (t) => Number(t.digital.toFixed(2)),
      pdfCell: (s) =>
        s.digitalPaid > 0 ? formatMoney(s.digitalPaid) : "-",
      pdfSummaryCell: (t) => ({
        content: t.digital > 0 ? formatMoney(t.digital) : "-",
      }),
    },
    {
      key: "totalDiscount",
      excelHeader: "Discount (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (s) => Number(s.totalDiscount.toFixed(2)),
      excelTotalValue: (t) => Number(t.discount.toFixed(2)),
      pdfCell: (s) =>
        s.totalDiscount > 0 ? formatMoney(s.totalDiscount) : "-",
      pdfSummaryCell: (t) => ({
        content: t.discount > 0 ? formatMoney(t.discount) : "-",
      }),
    },
    {
      key: "totalPaid",
      excelHeader: "Total Paid (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (s) => Number(s.totalPaid.toFixed(2)),
      excelTotalValue: (t) => Number(t.paid.toFixed(2)),
      pdfCell: (s) => ({
        content: formatMoney(s.totalPaid),
        styles: { fontStyle: "bold", textColor: REPORT_RGB.emerald },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.paid),
        styles: { textColor: themeRgb },
      }),
    },
    {
      key: "currentDue",
      excelHeader: "Remaining Due (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (s) => Number(s.currentDue.toFixed(2)),
      excelTotalValue: (t) => Number(t.due.toFixed(2)),
      pdfCell: (s) => ({
        content: s.currentDue > 0 ? formatMoney(s.currentDue) : "0.00",
        styles: {
          fontStyle: "bold",
          textColor: s.currentDue > 0 ? REPORT_RGB.rose : REPORT_RGB.muted,
        },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.due),
        styles: { textColor: REPORT_RGB.rose },
      }),
    },
    {
      key: "lastPaymentDate",
      excelHeader: "Last Payment Date",
      pdfStyle: { halign: "center" },
      excelValue: (s) =>
        s.lastPaymentDate ? formatShortReportDate(s.lastPaymentDate) : "-",
      pdfCell: (s) =>
        s.lastPaymentDate ? formatShortReportDate(s.lastPaymentDate) : "-",
    },
  ];
}

export async function exportSupplierPaymentSummaryExcel(
  summaries: SupplierPaymentSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!summaries || summaries.length === 0) {
    throw new Error("No supplier payment records available to export");
  }

  const totals = summaries.reduce(
    (acc, s) => {
      acc.vouchers += s.voucherCount;
      acc.bills += s.billsSettled;
      acc.cash += s.cashPaid;
      acc.digital += s.digitalPaid;
      acc.discount += s.totalDiscount;
      acc.paid += s.totalPaid;
      acc.due += s.currentDue;
      return acc;
    },
    {
      vouchers: 0,
      bills: 0,
      cash: 0,
      digital: 0,
      discount: 0,
      paid: 0,
      due: 0,
    }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildSupplierPaymentSummaryColumns(themeRgb);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    summaries,
    columns,
    totals,
    `TOTAL SUMMARY (${summaries.length} Suppliers)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Supplier_Payment_Summary_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Supplier Summary",
    reportTitle: "Supplier-Wise Payment Summary",
    totalLabel: "Total Suppliers",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadSupplierPaymentSummaryPdf(
  summaries: SupplierPaymentSummary[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!summaries || summaries.length === 0) {
    throw new Error("No supplier payment records available to download PDF");
  }

  const totals = summaries.reduce(
    (acc, s) => {
      acc.vouchers += s.voucherCount;
      acc.bills += s.billsSettled;
      acc.cash += s.cashPaid;
      acc.digital += s.digitalPaid;
      acc.discount += s.totalDiscount;
      acc.paid += s.totalPaid;
      acc.due += s.currentDue;
      return acc;
    },
    {
      vouchers: 0,
      bills: 0,
      cash: 0,
      digital: 0,
      discount: 0,
      paid: 0,
      due: 0,
    }
  );

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns = buildSupplierPaymentSummaryColumns(themeRgb);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    summaries,
    columns,
    totals,
    `TOTAL SUMMARY (${summaries.length} Suppliers)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Supplier_Payment_Summary_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Supplier-Wise Payment Summary",
    metaRightLabel: `Total Suppliers: ${summaries.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Tab 3 Export: Outstanding Dues Excel & PDF
// ============================================================================

function buildSupplierDueReportColumns(
  grandTotalDue: number
): ExportColumnDef<
  NormalizedSupplierDueRow,
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
      key: "supplierName",
      excelHeader: "Supplier Name",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (d) => d.supplierName,
      pdfCell: (d) => ({ content: d.supplierName, styles: { fontStyle: "bold" } }),
    },
    {
      key: "phone",
      excelHeader: "Phone",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (d) => d.supplierPhone,
      pdfCell: (d) => d.supplierPhone,
    },
    {
      key: "address",
      excelHeader: "Address",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (d) => d.supplierAddress,
      pdfCell: (d) => d.supplierAddress,
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
      key: "lastPurchaseDate",
      excelHeader: "Last Purchase Date",
      pdfStyle: { halign: "center" },
      excelValue: (d) => formatShortReportDate(d.lastPurchaseDate),
      pdfCell: (d) => formatShortReportDate(d.lastPurchaseDate),
    },
    {
      key: "totalDue",
      excelHeader: "Outstanding (BDT)",
      pdfHeader: "Outstanding (BDT)",
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

export async function exportSupplierDueReportExcel(
  dueRows: NormalizedSupplierDueRow[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<number> {
  if (!dueRows || dueRows.length === 0) {
    throw new Error("No supplier due records available to export");
  }

  const totals = dueRows.reduce(
    (acc, d) => {
      acc.totalInvoices += d.invoiceCount;
      acc.totalDue += d.totalDue;
      return acc;
    },
    { totalInvoices: 0, totalDue: 0 }
  );

  const columns = buildSupplierDueReportColumns(totals.totalDue);
  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    dueRows,
    columns,
    totals,
    `TOTAL PAYABLE (${dueRows.length} Suppliers)`,
    visibleColumns
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Supplier_Outstanding_Due_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Supplier Dues",
    reportTitle: "Supplier Outstanding Due Report",
    totalLabel: "Total Suppliers",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadSupplierDueReportPdf(
  dueRows: NormalizedSupplierDueRow[],
  meta: ReportCompanyMeta,
  visibleColumns?: Record<string, boolean>
): Promise<void> {
  if (!dueRows || dueRows.length === 0) {
    throw new Error("No supplier due records available to download PDF");
  }

  const totals = dueRows.reduce(
    (acc, d) => {
      acc.totalInvoices += d.invoiceCount;
      acc.totalDue += d.totalDue;
      return acc;
    },
    { totalInvoices: 0, totalDue: 0 }
  );

  const columns = buildSupplierDueReportColumns(totals.totalDue);
  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    dueRows,
    columns,
    totals,
    `TOTAL PAYABLE (${dueRows.length} Suppliers)`,
    { visibleColumns }
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Supplier_Outstanding_Due_Report_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: "Supplier Outstanding Due Report",
    metaRightLabel: `Total Due Suppliers: ${dueRows.length}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}

// ============================================================================
// Statement Export: Single Supplier Statement Excel & PDF
// ============================================================================

export async function exportSupplierStatementExcel(
  statement: SupplierStatementResult,
  meta: ReportCompanyMeta
): Promise<number> {
  const { supplier, entries } = statement;
  if (!entries || entries.length === 0) {
    throw new Error("No statement records available for this supplier");
  }

  const columns: ExportColumnDef<
    SupplierStatementEntry,
    { totalBills: number; totalPayments: number; closingBalance: number }
  >[] = [
    {
      key: "sl",
      excelHeader: "SL",
      isLeadingLabel: true,
      excelValue: (_, idx) => idx + 1,
    },
    {
      key: "date",
      excelHeader: "Date",
      isLeadingLabel: true,
      excelValue: (e) => e.dateStr,
    },
    {
      key: "type",
      excelHeader: "Transaction Type",
      isLeadingLabel: true,
      excelValue: (e) => e.typeLabel,
    },
    {
      key: "refNo",
      excelHeader: "Ref / Voucher No",
      isLeadingLabel: true,
      excelValue: (e) => e.refNo,
    },
    {
      key: "description",
      excelHeader: "Description",
      isLeadingLabel: true,
      excelValue: (e) => e.description,
    },
    {
      key: "billAmount",
      excelHeader: "Purchase Bill (BDT)",
      excelValue: (e) => (e.billAmount > 0 ? Number(e.billAmount.toFixed(2)) : 0),
      excelTotalValue: (t) => Number(t.totalBills.toFixed(2)),
    },
    {
      key: "paymentAmount",
      excelHeader: "Payment / Return (BDT)",
      excelValue: (e) =>
        e.paymentAmount > 0 ? Number(e.paymentAmount.toFixed(2)) : 0,
      excelTotalValue: (t) => Number(t.totalPayments.toFixed(2)),
    },
    {
      key: "runningBalance",
      excelHeader: "Running Balance (BDT)",
      excelValue: (e) => Number(e.runningBalance.toFixed(2)),
      excelTotalValue: (t) => Number(t.closingBalance.toFixed(2)),
    },
  ];

  const totals = {
    totalBills: statement.totalPurchases,
    totalPayments: statement.totalPayments + statement.totalReturns,
    closingBalance: statement.closingBalance,
  };

  const { rows, totalRow, totalSummarySpan } = buildDynamicExcelPayload(
    entries,
    columns,
    totals,
    `TOTAL LEDGER SUMMARY`
  );

  await buildAndDownloadExcel(rows, totalRow, {
    ...meta,
    fileName: `Supplier_Statement_${supplier.supplierName.replace(/\s+/g, "_")}_${moment().format("YYYY-MM-DD")}.xlsx`,
    sheetName: "Supplier Statement",
    reportTitle: `Supplier Statement: ${supplier.supplierName} (${supplier.supplierPhone})`,
    totalLabel: "Closing Balance",
    totalSummarySpan,
    includeSignatures: true,
  });

  return rows.length;
}

export async function downloadSupplierStatementPdf(
  statement: SupplierStatementResult,
  meta: ReportCompanyMeta
): Promise<void> {
  const { supplier, entries } = statement;
  if (!entries || entries.length === 0) {
    throw new Error("No statement records available for this supplier");
  }

  const themeRgb = argbToRgbTuple(resolveThemeArgb());
  const columns: ExportColumnDef<
    SupplierStatementEntry,
    { totalBills: number; totalPayments: number; closingBalance: number }
  >[] = [
    {
      key: "sl",
      excelHeader: "SL",
      pdfHeader: "SL",
      isLeadingLabel: true,
      pdfStyle: { halign: "center", cellWidth: 10 },
      excelValue: (_, idx) => idx + 1,
      pdfCell: (_, idx) => idx + 1,
    },
    {
      key: "date",
      excelHeader: "Date",
      pdfHeader: "Date",
      isLeadingLabel: true,
      pdfStyle: { halign: "center" },
      excelValue: (e) => e.dateStr,
      pdfCell: (e) => e.dateStr,
    },
    {
      key: "type",
      excelHeader: "Type",
      pdfHeader: "Type",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (e) => e.typeLabel,
      pdfCell: (e) => e.typeLabel,
    },
    {
      key: "refNo",
      excelHeader: "Ref / Voucher",
      pdfHeader: "Ref / Voucher",
      isLeadingLabel: true,
      pdfStyle: { halign: "left", fontStyle: "bold" },
      excelValue: (e) => e.refNo,
      pdfCell: (e) => ({ content: e.refNo, styles: { fontStyle: "bold" } }),
    },
    {
      key: "description",
      excelHeader: "Description",
      pdfHeader: "Description",
      isLeadingLabel: true,
      pdfStyle: { halign: "left" },
      excelValue: (e) => e.description,
      pdfCell: (e) => e.description,
    },
    {
      key: "billAmount",
      excelHeader: "Bill (BDT)",
      pdfHeader: "Bill (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (e) => e.billAmount,
      excelTotalValue: (t) => t.totalBills,
      pdfCell: (e) => (e.billAmount > 0 ? formatMoney(e.billAmount) : "-"),
      pdfSummaryCell: (t) => ({ content: formatMoney(t.totalBills) }),
    },
    {
      key: "paymentAmount",
      excelHeader: "Payment (BDT)",
      pdfHeader: "Payment (BDT)",
      pdfStyle: { halign: "right" },
      excelValue: (e) => e.paymentAmount,
      excelTotalValue: (t) => t.totalPayments,
      pdfCell: (e) => (e.paymentAmount > 0 ? formatMoney(e.paymentAmount) : "-"),
      pdfSummaryCell: (t) => ({ content: formatMoney(t.totalPayments) }),
    },
    {
      key: "runningBalance",
      excelHeader: "Balance (BDT)",
      pdfHeader: "Balance (BDT)",
      pdfStyle: { halign: "right", fontStyle: "bold" },
      excelValue: (e) => e.runningBalance,
      excelTotalValue: (t) => t.closingBalance,
      pdfCell: (e) => ({
        content: formatMoney(e.runningBalance),
        styles: {
          fontStyle: "bold",
          textColor: e.runningBalance > 0 ? REPORT_RGB.rose : REPORT_RGB.emerald,
        },
      }),
      pdfSummaryCell: (t) => ({
        content: formatMoney(t.closingBalance),
        styles: { textColor: themeRgb },
      }),
    },
  ];

  const totals = {
    totalBills: statement.totalPurchases,
    totalPayments: statement.totalPayments + statement.totalReturns,
    closingBalance: statement.closingBalance,
  };

  const { headers, bodyRows, columnStyles } = buildDynamicPdfPayload(
    entries,
    columns,
    totals,
    `TOTAL LEDGER SUMMARY`
  );

  await generateAndDownloadCorporatePdf({
    fileName: `Supplier_Statement_${supplier.supplierName.replace(/\s+/g, "_")}_${moment().format("YYYY-MM-DD")}.pdf`,
    reportTitle: `Supplier Statement: ${supplier.supplierName}`,
    metaRightLabel: `Phone: ${supplier.supplierPhone || "N/A"} | Net Due: ৳ ${formatMoney(statement.closingBalance)}`,
    headers,
    bodyRows,
    columnStyles,
    meta,
  });
}
