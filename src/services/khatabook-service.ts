import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  LedgerPerson,
  SaveLedgerPersonPayload,
  LedgerTransaction,
  CreateLedgerTransactionPayload,
  UpdateLedgerTransactionPayload,
  LedgerPersonListResponse,
  LedgerTransactionListResponse,
  LedgerActionResponse,
} from "@/types";

/**
 * Formats a local date/time into naive ISO "YYYY-MM-DDTHH:mm:ss.SSS"
 * Prevents timezone offset shifts and satisfies Postgres not-null created_date constraints.
 */
export const toNaiveIso = (date?: Date | string | null): string => {
  if (!date) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` +
      `.${String(now.getMilliseconds()).padStart(3, "0")}`
    );
  }
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
  if (Number.isNaN(d.getTime())) return toNaiveIso();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `.${String(d.getMilliseconds()).padStart(3, "0")}`
  );
};

/**
 * 1. GET PERSON LIST (/ledger/person/list)
 */
export const fetchLedgerPersonList = async (): Promise<LedgerPersonListResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.personListUrl;

  const res: any = await postData<LedgerPersonListResponse>({
    url,
    body: { accessUser },
  });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to fetch ledger person list");
  }

  const rawList = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.personList)
    ? res.personList
    : [];

  const data: LedgerPerson[] = rawList.map((item: any) => ({
    id: Number(item.id),
    name: item.name || "Unknown",
    phone: item.phone || "",
    address: item.address || "",
    email: item.email || "",
    type: item.type || "CUSTOMER",
    tag: item.tag || "",
    isSync: item.isSync ?? 0,
    addedBy: item.addedBy || "",
    updatedBy: item.updatedBy || null,
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
    lastSyncedAt: item.lastSyncedAt || null,
    status: item.status || "Active",
  }));

  return {
    status: res?.status || "Success",
    msg: res?.msg || "",
    data,
  };
};

/**
 * 2. SAVE PERSON (/ledger/person/save)
 * Supports both creating a new person (with opening balances) and updating existing person.
 */
export const saveLedgerPerson = async (
  payload: SaveLedgerPersonPayload
): Promise<LedgerActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.personSaveUrl;

  const body: any = {
    accessUser,
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    address: payload.address?.trim() || "",
    email: payload.email?.trim() || "",
    type: payload.type || "CUSTOMER",
    tag: payload.tag?.trim() || "regular",
    status: payload.status || "Active",
  };

  if (payload.id) {
    body.id = Number(payload.id);
  }

  if (payload.openingDena !== undefined) {
    body.openingDena = Number(payload.openingDena) || 0;
  }
  if (payload.openingPona !== undefined) {
    body.openingPona = Number(payload.openingPona) || 0;
  }
  if (payload.openingDate) {
    body.openingDate = payload.openingDate;
  }

  const res: any = await postData<LedgerActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to save ledger person");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "Person saved successfully",
    data: res?.data,
  };
};

/**
 * 3. DELETE PERSON (/ledger/person/delete)
 * Deletes person. If transactions exist, server rejects with explanation.
 */
export const deleteLedgerPerson = async (personId: number): Promise<LedgerActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.personDeleteUrl;

  const res: any = await postData<LedgerActionResponse>({
    url,
    body: {
      accessUser,
      personId: Number(personId),
    },
  });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to delete ledger person");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "Person deleted successfully",
    data: res?.data,
  };
};

/**
 * 4. GET TRANSACTION LIST (/ledger/transaction/list)
 * If personId is provided, returns transactions for that person.
 * If omitted, returns all ledger transactions.
 */
export const fetchLedgerTransactionList = async (
  personId?: number | null
): Promise<LedgerTransactionListResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.transactionListUrl;

  const body: any = { accessUser };
  if (personId != null && !isNaN(Number(personId))) {
    body.personId = Number(personId);
  }

  const res: any = await postData<LedgerTransactionListResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to fetch ledger transactions");
  }

  const rawList = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.transactionList)
    ? res.transactionList
    : [];

  const data: LedgerTransaction[] = rawList.map((item: any) => ({
    id: Number(item.id),
    personId: Number(item.personId),
    personName: item.personName || "",
    transactionType: item.transactionType || "PABO",
    paymentType: item.paymentType || "CASH",
    amount: Number(item.amount ?? 0),
    bankAccountNo: item.bankAccountNo || null,
    mfsUserId: item.mfsUserId || null,
    note: item.note || "",
    refNo: item.refNo || "",
    commission: item.commission != null ? Number(item.commission) : null,
    addedBy: item.addedBy || "",
    createdAt: item.createdAt || "",
    createdDate: item.createdDate || item.createdAt || "",
    transactionDate: item.transactionDate || item.createdAt || "",
  }));

  return {
    status: res?.status || "Success",
    msg: res?.msg || "",
    data,
  };
};

/**
 * 5. CREATE TRANSACTION (/ledger/transaction/create)
 * Creates a PABO (receivable) or DIBO (payable) transaction with CASH, BANK, or MFS tender.
 */
export const createLedgerTransaction = async (
  payload: CreateLedgerTransactionPayload
): Promise<LedgerActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.transactionCreateUrl;

  const naiveDate = toNaiveIso(payload.createdDate || payload.transactionDate);
  const refNo = payload.refNo?.trim() || `TXN-${Date.now()}`;

  const body: any = {
    accessUser,
    personId: Number(payload.personId),
    transactionType: payload.transactionType,
    paymentType: payload.paymentType,
    amount: Number(payload.amount),
    note: payload.note?.trim() || "",
    refNo,
    createdDate: naiveDate,
    transactionDate: naiveDate,
  };

  if (payload.paymentType === "BANK" && payload.bankAccountNo) {
    body.bankAccountNo = String(payload.bankAccountNo).trim();
  }

  if (payload.paymentType === "MFS" && payload.mfsUserId) {
    body.mfsUserId = payload.mfsUserId;
  }

  const res: any = await postData<LedgerActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to create ledger transaction");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "Transaction recorded successfully",
    data: res?.data,
  };
};

/**
 * 6. UPDATE TRANSACTION (/ledger/transaction/update)
 * Edits an existing ledger transaction.
 */
export const updateLedgerTransaction = async (
  payload: UpdateLedgerTransactionPayload
): Promise<LedgerActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.transactionUpdateUrl;

  const naiveDate = toNaiveIso(payload.createdDate || payload.transactionDate);

  const body: any = {
    accessUser,
    transactionId: Number(payload.transactionId),
    personId: Number(payload.personId),
    transactionType: payload.transactionType,
    paymentType: payload.paymentType,
    amount: Number(payload.amount),
    note: payload.note?.trim() || "",
    refNo: payload.refNo?.trim() || `TXN-${Date.now()}`,
    createdDate: naiveDate,
    transactionDate: naiveDate,
  };

  if (payload.paymentType === "BANK" && payload.bankAccountNo) {
    body.bankAccountNo = String(payload.bankAccountNo).trim();
  }

  if (payload.paymentType === "MFS" && payload.mfsUserId) {
    body.mfsUserId = payload.mfsUserId;
  }

  const res: any = await postData<LedgerActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to update ledger transaction");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "Transaction updated successfully",
    data: res?.data,
  };
};

/**
 * 7. DELETE TRANSACTION (/ledger/transaction/delete)
 * Deletes transaction and restores financial balance.
 */
export const deleteLedgerTransaction = async (
  transactionId: number
): Promise<LedgerActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.transactionDeleteUrl;

  const res: any = await postData<LedgerActionResponse>({
    url,
    body: {
      accessUser,
      transactionId: Number(transactionId),
    },
  });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to delete ledger transaction");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "Transaction deleted successfully",
    data: res?.data,
  };
};

/**
 * Calculates aggregated Pabo, Dibo, and Net Balance for a single person's transactions.
 * - PABO / Opening Balance PABO: You will receive (Receivable / Credit)
 * - DIBO / Opening Balance DIBO: You have to give (Payable / Debit)
 * - Net Balance = totalPabo - totalDibo
 */
export const calculatePersonBalances = (transactions: LedgerTransaction[]) => {
  let totalPabo = 0;
  let totalDibo = 0;
  let lastDate: string | null = null;

  for (const txn of transactions) {
    const typeUpper = (txn.transactionType || "").toUpperCase();
    const isPabo = typeUpper.includes("PABO");
    const isDibo = typeUpper.includes("DIBO");
    const amount = Number(txn.amount) || 0;

    if (isPabo) {
      totalPabo += amount;
    } else if (isDibo) {
      totalDibo += amount;
    }

    const tDate = txn.createdAt || txn.createdDate || txn.transactionDate;
    if (tDate && (!lastDate || new Date(tDate).getTime() > new Date(lastDate).getTime())) {
      lastDate = tDate;
    }
  }

  return {
    totalPabo,
    totalDibo,
    netBalance: totalPabo - totalDibo,
    count: transactions.length,
    lastTransactionDate: lastDate,
  };
};

/**
 * Enriches person array with transaction summaries.
 * Single O(T + P) pass.
 */
export const enrichPersonsWithTransactions = (
  persons: LedgerPerson[],
  allTransactions: LedgerTransaction[]
): LedgerPerson[] => {
  const txnMap = new Map<number, LedgerTransaction[]>();

  for (const txn of allTransactions) {
    const pId = Number(txn.personId);
    if (!txnMap.has(pId)) {
      txnMap.set(pId, []);
    }
    txnMap.get(pId)!.push(txn);
  }

  return persons.map((person) => {
    const pTxns = txnMap.get(Number(person.id)) || [];
    const balances = calculatePersonBalances(pTxns);

    return {
      ...person,
      totalPabo: balances.totalPabo,
      totalDibo: balances.totalDibo,
      netBalance: balances.netBalance,
      transactionCount: balances.count,
      lastTransactionDate: balances.lastTransactionDate,
    };
  });
};
