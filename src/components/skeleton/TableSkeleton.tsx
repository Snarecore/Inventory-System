import React from "react";

export interface TableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columnCount = 6,
  rowCount = 8,
  className = "",
}) => {
  const cols = Math.max(1, columnCount);
  const rows = Math.max(1, rowCount);

  return (
    <div className={`w-full overflow-hidden animate-pulse bg-white border border-gray-200 rounded-xl p-3 ${className}`}>
      {/* Skeleton Header */}
      <div className="h-9 bg-[#41BEF3]/20 rounded-lg mb-3 flex items-center px-3 gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 bg-gray-300/80 rounded"
            style={{ width: i === 0 ? "32px" : `${Math.max(40, 100 / cols)}%` }}
          />
        ))}
      </div>

      {/* Skeleton Rows */}
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="h-8 bg-gray-50 rounded-md flex items-center px-3 gap-3 border border-gray-100"
          >
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={`h-3 rounded ${cIdx % 2 === 0 ? "bg-gray-200" : "bg-gray-100"}`}
                style={{ width: cIdx === 0 ? "24px" : `${Math.max(30, 80 / cols)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;
