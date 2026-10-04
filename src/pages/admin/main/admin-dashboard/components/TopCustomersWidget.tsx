import React from 'react';
import { FiGrid } from 'react-icons/fi';
import { mockTopCustomers } from '../data/mockDashboardData';

export const TopCustomersWidget: React.FC = () => {
  return (
    <div className="w-full bg-white p-5 rounded-2xl shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">Top 5 Customers</p>
        </div>

        <div className="border-b border-gray-200 mb-4"></div>

        {/* Customer Table/List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 font-semibold">
                <th className="pb-2">#</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Phone</th>
                <th className="pb-2 text-center">Orders</th>
                <th className="pb-2 text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockTopCustomers.map((cust, idx) => (
                <tr key={cust.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-2.5 text-xs text-gray-400 font-bold">{idx + 1}</td>
                  <td className="py-2.5">
                    <span className="font-semibold text-gray-800">{cust.name}</span>
                  </td>
                  <td className="py-2.5 text-xs text-gray-500">{cust.phone}</td>
                  <td className="py-2.5 text-center text-xs font-semibold text-gray-700">
                    {cust.ordersCount}
                  </td>
                  <td className="py-2.5 text-right font-bold text-gray-900">
                    ৳{cust.totalPurchases.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TopCustomersWidget;
