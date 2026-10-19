import moment from "moment";

export interface GenericDueInvoice {
  invoiceNo: string;
  dueAmount?: number | string | null;
  date?: string;
  salesDate?: string;
  purchaseDate?: string;
  saleDate?: string;
  createdAt?: string;
  id?: string | number | null;
  [key: string]: any;
}

export interface GenericSettlementAllocation {
  invoiceNo: string;
  originalDue: number;
  allocatedAmount: number;
  allocatedPaid: number;
  allocatedDiscount: number;
  remainingDue: number;
  paidAmount: number;
  discountAmount: number;
  dueAmount: number;
}

export interface GenericAllocationResult<TAllocation = GenericSettlementAllocation> {
  allocations: TAllocation[];
  allocatedTotal: number;
  remainingTotalDue: number;
}

/**
 * Enterprise standard FIFO chronological sorter for due invoices (Sales or Purchases).
 * Ensures the oldest pending invoice is placed first (Row 1).
 */
export const sortDueInvoicesFIFO = <T extends GenericDueInvoice>(invoices: T[]): T[] => {
  return [...invoices].sort((a, b) => {
    // 1. Compare Date (earliest/oldest date first)
    const dateA = a.purchaseDate || a.salesDate || a.saleDate || a.date || a.createdAt;
    const dateB = b.purchaseDate || b.salesDate || b.saleDate || b.date || b.createdAt;
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
 * Automatically distributes the entered payment or collection amount across pending invoices,
 * beginning with the oldest invoice first.
 */
export const allocateSettlementFIFO = <T extends GenericDueInvoice>(
  invoices: T[],
  enteredAmount: number,
  discountAmount: number = 0
): GenericAllocationResult => {
  let remainingPaid = Math.max(0, Number(enteredAmount) || 0);
  let remainingDiscount = Math.max(0, Number(discountAmount) || 0);
  const allocations: GenericSettlementAllocation[] = [];

  // Sort chronologically (oldest invoice first) and filter only invoices with pending due
  const sortedInvoices = sortDueInvoicesFIFO(invoices).filter(
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
export const allocateSettlementManual = <T extends GenericDueInvoice>(
  invoices: T[],
  enteredAmount: number,
  selectedInvoiceNos: Set<string>,
  discountAmount: number = 0
): GenericAllocationResult => {
  const selectedInvoices = invoices.filter(
    (inv) => selectedInvoiceNos.has(inv.invoiceNo) && Number(inv.dueAmount || 0) > 0
  );

  return allocateSettlementFIFO(selectedInvoices, enteredAmount, discountAmount);
};
