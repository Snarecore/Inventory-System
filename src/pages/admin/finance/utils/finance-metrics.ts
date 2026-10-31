export interface FinancialEntitySummary {
  total: number;
  active: number;
  inactive: number;
  totalBalance: number;
}

/**
 * Universal single-pass metrics calculator for Bank Accounts & MFS Wallets.
 * Computes active, inactive, total count, and aggregate balance.
 */
export const calculateAccountMetrics = <
  T extends { status?: string; currentBalance?: number | string; balance?: number | string }
>(
  items: T[] = []
): FinancialEntitySummary => {
  let active = 0;
  let inactive = 0;
  let totalBalance = 0;

  for (const item of items) {
    const isItemActive = String(item.status || "").toLowerCase() === "active";
    if (isItemActive) {
      active++;
      totalBalance += Number(item.currentBalance ?? item.balance ?? 0);
    } else {
      inactive++;
    }
  }

  return {
    total: items.length,
    active,
    inactive,
    totalBalance,
  };
};
