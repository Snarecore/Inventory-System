import moment from "moment";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import { getBusinessCode } from "@/utils/auth-storage";
import { cashLeg, bankLeg, mfsLeg, postTradeFinancialEntries, type TradeTender } from "@/services/financial-ledger-service";
import type {
  InvoiceDueItem,
  CollectionDetailPayload,
  CollectionBankDetails,
  CollectionMfsDetails,
  CollectionDataPayload,
  CollectionRequestPayload,
  CollectionAllocation,
  AllocationResult,
} from "@/types/collection.types";

/**
 * Enterprise standard FIFO chronological sorter.
 * Ensures the oldest pending invoice is placed first (Row 1).
 */
export const sortInvoicesFIFO = (invoices: InvoiceDueItem[]): InvoiceDueItem[] => {
  return [...invoices].sort((a, b) => {
    // 1. Compare Date (earliest/oldest date first)
    const dateA = a.salesDate || a.saleDate || a.date || a.createdAt;
    const dateB = b.salesDate || b.saleDate || b.date || b.createdAt;
    if (dateA && dateB && dateA !== dateB) {
      const diff = moment(dateA).diff(moment(dateB));
      if (diff !== 0) return diff;
    }

    // 2. Compare timestamp in invoiceNo (e.g. 28488-20261018091848876 vs 28488-20261018091934453)
    const invA = String(a.invoiceNo || "");
    const invB = String(b.invoiceNo || "");
    const matchA = invA.match(/\d{10,}/);
    const matchB = invB.match(/\d{10,}/);
    if (matchA && matchB && matchA[0] !== matchB[0]) {
      return matchA[0].localeCompare(matchB[0]);
    }

    // 3. Fallback to numeric ID if available (lower/earlier ID first)
    if (a.id != null && b.id != null && a.id !== b.id) {
      const numA = Number(a.id);
      const numB = Number(b.id);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    }

    return invA.localeCompare(invB);
  });
};

/**
 * Pure Mathematical FIFO Allocation Engine (First-In, First-Out).
 * Automatically distributes the entered payment amount across due invoices,
 * beginning with the oldest invoice first.
 */
export const allocateCollectionFIFO = (
  invoices: InvoiceDueItem[],
  enteredAmount: number,
  discountAmount: number = 0
): AllocationResult => {
  let remainingPaid = Math.max(0, Number(enteredAmount) || 0);
  let remainingDiscount = Math.max(0, Number(discountAmount) || 0);
  const allocations: CollectionAllocation[] = [];

  // Sort chronologically (oldest invoice first) and filter only invoices with pending due
  const sortedInvoices = sortInvoicesFIFO(invoices).filter(
    (inv) => Number(inv.dueAmount || 0) > 0
  );

  for (const inv of sortedInvoices) {
    const itemDue = Number(inv.dueAmount || 0);
    if (itemDue <= 0) continue;

    // 1. Allocate payment from actual money paid
    const paidForThisInvoice = Math.min(itemDue, remainingPaid);
    const roundedPaid = Number(paidForThisInvoice.toFixed(2));
    remainingPaid = Math.max(0, Number((remainingPaid - roundedPaid).toFixed(2)));

    // 2. Allocate discount against any remaining due on this invoice
    const dueAfterPaid = Math.max(0, Number((itemDue - roundedPaid).toFixed(2)));
    const discountForThisInvoice = Math.min(dueAfterPaid, remainingDiscount);
    const roundedDiscount = Number(discountForThisInvoice.toFixed(2));
    remainingDiscount = Math.max(0, Number((remainingDiscount - roundedDiscount).toFixed(2)));

    const totalSettled = Number((roundedPaid + roundedDiscount).toFixed(2));
    const roundedRemaining = Number(Math.max(0, itemDue - totalSettled).toFixed(2));

    if (totalSettled > 0) {
      allocations.push({
        invoiceNo: inv.invoiceNo,
        originalDue: itemDue,
        allocatedAmount: totalSettled,
        allocatedPaid: roundedPaid,
        allocatedDiscount: roundedDiscount,
        remainingDue: roundedRemaining,
        paidAmount: roundedPaid,
        discountAmount: roundedDiscount,
        dueAmount: roundedRemaining,
      });
    }

    if (remainingPaid <= 0 && remainingDiscount <= 0) break;
  }

  const allocatedTotal = Number(
    allocations.reduce((sum, a) => sum + a.allocatedAmount, 0).toFixed(2)
  );

  const totalOriginalDue = Number(
    sortedInvoices.reduce((sum, i) => sum + Number(i.dueAmount || 0), 0).toFixed(2)
  );

  const remainingTotalDue = Number(Math.max(0, totalOriginalDue - allocatedTotal).toFixed(2));

  return {
    allocations,
    allocatedTotal,
    remainingTotalDue,
  };
};

