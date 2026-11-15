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
 * Formats a local date/time into naive ISO "YYYY-MM-DDTHH:mm:ss" matching Postman collection exactly.
 */
export const toNaiveIso = (date?: Date | string | null): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!date) {
    const now = new Date();
    return (
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    );
  }
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (trimmed.includes("T")) {
      return trimmed.split(".")[0].replace(/Z$/, "");
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const now = new Date();
      return `${trimmed}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return toNaiveIso();
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

/**
 * 1. GET PERSON LIST (Image 3: POST /api/ledger/person/list)
 * Body: { accessUser: { phone, orgId, branchId }, status?: string }
 */
export const fetchLedgerPersonList = async (
  statusArg?: string | unknown
): Promise<LedgerPersonListResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.personListUrl;

  // React Query passes QueryFunctionContext object when queryFn is passed directly.
  // Ensure status is always a clean string, strictly defaulting to "Active" as per Postman.
  let status = "Active";
  if (typeof statusArg === "string" && statusArg.trim() !== "") {
    const trimmed = statusArg.trim();
    status = trimmed === "ALL" ? "Active" : trimmed;
  }

  const body: any = {
    accessUser,
    status,
  };

  const res: any = await postData<LedgerPersonListResponse>({
    url,
    body,
  });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to fetch ledger person list");
  }

  let rawList: any[] = [];
  if (Array.isArray(res)) {
    rawList = res;
  } else if (Array.isArray(res?.data)) {
    rawList = res.data;
  } else if (Array.isArray(res?.data?.persons)) {
    rawList = res.data.persons;
  } else if (Array.isArray(res?.data?.personList)) {
    rawList = res.data.personList;
  } else if (Array.isArray(res?.data?.list)) {
    rawList = res.data.list;
  } else if (Array.isArray(res?.personList)) {
    rawList = res.personList;
  } else if (Array.isArray(res?.persons)) {
    rawList = res.persons;
  } else if (Array.isArray(res?.list)) {
    rawList = res.list;
  }

  const data: LedgerPerson[] = rawList.map((item: any) => {
    const rawOpeningBal = Number(item.openingBalance ?? item.opening_balance ?? 0);
    const openingPona = Number(
      item.openingPona ?? item.opening_pona ?? (rawOpeningBal > 0 ? rawOpeningBal : 0)
    );
    const openingDena = Number(
      item.openingDena ?? item.opening_dena ?? (rawOpeningBal < 0 ? Math.abs(rawOpeningBal) : 0)
    );
    const serverPabo = Number(item.totalPabo ?? item.total_pabo ?? openingPona);
    const serverDibo = Number(item.totalDibo ?? item.total_dibo ?? openingDena);
    const serverNet = item.netBalance != null ? Number(item.netBalance) : (serverPabo - serverDibo);

    return {
      id: Number(item.id ?? item.personId ?? item.person_id),
      name: item.name || item.personName || item.person_name || "Unknown",
      phone: item.phone || item.mobile || item.phoneNumber || item.phone_number || "",
      address: item.address || "",
      email: item.email || "",
      type: item.type || "PERSON",
      tag: item.tag || "",
      isSync: item.isSync ?? 0,
      addedBy: item.addedBy || "",
      updatedBy: item.updatedBy || null,
      createdAt: item.createdAt || item.createdDate || "",
      updatedAt: item.updatedAt || "",
      lastSyncedAt: item.lastSyncedAt || null,
      status: item.status || "Active",
      totalPabo: serverPabo,
      totalDibo: serverDibo,
      netBalance: serverNet,
      transactionCount: Number(item.transactionCount ?? item.transaction_count ?? 0),
      lastTransactionDate: item.lastTransactionDate || null,
    };
  });

  return {
    status: res?.status || "Success",
    msg: res?.msg || "",
    data,
  };
};

/**
 * 2. SAVE PERSON (Image 1 & 2: POST /api/ledger/person/save)
 * - Save New Person (Image 1):
 *   Body: { accessUser, name, phone, address, email, type, tag, status, openingDena, openingPona, openingDate }
 * - Update Person (Image 2):
 *   Body: { accessUser, id, name, phone, address, type, status }
 */
export const saveLedgerPerson = async (
  payload: SaveLedgerPersonPayload
): Promise<LedgerActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.personSaveUrl;

  // New Person
  if (!payload.id) {
    const body = {
      accessUser,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      address: payload.address?.trim() || "",
      email: payload.email?.trim() || "",
      type: payload.type || "PERSON",
      tag: payload.tag?.trim() || "Regular",
      status: payload.status || "Active",
      openingDena: Number(payload.openingDena) || 0,
      openingPona: Number(payload.openingPona) || 0,
      openingDate: payload.openingDate || new Date().toISOString().split("T")[0],
    };

    const res: any = await postData<LedgerActionResponse>({ url, body });

    if (res?.error || String(res?.status).toLowerCase() === "error") {
      throw new Error(res?.msg || res?.message || "Failed to save ledger person");
    }

    return {
      status: res?.status || "Success",
      msg: res?.msg || "Person saved successfully",
      data: res?.data,
    };
  }

  // Update Person (strictly matching Image 2 keys)
  const body = {
    accessUser,
    id: Number(payload.id),
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    address: payload.address?.trim() || "",
    type: payload.type || "PERSON",
    status: payload.status || "Active",
  };

  const res: any = await postData<LedgerActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to update ledger person");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "Person updated successfully",
    data: res?.data,
  };
};

/**
 * 3. DELETE PERSON (Image 4: POST /api/ledger/person/delete)
 * Body: { accessUser: { phone, orgId, branchId }, personId }
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
 * 4. GET TRANSACTION LIST (Image 8: POST /api/ledger/transaction/list)
 * Body: { accessUser: { phone, orgId, branchId }, personId }
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

  let res: any;
  try {
    res = await postData<LedgerTransactionListResponse>({ url, body });
  } catch (err: any) {
    if (!personId) {
      return { status: "Success", msg: "", data: [] };
    }
    throw err;
  }

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    // If fetching all transactions without personId is rejected by backend, safely return empty list
    if (!personId) {
      return { status: "Success", msg: "", data: [] };
    }
    throw new Error(res?.msg || res?.message || "Failed to fetch ledger transactions");
  }

  let rawList: any[] = [];
  if (Array.isArray(res)) {
    rawList = res;
  } else if (Array.isArray(res?.data)) {
    rawList = res.data;
  } else if (Array.isArray(res?.data?.transactions)) {
    rawList = res.data.transactions;
  } else if (Array.isArray(res?.data?.list)) {
    rawList = res.data.list;
  } else if (Array.isArray(res?.transactionList)) {
    rawList = res.transactionList;
  } else if (Array.isArray(res?.transactions)) {
    rawList = res.transactions;
  } else if (Array.isArray(res?.list)) {
    rawList = res.list;
  }

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
 * 5. CREATE TRANSACTION (Images 5, 6, 7: POST /api/ledger/transaction/create)
 * CASH (Image 5): { accessUser, personId, transactionType, paymentType: "CASH", amount, commission, note, refNo, transactionDate }
 * BANK (Image 6): + bankAccountNo
 * MFS (Image 7): + mfsUserId
 */
export const createLedgerTransaction = async (
  payload: CreateLedgerTransactionPayload
): Promise<LedgerActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.transactionCreateUrl;

  const naiveDate = toNaiveIso(payload.transactionDate || payload.createdDate);

  const body: any = {
    accessUser,
    personId: Number(payload.personId),
    transactionType: payload.transactionType,
    paymentType: payload.paymentType,
    amount: Number(payload.amount),
    commission: Number(payload.commission) || 0,
    note: payload.note?.trim() || "",
    refNo: payload.refNo?.trim() || "",
    transactionDate: naiveDate,
  };

  if (payload.paymentType === "BANK") {
    body.bankAccountNo = String(payload.bankAccountNo || "").trim();
  } else if (payload.paymentType === "MFS") {
    body.mfsUserId = Number(payload.mfsUserId) || 0;
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
 * 6. UPDATE TRANSACTION (Image 9: POST /api/ledger/transaction/update)
 * Body: { accessUser, transactionId, personId, transactionType, paymentType, amount, commission, note, refNo, transactionDate, ... }
 */
export const updateLedgerTransaction = async (
  payload: UpdateLedgerTransactionPayload
): Promise<LedgerActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.ledger.transactionUpdateUrl;

  const naiveDate = toNaiveIso(payload.transactionDate || payload.createdDate);

  const body: any = {
    accessUser,
    transactionId: Number(payload.transactionId),
    personId: Number(payload.personId),
    transactionType: payload.transactionType,
    paymentType: payload.paymentType,
    amount: Number(payload.amount),
    commission: Number(payload.commission) || 0,
    note: payload.note?.trim() || "",
    refNo: payload.refNo?.trim() || "",
    transactionDate: naiveDate,
  };

  if (payload.paymentType === "BANK") {
    body.bankAccountNo = String(payload.bankAccountNo || "").trim();
  } else if (payload.paymentType === "MFS") {
    body.mfsUserId = Number(payload.mfsUserId) || 0;
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
 * 7. DELETE TRANSACTION (Image 10: POST /api/ledger/transaction/delete)
 * Body: { accessUser: { phone, orgId, branchId }, transactionId }
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
  let totalCommission = 0;
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

    if (txn.commission != null && Number(txn.commission) > 0) {
      totalCommission += Number(txn.commission);
    }

    const tDate = txn.createdAt || txn.createdDate || txn.transactionDate;
    if (tDate && (!lastDate || new Date(tDate).getTime() > new Date(lastDate).getTime())) {
      lastDate = tDate;
    }
  }

  return {
    totalPabo,
    totalDibo,
    totalCommission,
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
    if (pTxns.length === 0) {
      return {
        ...person,
        totalPabo: person.totalPabo ?? 0,
        totalDibo: person.totalDibo ?? 0,
        totalCommission: person.totalCommission ?? 0,
        netBalance: person.netBalance ?? 0,
        transactionCount: person.transactionCount ?? 0,
      };
    }

    const balances = calculatePersonBalances(pTxns);

    return {
      ...person,
      totalPabo: balances.totalPabo,
      totalDibo: balances.totalDibo,
      totalCommission: balances.totalCommission,
      netBalance: balances.netBalance,
      transactionCount: balances.count,
      lastTransactionDate: balances.lastTransactionDate || person.lastTransactionDate,
    };
  });
};

/**
 * 8. DELETE ALL TRANSACTIONS OF A PERSON
 * Fetches all transactions of a person and deletes each sequentially, restoring balances.
 */
export const deleteAllTransactionsOfPerson = async (
  personId: number
): Promise<{ success: boolean; deletedCount: number; message: string }> => {
  const res = await fetchLedgerTransactionList(personId);
  const txns: LedgerTransaction[] = Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
    ? res.data
    : [];

  if (txns.length === 0) {
    return { success: true, deletedCount: 0, message: "No transactions to delete" };
  }

  let deletedCount = 0;
  for (const txn of txns) {
    if (txn.id) {
      await deleteLedgerTransaction(txn.id);
      deletedCount++;
    }
  }

  return {
    success: true,
    deletedCount,
    message: `${deletedCount} টি লেনদেন সফলভাবে মুছে ফেলা হয়েছে`,
  };
};
