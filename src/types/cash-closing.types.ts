/**
 * Types and interfaces for Daily Cash Closing & Reconciliation
 */

export interface DenominationItem {
  denomination: number;
  quantity: number;
  amount: number;
}

export interface CashClosingData {
  id: number | null;
  closingDate: string;
  openingCash: number;
  todayDeposit: number;
  todayExpense: number;
  expectedCash: number;
  countedCash: number | null;
  differenceAmount: number | null;
  differenceReason: string;
  remarks: string;
  status: "Open" | "Closed" | string;
  denominations: DenominationItem[] | null;
  addedBy?: string | null;
  addedDate?: string | null;
  updatedBy?: string | null;
  updatedDate?: string | null;
}

export interface CashClosingResponse {
  status: "Success" | "Error" | string;
  msg: string;
  data: CashClosingData | null;
}

export interface CashClosingReportSummary {
  matchedDays: number;
  mismatchedDays: number;
  totalDiff: number;
}

export interface CashClosingReportData {
  month: string;
  summary: CashClosingReportSummary;
  history: CashClosingData[];
}

export interface CashClosingReportResponse {
  success?: boolean;
  status?: string;
  message?: string;
  msg?: string;
  data: CashClosingReportData | null;
}

export interface InsertCashClosingPayload {
  closingDate: string;
  openingCash: number;
  todayDeposit: number;
  todayExpense: number;
  expectedCash: number;
  countedCash: number;
  differenceAmount: number;
  differenceReason: string;
  remarks: string;
  status: "Closed";
  denominations: DenominationItem[];
}

export interface InsertCashClosingResponse {
  status: "Success" | "Error" | string;
  msg: string;
  data: CashClosingData | null;
}

export const BANGLADESH_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export const DIFFERENCE_REASONS = [
  { value: "ENTRY_MISTAKE", label: "Data Entry Mistake (ডাটা এন্ট্রি ভুল)" },
  { value: "CASH_SHORTAGE", label: "Cash Shortage (ক্যাশ ঘাটতি)" },
  { value: "CASH_SURPLUS", label: "Cash Surplus (উদ্বৃত্ত ক্যাশ)" },
  { value: "ROUNDING_DIFF", label: "Rounding Difference (রাউন্ডিং ব্যবধান)" },
  { value: "UNRECORDED_EXPENSE", label: "Unrecorded Expense (অনথিভুক্ত খরচ)" },
  { value: "UNRECORDED_INCOME", label: "Unrecorded Income (অনথিভুক্ত আয়)" },
  { value: "OTHER", label: "Other (অন্যান্য কারণ)" },
] as const;
