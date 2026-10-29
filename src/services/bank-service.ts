import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  BankAccountItem,
  BankNameItem,
  BankInfoListResponse,
  BankNameListResponse,
  InsertBankAccountPayload,
  UpdateBankAccountPayload,
  BankAccountActionResponse,
} from "@/types";

/**
 * Formats a local date/time into naive ISO "YYYY-MM-DDTHH:mm:ss.SSS"
 * Prevents timezone offset shifts (Bangladesh UTC+6) from altering the transaction date.
 */
export const toNaiveIso = (date: Date | string): string => {
  if (!date) return "";
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (trimmed.includes("T")) {
      return trimmed.replace(/Z$/, "");
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${trimmed}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    }
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `.${String(d.getMilliseconds()).padStart(3, "0")}`
  );
};

/**
 * Formats backend error messages for duplicate accounts or server errors
 */
export const describeSaveError = (rawMsg?: string, accountNo?: string): string => {
  const msg = String(rawMsg || "").trim();
  if (msg.toLowerCase().includes("bank account already exists")) {
    return `Account "${accountNo}" is already saved for this branch.`;
  }
  if (msg.toLowerCase().includes("branch not found")) {
    return "Branch not found for the given branchId under this organization.";
  }
  return msg || "Failed to save bank account. Please check the provided details.";
};

/**
 * 1. GET BANK INFO LIST (/get-bank-info-list)
 * Fetches the branch's registered bank accounts with balances and card metadata.
 */
export const fetchBankInfoList = async (): Promise<BankInfoListResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.bank?.bankInfoListUrl || "get-bank-info-list";

  const res: any = await postData<BankInfoListResponse>({ url, body: { accessUser } });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to fetch bank accounts");
  }

  const rawList = Array.isArray(res?.bankAccounts)
    ? res.bankAccounts
    : Array.isArray(res?.bankInfoList)
    ? res.bankInfoList
    : Array.isArray(res?.data?.bankAccounts)
    ? res.data.bankAccounts
    : [];

  const bankAccounts: BankAccountItem[] = rawList.map((item: any, idx: number) => ({
    bankId: item.bankId ?? item.id ?? idx + 1,
    bankName: item.bankName || "Bank",
    bankAccountName: item.bankAccountName || item.accountName || "-",
    accountNo: item.accountNo || item.bankAccountNo || item.accountNumber || "-",
    branchName: item.branchName || "",
    currentBalance: Number(item.currentBalance ?? item.balance ?? item.openingBalance ?? 0),
    openingBalance: Number(item.openingBalance ?? 0),
    status: item.status || "Active",
    hasCard: Boolean(item.hasCard),
    cardType: item.cardType || null,
    cardNumber: item.cardNumber || null,
    balanceDate: item.balanceDate || "",
    transactionDate: item.transactionDate || item.balanceDate || "",
  }));

  return {
    status: res?.status || "Success",
    msg: res?.msg || "",
    bankAccounts,
  };
};

/**
 * 2. GET BANK NAME LIST (/get-bank-name-list)
 * Master list of Bangladesh commercial banks for dropdown selection.
 */
export const fetchBankNameList = async (): Promise<BankNameListResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.bank?.bankNameListUrl || "get-bank-name-list";

  const res: any = await postData<BankNameListResponse>({ url, body: { accessUser } });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to fetch bank name list");
  }

  const bankNameList: BankNameItem[] = Array.isArray(res?.bankNameList)
    ? res.bankNameList
    : Array.isArray(res?.data?.bankNameList)
    ? res.data.bankNameList
    : [];

  return {
    status: res?.status || "Success",
    msg: res?.msg || "",
    bankNameList,
  };
};

/**
 * 3. INSERT BANK ACCOUNT (/insert-bank-account)
 * Registers a new bank account sending all required backend keys including transactionDate.
 */
export const insertBankAccount = async (
  payload: InsertBankAccountPayload
): Promise<BankAccountActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.bank?.insertBankAccountUrl || "insert-bank-account";

  const hasCard = Boolean(payload.hasCard);
  const txDate = payload.transactionDate || payload.balanceDate || new Date();
  const balDate = payload.balanceDate || new Date();

  const body = {
    accessUser,
    bankAccountName: payload.bankAccountName.trim(),
    bankName: payload.bankName.trim(),
    accountNo: payload.accountNo.trim(),
    openingBalance: Number(payload.openingBalance || 0),
    balanceDate: toNaiveIso(balDate),
    hasCard,
    cardType: hasCard && payload.cardType ? payload.cardType.trim().toLowerCase() : null,
    cardNumber: hasCard && payload.cardNumber ? String(payload.cardNumber).replace(/\D/g, "") : null,
    status: payload.status || "Active",
    transactionDate: toNaiveIso(txDate),
  };

  const res: any = await postData<BankAccountActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    const msg = describeSaveError(res?.msg || res?.message, payload.accountNo);
    throw new Error(msg);
  }

  return res;
};

/**
 * 4. UPDATE BANK ACCOUNT (/update-bank-account)
 * Updates an existing bank account using actual required backend keys.
 */
export const updateBankAccount = async (
  payload: UpdateBankAccountPayload
): Promise<BankAccountActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.bank?.updateBankAccountUrl || "update-bank-account";

  const hasCard = Boolean(payload.hasCard);
  const txDate = payload.transactionDate || payload.balanceDate || new Date();
  const balDate = payload.balanceDate || new Date();

  const body = {
    accessUser,
    bankId: Number(payload.bankId),
    bankAccountName: payload.bankAccountName.trim(),
    bankName: payload.bankName.trim(),
    accountNo: payload.accountNo.trim(),
    openingBalance: Number(payload.openingBalance || 0),
    balanceDate: toNaiveIso(balDate),
    hasCard,
    cardType: hasCard && payload.cardType ? payload.cardType.trim().toLowerCase() : null,
    cardNumber: hasCard && payload.cardNumber ? String(payload.cardNumber).replace(/\D/g, "") : null,
    status: payload.status || "Active",
    transactionDate: toNaiveIso(txDate),
  };

  const res: any = await postData<BankAccountActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    const msg = describeSaveError(res?.msg || res?.message, payload.accountNo);
    throw new Error(msg);
  }

  return res;
};
