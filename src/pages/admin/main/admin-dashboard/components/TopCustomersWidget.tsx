import React from 'react';
import { FiGrid } from 'react-icons/fi';
import { TopCustomer } from '../types/dashboard.types';

interface TopCustomersWidgetProps {
  data?: TopCustomer[];
}

export const TopCustomersWidget: React.FC<TopCustomersWidgetProps> = ({ data: propData }) => {
  const customers =
    propData && Array.isArray(propData) && propData.length > 0
      ? propData
      : [];

  return (
    <div className="w-full bg-white p-4 rounded-2xl shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">
            {customers.length > 0 ? `Top ${customers.length} Customers` : 'Top Customers'}
          </p>
        </div>

        <div className="border-b border-gray-200 mb-3"></div>

        {/* Customer Table/List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-black font-semibold">
                <th className="pb-1.5">SL</th>
                <th className="pb-1.5">Customer</th>
                <th className="pb-1.5">Phone</th>
                <th className="pb-1.5 text-center">Orders</th>
                <th className="pb-1.5 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-gray-400">
                    No customer transactions recorded yet.
                  </td>
                </tr>
              ) : (
                customers.map((cust, idx) => (
                <tr key={`${cust.id}-${idx}`} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-2 text-xs text-black font-bold">{idx + 1}</td>
                  <td className="py-2 text-black font-medium">
                    {cust.name}
                  </td>
                  <td className="py-2 text-xs text-black">{cust.phone || '-'}</td>
                  <td className="py-2 text-center text-xs font-semibold text-black">
                    {cust.ordersCount}
                  </td>
                  <td className="py-2 text-right font-bold text-black">
                    ৳{Number(cust.totalPurchases || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TopCustomersWidget;
