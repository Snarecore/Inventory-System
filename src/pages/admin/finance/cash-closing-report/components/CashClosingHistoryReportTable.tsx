import React, { useState } from "react";
import moment from "moment";
import { FiChevronDown, FiRotateCcw } from "react-icons/fi";
import Search from "@/components/table-components/Search";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TablePaginationFooter,
  TableSkeleton,
  TableActionButtons,
  EmptyState,
} from "@/components/common";
import ColumnVisibilityDropdown, {
  type ColumnItem,
} from "@/components/table-components/ColumnVisibilityDropdown";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useReportCompanyMeta } from "@/utils/trade-report-helpers";
import type { CashClosingData } from "@/types";
import {
  extractCashClosingMetrics,
  exportCashClosingReportExcel,
  downloadCashClosingReportPdf,
} from "../utils/cash-closing-report-helpers";

interface CashClosingHistoryReportTableProps {
  records: CashClosingData[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
  onViewDenominations: (record: CashClosingData) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "date", label: "Date" },
  { key: "openingCash", label: "Opening Cash" },
  { key: "deposit", label: "Deposit" },
  { key: "expense", label: "Expense" },
  { key: "expected", label: "Expected" },
  { key: "counted", label: "Counted" },
  { key: "variance", label: "Variance" },
  { key: "reason", label: "Reason" },
  { key: "closedBy", label: "Closed By" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

export const CashClosingHistoryReportTable: React.FC<
  CashClosingHistoryReportTableProps
> = ({
  records,
  isLoading,
  startDate,
  endDate,
  onViewDenominations,
}) => {
  const companyMeta = useReportCompanyMeta(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [varianceFilter, setVarianceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => {
      try {
        const saved = localStorage.getItem("cash_closing_report_table_columns");
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore storage errors
      }
      return {};
    }
  );

  const isColVisible = (key: string) => visibleColumns[key] !== false;

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const currentlyVisible = prev[key] !== false;
      const willBeVisible = !currentlyVisible;
      const countAfter = AVAILABLE_COLUMNS.filter((c) =>
        c.key === key ? willBeVisible : prev[c.key] !== false
      ).length;
      if (countAfter === 0) return prev;
      const next = { ...prev, [key]: willBeVisible };
      try {
        localStorage.setItem(
          "cash_closing_report_table_columns",
          JSON.stringify(next)
        );
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleResetColumns = () => {
    const resetState: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((c) => {
      resetState[c.key] = true;
    });
    setVisibleColumns(resetState);
    try {
      localStorage.removeItem("cash_closing_report_table_columns");
    } catch {
      // ignore storage errors
    }
  };

  const activeVisibleColumnCount = AVAILABLE_COLUMNS.filter((c) =>
    isColVisible(c.key)
  ).length;

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    varianceFilter !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "date_desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setVarianceFilter("all");
    setStatusFilter("all");
    setSortBy("date_desc");
    setCurrentPage(1);
  };

  const filtered = records.filter((item) => {
    const m = extractCashClosingMetrics(item);

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      const formattedDate = m.closingDate
        ? moment(m.closingDate).format("DD MMM, YYYY").toLowerCase()
        : "";
      if (
        !m.closingDate.toLowerCase().includes(q) &&
        !formattedDate.includes(q) &&
        !m.reasonLabel.toLowerCase().includes(q) &&
        !m.remarks.toLowerCase().includes(q) &&
        !m.status.toLowerCase().includes(q) &&
        !m.closedBy.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    if (varianceFilter === "matched" && !m.isMatched) return false;
    if (varianceFilter === "mismatched" && m.isMatched) return false;
    if (varianceFilter === "shortage" && m.varianceType !== "SHORTAGE") {
      return false;
    }
    if (varianceFilter === "surplus" && m.varianceType !== "SURPLUS") {
      return false;
    }

    if (statusFilter === "closed" && !m.isClosed) return false;
    if (statusFilter === "open" && m.isClosed) return false;

    return true;
  });

  if (sortBy === "date_asc") {
    filtered.sort((a, b) =>
      extractCashClosingMetrics(a).closingDate.localeCompare(
        extractCashClosingMetrics(b).closingDate
      )
    );
  } else if (sortBy === "date_desc") {
    filtered.sort((a, b) =>
      extractCashClosingMetrics(b).closingDate.localeCompare(
        extractCashClosingMetrics(a).closingDate
      )
    );
  } else if (sortBy === "variance_desc") {
    filtered.sort(
      (a, b) =>
        Math.abs(extractCashClosingMetrics(b).differenceAmount) -
        Math.abs(extractCashClosingMetrics(a).differenceAmount)
    );
  } else if (sortBy === "variance_asc") {
    filtered.sort(
      (a, b) =>
        Math.abs(extractCashClosingMetrics(a).differenceAmount) -
        Math.abs(extractCashClosingMetrics(b).differenceAmount)
    );
  }

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const renderSortHeader = (
    label: string,
    activeKey: "date" | "variance"
  ) => {
    const isAsc =
      sortBy === (activeKey === "date" ? "date_asc" : "variance_asc");
    const isDesc =
      sortBy === (activeKey === "date" ? "date_desc" : "variance_desc");

    const handleClick = () => {
      if (activeKey === "date") {
        setSortBy(isDesc ? "date_asc" : "date_desc");
      } else {
        setSortBy(
          isDesc ? "variance_asc" : isAsc ? "date_desc" : "variance_desc"
        );
      }
      setCurrentPage(1);
    };

    return (
      <span
        onClick={handleClick}
        className="inline-flex items-center gap-1 select-none text-current cursor-pointer"
      >
        <span>{label}</span>
        <FiChevronDown
          size={11}
          className={`text-current transition-transform duration-200 ${
            isAsc ? "rotate-180" : ""
          }`}
        />
      </span>
    );
  };

  return (
    <TableContainer>
      <TableToolbar>
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-48 md:w-56 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              setSearchQuery={setSearchQuery}
              placeholder="Search date, reason, remarks..."
            />
          </div>

          {/* Variance Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0">
            <select
              value={varianceFilter}
              onChange={(e) => {
                setVarianceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Variance</option>
              <option value="matched">Matched (৳ 0)</option>
              <option value="mismatched">Mismatched Only</option>
              <option value="shortage">Shortage (-)</option>
              <option value="surplus">Surplus (+)</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs"
              size={13}
            />
          </div>

          {/* Closing Status Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-28 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Status</option>
              <option value="closed">Closed</option>
              <option value="open">Open</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs"
              size={13}
            />
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center flex-wrap justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all active filters"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-danger-light)] hover:bg-[var(--ui-danger-border)] border border-[var(--ui-danger-border)] rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <FiRotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}

          <ColumnVisibilityDropdown
            columns={AVAILABLE_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <ReportExportButtons
            onExportExcel={async () => {
              const count = await exportCashClosingReportExcel(
                filtered,
                companyMeta
              );
              return `Exported ${count} cash closing records to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadCashClosingReportPdf(filtered, companyMeta);
              return "Cash closing report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      {/* Main Table */}
      <TableScroll>
        {isLoading && records.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Cash Closing Records Found"
            description="There are no cash reconciliation records matching the selected period or filters."
            buttonText={isAnyFilterActive ? "Reset Filters" : undefined}
            onButtonClick={handleResetFilters}
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && (
                <TableTh align="center" width={40}>
                  SL
                </TableTh>
              )}
              {isColVisible("date") && (
                <TableTh className="whitespace-nowrap">
                  {renderSortHeader("Closing Date", "date")}
                </TableTh>
              )}
              {isColVisible("openingCash") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Opening (৳)
                </TableTh>
              )}
              {isColVisible("deposit") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Deposit (৳)
                </TableTh>
              )}
              {isColVisible("expense") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Expense (৳)
                </TableTh>
              )}
              {isColVisible("expected") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Expected (৳)
                </TableTh>
              )}
              {isColVisible("counted") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Counted (৳)
                </TableTh>
              )}
              {isColVisible("variance") && (
                <TableTh align="right" className="whitespace-nowrap">
                  <div className="flex justify-end">
                    {renderSortHeader("Variance (৳)", "variance")}
                  </div>
                </TableTh>
              )}
              {isColVisible("reason") && (
                <TableTh className="whitespace-nowrap">Reason</TableTh>
              )}
              {isColVisible("closedBy") && (
                <TableTh className="whitespace-nowrap">Closed By</TableTh>
              )}
              {isColVisible("status") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Status
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" width={70} className="whitespace-nowrap">
                  Actions
                </TableTh>
              )}
            </TableHead>
            <TableBody>
              {paginated.map((item, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const m = extractCashClosingMetrics(item);
                const formattedDate = m.closingDate
                  ? moment(m.closingDate).format("DD MMM, YYYY")
                  : "N/A";

                return (
                  <tr
                    key={item.id || m.closingDate || idx}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-[var(--ui-text)] text-xs font-normal">
                        {sl}
                      </td>
                    )}

                    {isColVisible("date") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-medium whitespace-nowrap">
                        <span
                          onClick={() => onViewDenominations(item)}
                          title="View currency note breakdown"
                          className="cursor-pointer hover:text-[var(--primary-color)] transition-colors"
                        >
                          {formattedDate}
                        </span>
                      </td>
                    )}

                    {isColVisible("openingCash") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        ৳ {formatMoney(m.openingCash)}
                      </td>
                    )}

                    {isColVisible("deposit") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-success)] font-medium text-xs whitespace-nowrap">
                        +৳ {formatMoney(m.todayDeposit)}
                      </td>
                    )}

                    {isColVisible("expense") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-danger)] font-medium text-xs whitespace-nowrap">
                        -৳ {formatMoney(m.todayExpense)}
                      </td>
                    )}

                    {isColVisible("expected") && (
                      <td className="py-2.5 px-3 text-right font-semibold text-[var(--ui-text)] text-xs whitespace-nowrap">
                        ৳ {formatMoney(m.expectedCash)}
                      </td>
                    )}

                    {isColVisible("counted") && (
                      <td className="py-2.5 px-3 text-right font-bold text-[var(--ui-text)] text-xs whitespace-nowrap">
                        ৳ {formatMoney(m.countedCash)}
                      </td>
                    )}

                    {isColVisible("variance") && (
                      <td className="py-2.5 px-3 text-right text-xs whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            m.isMatched
                              ? "text-[var(--ui-success)]"
                              : m.differenceAmount < 0
                              ? "text-[var(--ui-danger)]"
                              : "text-amber-600"
                          }`}
                        >
                          {m.differenceAmount > 0 ? "+" : ""}৳{" "}
                          {formatMoney(m.differenceAmount)}
                        </span>
                      </td>
                    )}

                    {isColVisible("reason") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[180px] truncate">
                        {m.reasonLabel !== "N/A" ? (
                          <span className="text-[var(--ui-text)] font-medium">
                            {m.reasonLabel}
                          </span>
                        ) : (
                          <span className="text-[var(--ui-text-subtle)]">
                            N/A
                          </span>
                        )}
                      </td>
                    )}

                    {isColVisible("closedBy") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {m.closedBy || (
                          <span className="text-[var(--ui-text-subtle)]">
                            N/A
                          </span>
                        )}
                      </td>
                    )}

                    {isColVisible("status") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md font-semibold ${
                            m.isClosed
                              ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                              : "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)] border-[var(--ui-warning-border)]"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    )}

                    {isColVisible("actions") && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <TableActionButtons
                          onView={() => onViewDenominations(item)}
                          viewTitle="View Denomination Notes Breakdown"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableScroll>

      {/* Pagination */}
      {!isLoading && filtered.length > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={safePage}
          dataLimit={pageSize}
          setDataLimit={setPageSize}
          setCurrentPageNumber={setCurrentPage}
          handlePagination={(d) => setCurrentPage(d.selected + 1)}
          pageSizeOptions={[10, 15, 20, 50]}
          entityLabel="closings"
        />
      )}
    </TableContainer>
  );
};

export default CashClosingHistoryReportTable;
