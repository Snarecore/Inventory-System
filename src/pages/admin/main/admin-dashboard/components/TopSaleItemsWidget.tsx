import React from 'react';
import { FiGrid } from 'react-icons/fi';
import { mockTopSaleItems } from '../data/mockDashboardData';

export const TopSaleItemsWidget: React.FC = () => {
  return (
    <div className="w-full bg-white p-5 rounded-2xl shadow-sm flex flex-col h-full">
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="bg-[#e6f4fe] text-[#009fe3] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">Top 5 Sale Items</p>
        </div>

        <div className="border-b border-gray-200 mb-4"></div>
      </div>

      {/* Item List evenly distributed vertically */}
      <div className="flex flex-col justify-between flex-1 py-1 gap-3.5">
        {mockTopSaleItems.map((item, index) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div>
                  <span className="font-semibold text-gray-800 line-clamp-1">{item.name}</span>
                  <span className="text-[11px] text-gray-400"> • {item.category}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-gray-900">
                  ৳{item.totalRevenue.toLocaleString('en-IN')}
                </span>
                <p className="text-[10px] text-gray-500">{item.soldQuantity} Sold</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor:
                    index === 0
                      ? '#009fe3'
                      : index === 1
                      ? '#1b2850'
                      : index === 2
                      ? '#28c76f'
                      : index === 3
                      ? '#FE9F43'
                      : '#7367f0',
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopSaleItemsWidget;
