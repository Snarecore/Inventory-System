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
 * Pure Mathematical FIFO Allocation Engine (First-In, First-Out).
 * Automatically distributes the entered payment amount across due invoices,
 * beginning with the oldest invoice first.
 */
export const allocateCollectionFIFO = (
  invoices: InvoiceDueItem[],
  enteredAmount: number
): AllocationResult => {
  let remainingPayment = Math.max(0, Number(enteredAmount) || 0);
  const allocations: CollectionAllocation[] = [];

  // Sort by date or preserve order as retrieved from backend
  const sortedInvoices = [...invoices].filter((inv) => Number(inv.dueAmount || 0) > 0);

  for (const inv of sortedInvoices) {
    const itemDue = Number(inv.dueAmount || 0);
    if (itemDue <= 0) continue;

    const paidForThisInvoice = Math.min(itemDue, remainingPayment);
    const roundedPaid = Number(paidForThisInvoice.toFixed(2));
    const roundedRemaining = Number(Math.max(0, itemDue - roundedPaid).toFixed(2));

    if (roundedPaid > 0) {
      allocations.push({
        invoiceNo: inv.invoiceNo,
        originalDue: itemDue,
        allocatedAmount: roundedPaid,
        remainingDue: roundedRemaining,
      });
      remainingPayment = Math.max(0, remainingPayment - roundedPaid);
    }

    if (remainingPayment <= 0) break;
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
  selectedInvoiceNos: Set<string>
): AllocationResult => {
  const selectedInvoices = invoices.filter(
    (inv) => selectedInvoiceNos.has(inv.invoiceNo) && Number(inv.dueAmount || 0) > 0
  );

  return allocateCollectionFIFO(selectedInvoices, enteredAmount);
};

export interface BuildCollectionPayloadParams {
  customerId: string | number;
  customerName: string;
  customerPhone: string;
  collectionDate?: string;
  paymentMode: "Cash" | "Bank" | "MFS" | "CASH" | "BANK" | string;
  remark?: string;
  allocations: CollectionAllocation[];
  selectedBank?: any;
  selectedMfs?: any;
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
}: BuildCollectionPayloadParams): CollectionRequestPayload => {
  const code = getBusinessCode();
  const dateStr = collectionDate || new Date().toISOString().slice(0, 10);
  const totalAllocated = Number(
    allocations.reduce((sum, a) => sum + a.allocatedAmount, 0).toFixed(2)
  );

  const detailsPayload: CollectionDetailPayload[] = allocations.map((a) => ({
    invoiceNo: a.invoiceNo,
    paidAmount: a.allocatedAmount,
    dueAmount: a.remainingDue,
    businessCode: code,
  }));

  const isBank = String(paymentMode).toUpperCase() === "BANK";
  const isMfs = String(paymentMode).toUpperCase() === "MFS";

  const bankDetailsPayload: CollectionBankDetails | null = isBank && selectedBank
    ? {
        bankId: selectedBank.bankId ?? selectedBank.id ?? "",
        bankName: selectedBank.bankName || selectedBank.name || "",
        accountNumber: selectedBank.accountNo || selectedBank.accountNumber || "",
        accountHolderName: selectedBank.bankAccountName || selectedBank.holderName || "",
      }
    : null;

  const mfsDetailsPayload: CollectionMfsDetails | null = isMfs && selectedMfs
    ? {
        mfsId: selectedMfs.id ?? selectedMfs.mfsId ?? "",
        mfsName: selectedMfs.mfsName || selectedMfs.name || "MFS",
        mfsPhone: selectedMfs.mfsPhone || selectedMfs.phone || selectedMfs.mobileNo || "",
      }
    : null;

  const collectionData: CollectionDataPayload = {
    customerId,
    customerName,
    customerPhone: customerPhone ? String(customerPhone).trim() : "",
    collectionDate: dateStr,
    totalAmount: totalAllocated,
    paymentMode: isBank ? "Bank" : isMfs ? "MFS" : "Cash",
    remark: remark.trim(),
    osType: "WEB",
    businessCode: code,
    collectionDetails: detailsPayload,
    bankDetails: bankDetailsPayload,
    mfsDetails: mfsDetailsPayload,
    mfsId: isMfs ? (selectedMfs?.id ?? selectedMfs?.mfsId ?? null) : null,
    mfsName: isMfs ? (selectedMfs?.mfsName || selectedMfs?.name || null) : null,
    mfsPhone: isMfs ? (selectedMfs?.mfsPhone || selectedMfs?.phone || selectedMfs?.mobileNo || null) : null,
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
}: PostCollectionLedgerParams): Promise<{ ok: boolean; msg: string }> => {
  const isBank = String(paymentMode).toUpperCase() === "BANK";
  const isMfs = String(paymentMode).toUpperCase() === "MFS";
  const tender: TradeTender = {
    amount: Number(totalCollected.toFixed(2)),
    leg: isBank ? bankLeg(selectedBank) : isMfs ? mfsLeg(selectedMfs) : cashLeg(),
  };

  const stamp = Date.now();
  const txnRef = `COL-${stamp}`;

  try {
    const res = await postTradeFinancialEntries({
      tradeType: "INCOME",
      tenders: [tender],
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