/**
 * Manual Bill Selection Allocation Engine.
 * Distributes payment strictly across invoices explicitly selected by the user.
 */
export const allocateCollectionManual = (
  invoices: InvoiceDueItem[],
  enteredAmount: number,
  selectedInvoiceNos: Set<string>,
  discountAmount: number = 0
): AllocationResult => {
  const selectedInvoices = invoices.filter(
    (inv) => selectedInvoiceNos.has(inv.invoiceNo) && Number(inv.dueAmount || 0) > 0
  );

  return allocateCollectionFIFO(selectedInvoices, enteredAmount, discountAmount);
};

export interface BuildCollectionPayloadParams {
  customerId: string | number;
  customerName: string;
  customerPhone: string;
  collectionDate?: string;
  paymentMode: string;
  remark?: string;
  allocations: CollectionAllocation[];
  selectedBank?: any;
  selectedMfs?: any;
  totalAmount?: number;
  totalDiscount?: number;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
}

/**
 * Factory for building strict Spring Boot DTO Collection Payload.
 */
export const buildCollectionPayload = ({
  customerId,
  customerName,
  customerPhone,
  collectionDate,
  paymentMode,
  remark = "",
  allocations,
  selectedBank,
  selectedMfs,
  totalAmount,
  totalDiscount = 0,
  cashAmount,
  bankAmount,
  mfsAmount,
}: BuildCollectionPayloadParams): CollectionRequestPayload => {
  const code = getBusinessCode();
  const dateStr = collectionDate || new Date().toISOString().slice(0, 10);
  const totalAllocated = Number(
    allocations.reduce((sum, a) => sum + a.allocatedAmount, 0).toFixed(2)
  );

  const detailsPayload: CollectionDetailPayload[] = allocations.map((a) => ({
    invoiceNo: a.invoiceNo,
    paidAmount: a.allocatedAmount,
    discountAmount: a.allocatedDiscount || 0,
    discount: a.allocatedDiscount || 0,
    dueAmount: a.remainingDue,
    businessCode: code,
  }));

  const numCash = cashAmount != null ? Number(cashAmount) : 0;
  const numBank = bankAmount != null ? Number(bankAmount) : 0;
  const numMfs = mfsAmount != null ? Number(mfsAmount) : 0;

  const hasBank = numBank > 0 || String(paymentMode).toUpperCase().includes("BANK");
  const hasMfs = numMfs > 0 || String(paymentMode).toUpperCase().includes("MFS");

  const bankDetailsPayload: CollectionBankDetails | null = hasBank && selectedBank
    ? {
        bankId: selectedBank.bankId ?? selectedBank.id ?? "",
        bankName: selectedBank.bankName || selectedBank.name || "",
        accountNumber: selectedBank.accountNo || selectedBank.accountNumber || "",
        accountHolderName: selectedBank.bankAccountName || selectedBank.holderName || "",
      }
    : null;

  const mfsDetailsPayload: CollectionMfsDetails | null = hasMfs && selectedMfs
    ? {
        mfsId: selectedMfs.id ?? selectedMfs.mfsId ?? "",
        mfsName: selectedMfs.mfsName || selectedMfs.name || "MFS",
        mfsPhone: selectedMfs.mfsPhone || selectedMfs.phone || selectedMfs.mobileNo || "",
      }
    : null;

  const numDiscount = Number(totalDiscount) || 0;
  const numTotalAmount =
    totalAmount != null
      ? Number(totalAmount)
      : Math.max(0, Number((totalAllocated - numDiscount).toFixed(2)));

  // Backend Spring Boot controller strictly validates that paymentMode is one of: "Cash", "Bank", or "MFS"
  let backendPaymentMode = "Cash";
  const normalizedMode = String(paymentMode || "").trim().toUpperCase();

  if (normalizedMode === "BANK" || normalizedMode === "CARD") {
    backendPaymentMode = "Bank";
  } else if (normalizedMode === "MFS") {
    backendPaymentMode = "MFS";
  } else if (normalizedMode === "CASH") {
    backendPaymentMode = "Cash";
  } else {
    // Multi-tender split payment (e.g. "Cash + Bank + MFS", "Bank + MFS", etc.)
    if (numCash > 0) {
      backendPaymentMode = "Cash";
    } else if (numBank > 0) {
      backendPaymentMode = "Bank";
    } else if (numMfs > 0) {
      backendPaymentMode = "MFS";
    } else {
      backendPaymentMode = "Cash";
    }
  }

  const collectionData: CollectionDataPayload = {
    customerId,
    customerName,
    customerPhone: customerPhone ? String(customerPhone).trim() : "",
    collectionDate: dateStr,
    totalAmount: numTotalAmount,
    totalDiscount: numDiscount,
    paymentMode: backendPaymentMode,
    remark: remark.trim(),
    osType: "WEB",
    businessCode: code,
    collectionDetails: detailsPayload,
    bankDetails: bankDetailsPayload,
    mfsDetails: mfsDetailsPayload,
    mfsId: hasMfs ? (selectedMfs?.id ?? selectedMfs?.mfsId ?? null) : null,
    mfsName: hasMfs ? (selectedMfs?.mfsName || selectedMfs?.name || null) : null,
    mfsPhone: hasMfs ? (selectedMfs?.mfsPhone || selectedMfs?.phone || selectedMfs?.mobileNo || null) : null,
    cashReceived: numCash,
    cardReceived: numBank,
    mfsReceived: numMfs,
    cashAmount: numCash,
    bankAmount: numBank,
    mfsAmount: numMfs,
  };

  return {
    accessUser: buildAccessUser(),
    collectionData,
  };
};

