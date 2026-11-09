/**
 * Shared utility functions for Trade Settlements (Customer Collection & Supplier Payment)
 */

export interface GenericSettlementAllocation {
  invoiceNo: string;
  originalDue: number;
  allocatedAmount: number;
  paidAmount: number;
  dueAmount: number;
  remainingDue: number;
  allocatedPaid?: number;
}

/**
 * Computes FIFO allocation across an array of invoices given an entered amount.
 * Deterministic pure function: avoids redundant useMemo hooks.
 */
export function computeFIFOAllocations<T extends { invoiceNo: string; dueAmount?: number }>(
  invoices: T[],
  enteredAmount: number
): GenericSettlementAllocation[] {
  let rem = enteredAmount;
  const result: GenericSettlementAllocation[] = [];

  for (const inv of invoices) {
    const itemDue = Number(inv.dueAmount || 0);
    const paid = Math.max(0, Math.min(itemDue, rem));
    rem = Math.max(0, rem - paid);

    const allocatedAmount = Number(paid.toFixed(2));
    const remainingDue = Number(Math.max(0, itemDue - paid).toFixed(2));

    result.push({
      invoiceNo: inv.invoiceNo,
      originalDue: itemDue,
      allocatedAmount,
      allocatedPaid: allocatedAmount,
      paidAmount: allocatedAmount,
      dueAmount: remainingDue,
      remainingDue,
    });
  }

  return result;
}
