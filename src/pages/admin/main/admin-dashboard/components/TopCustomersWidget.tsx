import React from 'react';
import { FiGrid } from 'react-icons/fi';
import type { TopCustomer } from '../types/dashboard.types';

interface TopCustomersWidgetProps {
  customers: TopCustomer[];
}

export const TopCustomersWidget: React.FC<TopCustomersWidgetProps> = ({ customers }) => {
  return (
    <div className="premium-panel w-full p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="bg-[var(--primary-color-light)] text-[var(--primary-color)] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">Top 5 Customers</p>
        </div>

        <div className="border-b border-[var(--ui-border)] mb-3"></div>

        {/* Customer Table/List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--ui-border)] text-xs text-[var(--ui-text)] font-semibold">
                <th className="pb-1.5">SL</th>
                <th className="pb-1.5">Customer</th>
                <th className="pb-1.5">Phone</th>
                <th className="pb-1.5 text-center">Orders</th>
                <th className="pb-1.5 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ui-border)]">
              {customers.map((cust, idx) => (
                <tr key={cust.id} className="hover:bg-[var(--ui-surface-muted)]/70 transition-colors">
                  <td className="py-2 text-xs text-[var(--ui-text)] font-bold">{idx + 1}</td>
                  <td className="py-2">
                    <span className="text-[var(--ui-text)]">{cust.name}</span>
                  </td>
                  <td className="py-2 text-xs text-[var(--ui-text)]">{cust.phone}</td>
                  <td className="py-2 text-center text-xs font-semibold text-[var(--ui-text)]">
                    {cust.ordersCount}
                  </td>
                  <td className="py-2 text-right font-bold text-[var(--ui-text)]">
                    ৳{cust.totalPurchases.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-[var(--ui-text-muted)]">
                    No sales data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TopCustomersWidget;
