import moment from "moment";
import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import { getBusinessCode } from "@/utils/auth-storage";
import {
  cashLeg,
  bankLeg,
  mfsLeg,
  postTradeFinancialEntries,
  type TradeTender,
} from "@/services/financial-ledger-service";
import type {
  PurchaseInvoiceDueItem,
  PaymentDetailPayload,
  PaymentBankDetails,
  PaymentMfsDetails,
  PaymentDataPayload,
  PaymentRequestPayload,
  PaymentAllocation,
  PaymentAllocationResult,
} from "@/types/payment.types";

import {
  sortDueInvoicesFIFO,
  allocateSettlementFIFO,
  allocateSettlementManual,
} from "./settlement-allocation-service";

/**
 * Enterprise standard FIFO chronological sorter for purchase invoices.
 * Ensures the oldest pending invoice is placed first (Row 1).
 */
export const sortPurchaseInvoicesFIFO = (
  invoices: PurchaseInvoiceDueItem[]
): PurchaseInvoiceDueItem[] => {
  return sortDueInvoicesFIFO(invoices);
};

/**
 * Pure Mathematical FIFO Allocation Engine (First-In, First-Out).
 * Automatically distributes the entered payment amount across purchase invoices with pending dues,
 * beginning with the oldest invoice first.
 */
export const allocatePaymentFIFO = (
  invoices: PurchaseInvoiceDueItem[],
  enteredAmount: number,
  discountAmount: number = 0
): PaymentAllocationResult => {
  return allocateSettlementFIFO(invoices, enteredAmount, discountAmount);
};

/**
 * Manual Bill Selection Allocation Engine.
 * Distributes payment strictly across purchase invoices explicitly selected by the user.
 */
export const allocatePaymentManual = (
  invoices: PurchaseInvoiceDueItem[],
  enteredAmount: number,
  selectedInvoiceNos: Set<string>,
  discountAmount: number = 0
): PaymentAllocationResult => {
  return allocateSettlementManual(invoices, enteredAmount, selectedInvoiceNos, discountAmount);
};

export interface BuildPaymentPayloadParams {
  supplierId?: string | number;
  supplierName: string;
  supplierPhone: string;
  paymentDate?: string;
  paymentMode: string;
  remark?: string;
  allocations: PaymentAllocation[];
  selectedBank?: any;
  selectedMfs?: any;
  totalAmount?: number;
  totalDiscount?: number;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
}

/**
 * Factory for building strict Spring Boot DTO Payment Payload for /insert-payment.
 * In the backend Java DTO, supplier fields are designated as `customerPhone` and `customerName`.
 */
