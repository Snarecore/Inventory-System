import React, { useState, useMemo } from "react";
import moment from "moment";
import {
  Search,
  EmptyState,
  TableSkeleton,
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
  TablePaginationFooter,
  ExcelExportButton,
} from "@/components/common";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaCoins,
  FaEye,
  FaCalendarAlt,
} from "react-icons/fa";
import { formatMoney } from "@/utils/formatters";
import { buildAndDownloadExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { CashClosingData, CashClosingReportSummary } from "@/types";

interface CashClosingReportTableProps {
  history: CashClosingData[];
  summary?: CashClosingReportSummary;
  monthString?: string;
  isLoading: boolean;
  onViewDenominations: (record: CashClosingData) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
}

export const CashClosingReportTable: React.FC<CashClosingReportTableProps> = ({
  history,
  summary,
  monthString,
  isLoading,
  onViewDenominations,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Month options (1-12)
  const monthOptions = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Year options (last 3 years to next year)
  const currentYearNum = parseInt(moment().format("YYYY"), 10);
  const yearOptions = [
    String(currentYearNum - 2),
    String(currentYearNum - 1),
    String(currentYearNum),
    String(currentYearNum + 1),
  ];

  // Filtering
  const term = searchQuery.trim().toLowerCase();
  const filteredList = useMemo(() => {
    return history.filter((item) => {
      if (!term) return true;
      const matchDate = (item.closingDate || "").toLowerCase().includes(term);
      const matchStatus = (item.status || "").toLowerCase().includes(term);
      const matchReason = (item.differenceReason || "").toLowerCase().includes(term);
      const matchRemarks = (item.remarks || "").toLowerCase().includes(term);
      return matchDate || matchStatus || matchReason || matchRemarks;
    });
  }, [history, term]);

  // Pagination
  const totalCount = filteredList.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedRows = filteredList.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Export to Excel
  const handleExport = async () => {
    const dataToExport = filteredList.length > 0 ? filteredList : history;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast("No cash closing history records available to export");
      return;
    }

    try {
      const rows = dataToExport.map((item, index) => ({
        "SL": index + 1,
        "Closing Date": item.closingDate,
        "Opening Cash": item.openingCash,
        "Deposit": item.todayDeposit,
        "Expense": item.todayExpense,
        "Expected Cash": item.expectedCash,
        "Counted Cash": item.countedCash ?? 0,
        "Variance / Diff": item.differenceAmount ?? 0,
        "Status": item.status,
        "Reason": item.differenceReason || "N/A",
        "Remarks": item.remarks || "—",
      }));

      await buildAndDownloadExcel(
        rows,
        `Cash_Closing_Report_${selectedYear}_${selectedMonth}`,
        "Cash Closing History"
      );
      showSuccessToast(`Exported ${dataToExport.length} cash closing records!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
        <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              Matched Days
            </span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
              {summary?.matchedDays ?? 0} Days
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <FaCheckCircle size={16} />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
              Mismatched Days
            </span>
            <span className="text-lg font-bold text-rose-700 dark:text-rose-400 block mt-0.5">
              {summary?.mismatchedDays ?? 0} Days
            </span>
          </div>
          <div className="p-2 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
            <FaExclamationTriangle size={16} />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300">
              Net Variance ({monthString || "This Month"})
            </span>
            <span
              className={`text-lg font-bold block mt-0.5 ${
                (summary?.totalDiff ?? 0) === 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : (summary?.totalDiff ?? 0) < 0
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              ৳ {formatMoney(summary?.totalDiff ?? 0)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
            <FaCoins size={16} />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <TableContainer className="w-full">
        {/* Table Toolbar */}
        <TableToolbar>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            {/* Left: Search Box */}
            <div className="w-full sm:w-72">
              <Search
                searchQuery={searchQuery}
                onSearchChange={(val) => {
                  setSearchQuery(val);
                  setCurrentPage(1);
                }}
                placeholder="Search by date, status, reason..."
              />
            </div>

            {/* Right Group: Month / Year Selectors & Excel Export */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Month Selector */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/60 border border-[var(--ui-border)] rounded-lg p-0.5 px-2 h-8">
                <FaCalendarAlt size={11} className="text-[var(--ui-text-muted)]" />
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-[var(--ui-text)] focus:outline-none cursor-pointer"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="bg-gray-50 dark:bg-gray-800/60 border border-[var(--ui-border)] rounded-lg p-0.5 px-2 h-8 flex items-center">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-[var(--ui-text)] focus:outline-none cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Excel Export Button */}
              <ExcelExportButton
                onClick={handleExport}
                title="Download Cash Closing History Excel Report"
              />
            </div>
          </div>
        </TableToolbar>

        {/* Table Scroll Content */}
        <TableScroll>
          {isLoading && history.length === 0 ? (
            <div className="p-3">
              <TableSkeleton columnCount={8} rowCount={6} />
            </div>
          ) : (
            <Table minWidth={850}>
              <TableHead>
                <TableTh width={50} align="center">SL</TableTh>
                <TableTh width={110}>Date</TableTh>
                <TableTh width={110} align="right">Opening Cash</TableTh>
                <TableTh width={100} align="right">Deposit</TableTh>
                <TableTh width={100} align="right">Expense</TableTh>
                <TableTh width={110} align="right">Expected</TableTh>
                <TableTh width={110} align="right">Counted</TableTh>
                <TableTh width={120} align="right">Variance</TableTh>
                <TableTh width={90} align="center">Status</TableTh>
                <TableTh width={80} align="center">Action</TableTh>
              </TableHead>

              <TableBody>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((item, index) => {
                    const sl = (safeCurrentPage - 1) * pageSize + index + 1;
                    const diff = Number(item.differenceAmount || 0);
                    const isBalanced = diff === 0;
                    const isClosed = (item.status || "").toLowerCase() === "closed";

                    return (
                      <TableRow key={item.id || item.closingDate || index}>
                        {/* SL */}
                        <TableCell align="center" className="text-black font-medium">
                          {sl}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="font-semibold text-black whitespace-nowrap">
                          {item.closingDate}
                        </TableCell>

                        {/* Opening Cash */}
                        <TableCell align="right" className="text-gray-700 dark:text-gray-300">
                          ৳ {formatMoney(item.openingCash)}
                        </TableCell>

                        {/* Deposit */}
                        <TableCell align="right" className="text-emerald-600 dark:text-emerald-400 font-medium">
                          +৳ {formatMoney(item.todayDeposit)}
                        </TableCell>

                        {/* Expense */}
                        <TableCell align="right" className="text-rose-600 dark:text-rose-400 font-medium">
                          -৳ {formatMoney(item.todayExpense)}
                        </TableCell>

                        {/* Expected Cash */}
                        <TableCell align="right" className="font-semibold text-sky-700 dark:text-sky-300">
                          ৳ {formatMoney(item.expectedCash)}
                        </TableCell>

                        {/* Counted Cash */}
                        <TableCell align="right" className="font-bold text-purple-700 dark:text-purple-300">
                          ৳ {formatMoney(item.countedCash || 0)}
                        </TableCell>

                        {/* Variance / Difference */}
                        <TableCell align="right">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              isBalanced
                                ? "text-emerald-600 dark:text-emerald-400"
                                : diff < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}৳ {formatMoney(diff)}
                          </span>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell align="center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isClosed
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300"
                            }`}
                          >
                            {item.status || "Open"}
                          </span>
                        </TableCell>

                        {/* Action: View Denominations */}
                        <TableCell align="center">
                          <button
                            type="button"
                            onClick={() => onViewDenominations(item)}
                            className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                            title="View Denomination Notes Breakdown"
                          >
                            <FaEye size={13} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <EmptyState
                        title="No cash closing history found"
                        description={`There are no cash reconciliation records for ${monthString || "the selected period"}.`}
                      />
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          )}
        </TableScroll>

        {/* Pagination Footer */}
        {!isLoading && totalCount > 0 && (
          <TablePaginationFooter
            totalCount={totalCount}
            pageCount={pageCount}
            currentPageNumber={safeCurrentPage}
            dataLimit={pageSize}
            setDataLimit={setPageSize}
            setCurrentPageNumber={setCurrentPage}
            handlePagination={(d) => setCurrentPage(d.selected + 1)}
            entityLabel="closings"
            pageSizeOptions={[10, 20, 50, 100]}
          />
        )}
      </TableContainer>
    </div>
  );
};

export default CashClosingReportTable;
