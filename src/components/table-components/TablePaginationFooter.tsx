import React from "react";
import { useTranslation } from "react-i18next";
import Pagination from "@/components/pagination";

export interface TablePaginationFooterProps {
  // Standard / legacy props
  totalCount?: number;
  pageCount?: number;
  currentPageNumber?: number;
  dataLimit?: number;
  setDataLimit?: (limit: number) => void;
  setCurrentPageNumber?: (page: number) => void;
  handlePagination?: (data: { selected: number }) => void;
  entityLabel?: string;
  pageSizeOptions?: number[];
  className?: string;

  // Flexible alias props (used across report tables and lists)
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
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
  totalItems,
  totalPages,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const { t } = useTranslation();

  const total = totalCount ?? totalItems ?? 0;
  const limit = dataLimit ?? pageSize ?? 10;
  const current = currentPageNumber ?? currentPage ?? 1;
  const computedPageCount =
    pageCount !== undefined
      ? pageCount
      : totalPages !== undefined
      ? totalPages
      : Math.max(1, Math.ceil(total / (limit || 10)));

  if (total === 0) return null;

  const handlePageSelect = (page: number) => {
    if (setCurrentPageNumber) {
      setCurrentPageNumber(page);
    }
    if (onPageChange) {
      onPageChange(page);
    }
  };

  const handlePageSizeSelect = (newLimit: number) => {
    if (setDataLimit) {
      setDataLimit(newLimit);
    }
    if (onPageSizeChange) {
      onPageSizeChange(newLimit);
    }
    handlePageSelect(1);
  };

  const onPaginationClick = (data: { selected: number }) => {
    if (handlePagination) {
      handlePagination(data);
    } else {
      handlePageSelect(data.selected + 1);
    }
  };

  const hasPageSizeChanger = Boolean(setDataLimit || onPageSizeChange);

  const options = pageSizeOptions.includes(limit)
    ? pageSizeOptions
    : [...pageSizeOptions, limit].sort((a, b) => a - b);

  return (
    <div
      className={`p-2.5 sm:p-3 border-t border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs text-[var(--ui-text-muted)]">
        <span>{t("Show")}</span>
        {hasPageSizeChanger && (
          <select
            value={limit}
            onChange={(e) => handlePageSizeSelect(Number(e.target.value))}
            className="border border-[var(--ui-border-strong)] rounded px-1.5 py-0.5 text-xs bg-[var(--ui-surface)] text-[var(--ui-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        <span>
          {t("entries per page")} ({t("Total")} {total} {t(entityLabel)})
        </span>
      </div>

      <Pagination
        pageCount={computedPageCount}
        currentPageNumber={current}
        handlePagination={onPaginationClick}
      />
    </div>
  );
};

export default TablePaginationFooter;