export const buildPaymentPayload = ({
  supplierName,
  supplierPhone,
  paymentDate,
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
}: BuildPaymentPayloadParams): PaymentRequestPayload => {
  const code = getBusinessCode();
  const dateStr = paymentDate || new Date().toISOString().slice(0, 10);
  const totalAllocated = Number(
    allocations.reduce((sum, a) => sum + a.allocatedAmount, 0).toFixed(2)
  );

  const detailsPayload: PaymentDetailPayload[] = allocations.map((a) => ({
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

  const bankDetailsPayload: PaymentBankDetails | null = hasBank && selectedBank
    ? {
        bankId: selectedBank.bankId ?? selectedBank.id ?? "",
        bankName: selectedBank.bankName || selectedBank.name || "",
        accountNumber: selectedBank.accountNo || selectedBank.accountNumber || "",
        accountHolderName: selectedBank.bankAccountName || selectedBank.holderName || "",
      }
    : null;

  const mfsDetailsPayload: PaymentMfsDetails | null = hasMfs && selectedMfs
    ? {
        mfsId: Number(selectedMfs.id ?? selectedMfs.mfsId ?? 0),
        method: String(selectedMfs.method || selectedMfs.mfsName || "MFS").toUpperCase(),
        phoneNumber: selectedMfs.mfsPhone || selectedMfs.phone || selectedMfs.mobileNo || "",
        name: selectedMfs.holder || selectedMfs.name || selectedMfs.accountHolderName || "",
      }
    : null;

  const numDiscount = Number(totalDiscount) || 0;
  const numTotalAmount =
    totalAmount != null
      ? Number(totalAmount)
      : Math.max(0, Number((totalAllocated - numDiscount).toFixed(2)));

  // Backend Spring Boot controller strictly validates paymentMode: "Cash", "Bank", or "MFS"
  let backendPaymentMode = "Cash";
  const normalizedMode = String(paymentMode || "").trim().toUpperCase();

  if (normalizedMode === "BANK" || normalizedMode === "CARD") {
    backendPaymentMode = "Bank";
  } else if (normalizedMode === "MFS") {
    backendPaymentMode = "MFS";
  } else if (normalizedMode === "CASH") {
    backendPaymentMode = "Cash";
  } else {
    // Multi-tender split payment
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

  const paymentData: PaymentDataPayload = {
    customerPhone: supplierPhone ? String(supplierPhone).trim() : "",
    customerName: supplierName ? String(supplierName).trim() : "Supplier",
    paymentDate: dateStr,
    totalAmount: numTotalAmount,
    totalDiscount: numDiscount,
    paymentMode: backendPaymentMode,
    remark: remark.trim(),
    osType: "WEB",
    paymentDetails: detailsPayload,
    bankDetails: bankDetailsPayload,
    mfsDetails: mfsDetailsPayload,
    cashAmount: numCash,
    bankAmount: numBank,
    mfsAmount: numMfs,
  };

  return {
    accessUser: buildAccessUser(),
    paymentData,
  };
};

/**
 * Dispatches supplier payment to /insert-payment
 */
export const postPayment = async (
  payload: PaymentRequestPayload
): Promise<{ success: boolean; msg: string; data?: any }> => {
  const endpoint = apiConfig.payment?.insertPaymentUrl;

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
      msg:
        res?.msg ||
        res?.message ||
        (isSuccess ? "Payment submitted successfully" : "Failed to insert payment"),
      data: res?.data,
    };
  } catch (error: any) {
    console.error("Error inserting payment:", error);
    const msg = error?.response?.data?.msg || error?.message || "Failed to insert payment";
    return {
      success: false,
      msg,
    };
  }
};

export interface PostPaymentLedgerParams {
  supplierPhone?: string;
  supplierId?: string | number;
  totalPaid: number;
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
 * Debits the paid amount from Cash, Bank, or MFS balance with tradeType: "EXPENSE", head: "Payment".
 */
export const postPaymentLedger = async ({
  supplierPhone,
  supplierId,
  totalPaid,
  remainingDue,
  paymentMode,
  selectedBank,
  selectedMfs,
  notes = "",
  date,
  cashAmount,
  bankAmount,
  mfsAmount,
}: PostPaymentLedgerParams): Promise<{ ok: boolean; msg: string }> => {
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
      amount: Number(totalPaid.toFixed(2)),
      leg: isBank ? bankLeg(selectedBank) : isMfs ? mfsLeg(selectedMfs) : cashLeg(),
    });
  }

  const stamp = Date.now();
  const txnRef = `PAY-${stamp}`;

  try {
    const res = await postTradeFinancialEntries({
      tradeType: "EXPENSE",
      tenders,
      invoiceNo: txnRef,
      refNo: txnRef,
      partyId: supplierPhone || String(supplierId || ""),
      head: "Payment",
      itemsSummary: `Supplier Payment of ${totalPaid} Tk`,
      notes: notes.trim(),
      date,
      totalDue: remainingDue,
    });

    return {
      ok: res.allSucceeded,
      msg: res.allSucceeded
        ? "Ledger entry updated successfully"
        : "Ledger entry could not be completely posted",
    };
  } catch (error: any) {
    console.error("Failed to post supplier payment to financial ledger:", error);
    return {
      ok: false,
      msg: error?.message || "Failed to update financial ledger",
    };
  }
};
