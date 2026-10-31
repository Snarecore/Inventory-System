import React from 'react';
import { FiGrid } from 'react-icons/fi';
import type { TopSaleItem } from '../types/dashboard.types';

interface TopSaleItemsWidgetProps {
  items: TopSaleItem[];
}

export const TopSaleItemsWidget: React.FC<TopSaleItemsWidgetProps> = ({ items }) => {
  return (
    <div className="w-full bg-[var(--ui-surface)] p-4 rounded-2xl shadow-sm flex flex-col h-full">
      <div>
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="bg-[var(--primary-color-light)] text-[var(--primary-color)] p-1.5 rounded-full">
            <FiGrid size={18} />
          </span>
          <p className="text-xl font-bold">Top 5 Sale Items</p>
        </div>

        <div className="border-b border-[var(--ui-border)] mb-3"></div>
      </div>

      {/* Item List evenly distributed vertically */}
      <div className="flex flex-col justify-between flex-1 py-1 gap-3">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div>
                  <span className="font-semibold text-[var(--ui-text)] line-clamp-1">{item.name}</span>
                  <span className="text-[11px] text-[var(--ui-text-subtle)]"> • {item.category}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-[var(--ui-text)]">
                  ৳{item.totalRevenue.toLocaleString('en-IN')}
                </span>
                <p className="text-[10px] text-[var(--ui-text-muted)]">{item.soldQuantity} Sold</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[var(--ui-surface-sunken)] rounded-full h-2 overflow-hidden">
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
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--ui-text-muted)]">
            No product sales data available yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default TopSaleItemsWidget;
