import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { BankAccountItem, MfsUserItem } from "@/types";

export type FinancialTransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type FinancialAccountType = "CASH" | "BANK" | "MFS";

export interface TenderLeg {
  accountType: FinancialAccountType;
  account: string;
  accountNumber: string | null;
}

export interface TradeTender {
  amount: number;
  leg: TenderLeg;
}

export interface FinancialTransactionPayload {
  accessUser: any;
  type: FinancialTransactionType;
  amount: number;
  categoryId: string;
  accountType: FinancialAccountType;
  collectionAmount: number;
  dueAmount: number;
  bill_ref: string;
  refNo: string;
  head: string;
  items: string;
  account: string;
  fromAccount?: string;
  toAccount?: string;
  notes: string;
  transactionDate: string;
  yearmonth: string;
  accountNumber: string | null;
  accountNumber2?: string | null;
  userType?: string;
  osType: "WEB";
}

export interface FinancialTransactionResult {
  ok: boolean;
  msg: string;
  billRef: string;
}

export interface PostTradeFinancialParams {
  tradeType: "INCOME" | "EXPENSE";
  tenders: TradeTender[];
  invoiceNo: string;
  refNo?: string;
  partyId?: string | number | null;
  head?: string;
  itemsSummary?: string;
  notes?: string;
  date?: string | Date;
  totalDue?: number;
}

/**
 * Formats date into "MMM-YYYY" (e.g. "Oct-2026") matching backend accounting convention.
 */
export const yearmonthOf = (when: Date): string => {
  return when.toLocaleString("en-US", { month: "short", year: "numeric" }).replace(" ", "-");
};

/**
 * Cash leg builder
 */
export const cashLeg = (): TenderLeg => ({
  accountType: "CASH",
  account: "Cash",
  accountNumber: null,
});

/**
 * Bank / Card leg builder
 */
export const bankLeg = (bank: BankAccountItem | any): TenderLeg => ({
  accountType: "BANK",
  account: "Bank",
  accountNumber: bank?.accountNo ? String(bank.accountNo) : null,
});

/**
 * MFS (bKash / Nagad / Rocket) leg builder
 */
export const mfsLeg = (wallet: MfsUserItem | any): TenderLeg => {
  const method = wallet?.mfsName || wallet?.method || "MFS";
  const holder = wallet?.mfsPhone || wallet?.mobileNo || wallet?.holder || "";
  const nameLabel = [method, holder].filter(Boolean).join(" - ") || "MFS";
  const numericId = wallet?.id !== undefined && wallet?.id !== null && wallet?.id !== ""
    ? String(wallet.id)
    : wallet?.mfsId ? String(wallet.mfsId) : null;

  return {
    accountType: "MFS",
    account: nameLabel,
    accountNumber: numericId,
  };
};

/**
 * Posts a single row to /insert-financial-transaction
 */
export const postSingleFinancialTransaction = async (
  payload: Omit<FinancialTransactionPayload, "accessUser" | "osType">
): Promise<FinancialTransactionResult> => {
  const endpoint = apiConfig.finance?.insertFinancialTransactionUrl || "insert-financial-transaction";
  const billRef = payload.bill_ref || `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

  try {
    const fullPayload: FinancialTransactionPayload = {
      ...payload,
      bill_ref: billRef,
      accessUser: buildAccessUser(),
      osType: "WEB",
    };

    const res: any = await postData({
      url: endpoint,
      body: fullPayload,
    });

    const isSuccess =
      res?.status === "Success" ||
      res?.success === true ||
      String(res?.status || "").toLowerCase() === "success";

    return {
      ok: isSuccess,
      msg: res?.msg || res?.message || (isSuccess ? "Success" : "Failed"),
      billRef,
    };
  } catch (error: any) {
    console.error(`Failed to post ${payload.type} financial ledger row:`, error);
    return {
      ok: false,
      msg: error?.message || "Ledger entry could not be saved",
      billRef,
    };
  }
};

/**
 * Composite helper for posting trade financial entries (Sales, Purchases, Returns).
 * Handles multi-tender splitting, sequential dispatching, and due attribution.
 */
export const postTradeFinancialEntries = async ({
  tradeType,
  tenders,
  invoiceNo,
  refNo,
  partyId,
  head,
  itemsSummary = "",
  notes = "",
  date,
  totalDue = 0,
}: PostTradeFinancialParams): Promise<{ allSucceeded: boolean; results: FinancialTransactionResult[] }> => {
  const activeTenders = tenders.filter((t) => Number(t.amount || 0) > 0);

  // If 100% Credit with 0 money collected/paid, no cash/bank balance movement occurs
  if (activeTenders.length === 0) {
    return { allSucceeded: true, results: [] };
  }

  const when = date ? new Date(date) : new Date();
  const validWhen = isNaN(when.getTime()) ? new Date() : when;
  const ym = yearmonthOf(validWhen);
  const isoDate = validWhen.toISOString();

  const cleanInvoiceNo = String(invoiceNo || "").trim();
  const cleanRefNo = String(refNo || cleanInvoiceNo).trim();
  const cleanPartyId = partyId !== undefined && partyId !== null && partyId !== 0 ? String(partyId) : "";
  const defaultHead = tradeType === "INCOME" ? "Sales" : "Purchase";
  const ledgerHead = head || defaultHead;

  const results: FinancialTransactionResult[] = [];

  // Sequential execution to avoid timestamp and bill_ref concurrency race conditions on backend
  for (let i = 0; i < activeTenders.length; i++) {
    const tender = activeTenders[i];
    const amount = Number(tender.amount.toFixed(2));
    // Due amount is carried only on the first tender entry to avoid duplicated due figures
    const rowDue = i === 0 ? Number(totalDue.toFixed(2)) : 0;
    const billRef = activeTenders.length > 1
      ? `${cleanInvoiceNo}-${tender.leg.accountType.toLowerCase()}-${i + 1}`
      : cleanInvoiceNo || `${Date.now()}`;

    const res = await postSingleFinancialTransaction({
      type: tradeType,
      amount,
      collectionAmount: amount,
      dueAmount: rowDue,
      categoryId: cleanPartyId,
      accountType: tender.leg.accountType,
      account: tender.leg.account,
      accountNumber: tender.leg.accountNumber,
      head: ledgerHead,
      items: itemsSummary,
      bill_ref: billRef,
      refNo: cleanRefNo,
      notes: notes.trim(),
      transactionDate: isoDate,
      yearmonth: ym,
    });

    results.push(res);
  }

  const allSucceeded = results.every((r) => r.ok);
  return { allSucceeded, results };
};
