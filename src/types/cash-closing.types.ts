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
  { value: "ENTRY_MISTAKE", label: "Data Entry Mistake" },
  { value: "CASH_SHORTAGE", label: "Cash Shortage" },
  { value: "CASH_SURPLUS", label: "Cash Surplus" },
  { value: "ROUNDING_DIFF", label: "Rounding Difference" },
  { value: "UNRECORDED_EXPENSE", label: "Unrecorded Expense" },
  { value: "UNRECORDED_INCOME", label: "Unrecorded Income" },
  { value: "OTHER", label: "Other" },
] as const;