/**
 * Dispatches collection to /insert-collection
 */
export const postCollection = async (
  payload: CollectionRequestPayload
): Promise<{ success: boolean; msg: string; data?: any }> => {
  const endpoint = apiConfig.collection?.insertCollectionUrl || "insert-collection";

  try {
    const res: any = await postData({
      url: endpoint,
      body: payload,
    });

    const isSuccess =
      res?.status === "Success" ||
      res?.success === true ||
      String(res?.status || "").toLowerCase() === "success";

    return {
      success: isSuccess,
      msg: res?.msg || res?.message || (isSuccess ? "Collection submitted successfully" : "Failed to insert collection"),
      data: res?.data,
    };
  } catch (error: any) {
    console.error("Error inserting collection:", error);
    return {
      success: false,
      msg: error?.response?.data?.msg || error?.message || "Failed to insert collection",
    };
  }
};

export interface PostCollectionLedgerParams {
  customerPhone?: string;
  customerId: string | number;
  totalCollected: number;
  remainingDue: number;
  paymentMode: string;
  selectedBank?: any;
  selectedMfs?: any;
  notes?: string;
  date?: string;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
}

/**
 * Sequential Ledger posting to /insert-financial-transaction
 * Credits the collected amount to Cash, Bank, or MFS balance.
 */
export const postCollectionLedger = async ({
  customerPhone,
  customerId,
  totalCollected,
  remainingDue,
  paymentMode,
  selectedBank,
  selectedMfs,
  notes = "",
  date,
  cashAmount,
  bankAmount,
  mfsAmount,
}: PostCollectionLedgerParams): Promise<{ ok: boolean; msg: string }> => {
  const tenders: TradeTender[] = [];

  const numCash = cashAmount != null ? Number(cashAmount) : 0;
  const numBank = bankAmount != null ? Number(bankAmount) : 0;
  const numMfs = mfsAmount != null ? Number(mfsAmount) : 0;

  if (numCash > 0 || numBank > 0 || numMfs > 0) {
    if (numCash > 0) tenders.push({ amount: numCash, leg: cashLeg() });
    if (numBank > 0) tenders.push({ amount: numBank, leg: bankLeg(selectedBank) });
    if (numMfs > 0) tenders.push({ amount: numMfs, leg: mfsLeg(selectedMfs) });
  } else {
    const isBank = String(paymentMode).toUpperCase().includes("BANK");
    const isMfs = String(paymentMode).toUpperCase().includes("MFS");
    tenders.push({
      amount: Number(totalCollected.toFixed(2)),
      leg: isBank ? bankLeg(selectedBank) : isMfs ? mfsLeg(selectedMfs) : cashLeg(),
    });
  }

  const stamp = Date.now();
  const txnRef = `COL-${stamp}`;

  try {
    const res = await postTradeFinancialEntries({
      tradeType: "INCOME",
      tenders,
      invoiceNo: txnRef,
      refNo: txnRef,
      partyId: customerPhone || String(customerId),
      head: "Collection",
      itemsSummary: `Collection of ${totalCollected} Tk`,
      notes: notes.trim(),
      date,
      totalDue: remainingDue,
    });

    return {
      ok: res.allSucceeded,
      msg: res.allSucceeded ? "Ledger entry updated successfully" : "Ledger entry could not be completely posted",
    };
  } catch (error: any) {
    console.error("Failed to post collection to financial ledger:", error);
    return {
      ok: false,
      msg: error?.message || "Failed to update financial ledger",
    };
  }
};
