import React from "react";
import Pagination from "@/components/pagination";

export interface TablePaginationFooterProps {
  totalCount: number;
  pageCount: number;
  currentPageNumber: number;
  dataLimit: number;
  setDataLimit?: (limit: number) => void;
  setCurrentPageNumber?: (page: number) => void;
  handlePagination?: (data: { selected: number }) => void;
  entityLabel?: string;
  pageSizeOptions?: number[];
  className?: string;
}

export const TablePaginationFooter: React.FC<TablePaginationFooterProps> = ({
  totalCount,
  pageCount,
  currentPageNumber,
  dataLimit,
  setDataLimit,
  setCurrentPageNumber,
  handlePagination,
  entityLabel = "entries",
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
}) => {
  if (totalCount === 0) return null;

  return (
    <div
      className={`p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Show</span>
        {setDataLimit && (
          <select
            value={dataLimit}
            onChange={(e) => {
              setDataLimit(Number(e.target.value));
              if (setCurrentPageNumber) setCurrentPageNumber(1);
            }}
            className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        <span>
          entries per page (Total {totalCount} {entityLabel})
        </span>
      </div>

      <Pagination
        pageCount={pageCount}
        currentPageNumber={currentPageNumber}
        handlePagination={handlePagination}
      />
    </div>
  );
};

export default TablePaginationFooter;
