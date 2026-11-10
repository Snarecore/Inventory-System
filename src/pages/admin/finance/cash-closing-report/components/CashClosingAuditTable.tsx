import React, { useState } from "react";
import moment from "moment";
import { FiChevronDown } from "react-icons/fi";
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
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import ReportDateRangeControl from "@/components/reports/ReportDateRangeControl";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useReportCompanyMeta,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import type { CashClosingData } from "@/types";
import {
  extractCashClosingMetrics,
  aggregateVarianceReasons,
  exportCashClosingAuditExcel,
  downloadCashClosingAuditPdf,
} from "../utils/cash-closing-report-helpers";

interface CashClosingAuditTableProps extends ReportDateFilterProps {
  records: CashClosingData[];
  isLoading?: boolean;
  onViewDenominations: (record: CashClosingData) => void;
}

export const CashClosingAuditTable: React.FC<CashClosingAuditTableProps> = ({
  records,
  isLoading,
  startDate,
  endDate,
  dateRange,
  onPresetChange,
  onDateChange,
  onViewDenominations,
}) => {
  const companyMeta = useReportCompanyMeta(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Only discrepancy records (variance != 0)
  const mismatched = records.filter(
    (rec) => !extractCashClosingMetrics(rec).isMatched
  );

  const reasonSummaries = aggregateVarianceReasons(mismatched);

  const filtered = mismatched.filter((item) => {
    const m = extractCashClosingMetrics(item);

    if (typeFilter === "shortage" && m.varianceType !== "SHORTAGE") {
      return false;
    }
    if (typeFilter === "surplus" && m.varianceType !== "SURPLUS") {
      return false;
    }

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
        !m.closedBy.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Reason Breakdown Pills */}
      {reasonSummaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {reasonSummaries.map((rs) => {
            const isNegative = rs.netVariance < 0;
            return (
              <div
                key={rs.reason}
                className="px-3 py-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[var(--ui-text-muted)] truncate">
                    {rs.reason}
                  </div>
                  <div className="text-xs font-bold text-[var(--ui-text)] mt-0.5">
                    {rs.occurrences}{" "}
                    {rs.occurrences === 1 ? "incident" : "incidents"}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold shrink-0 ${
                    isNegative ? "text-[var(--ui-danger)]" : "text-amber-600"
                  }`}
                >
                  {rs.netVariance > 0 ? "+" : ""}৳{" "}
                  {formatMoney(rs.netVariance)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <TableContainer>
        <TableToolbar>
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="w-full sm:w-56 shrink-0">
              <Search
                searchQuery={searchQuery}
                onSearchChange={(val) => {
                  setSearchQuery(val);
                  setCurrentPage(1);
                }}
                setSearchQuery={setSearchQuery}
                placeholder="Search date, reason, closed by..."
              />
            </div>

            <ReportDateRangeControl
              startDate={startDate}
              endDate={endDate}
              dateRange={dateRange}
              onPresetChange={onPresetChange}
              onDateChange={onDateChange}
              onAfterChange={() => setCurrentPage(1)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <div className="relative w-40 shrink-0">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--primary-color)] cursor-pointer appearance-none"
              >
                <option value="all">All Discrepancies</option>
                <option value="shortage">Cash Shortage (-)</option>
                <option value="surplus">Cash Surplus (+)</option>
              </select>
              <FiChevronDown
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-subtle)] pointer-events-none text-xs"
                size={13}
              />
            </div>

            <ReportExportButtons
              onExportExcel={async () => {
                const count = await exportCashClosingAuditExcel(
                  filtered,
                  companyMeta
                );
                return `Exported ${count} variance records to Excel!`;
              }}
              onDownloadPdf={async () => {
                await downloadCashClosingAuditPdf(filtered, companyMeta);
                return "Cash variance audit PDF downloaded!";
              }}
            />
          </div>
        </TableToolbar>

        <TableScroll>
          {isLoading && records.length === 0 ? (
            <TableSkeleton columnCount={9} rowCount={6} />
          ) : paginated.length === 0 ? (
            <EmptyState
              title="No Discrepancies Found"
              description="All cash closing records in the selected period are balanced or match no discrepancies."
            />
          ) : (
            <Table>
              <TableHead>
                <TableTh align="center" width={40}>
                  SL
                </TableTh>
                <TableTh className="whitespace-nowrap">Closing Date</TableTh>
                <TableTh align="center" className="whitespace-nowrap">
                  Type
                </TableTh>
                <TableTh>Reason</TableTh>
                <TableTh align="right" className="whitespace-nowrap">
                  Expected (৳)
                </TableTh>
                <TableTh align="right" className="whitespace-nowrap">
                  Counted (৳)
                </TableTh>
                <TableTh align="right" className="whitespace-nowrap">
                  Variance (৳)
                </TableTh>
                <TableTh className="whitespace-nowrap">Closed By</TableTh>
                <TableTh>Remarks</TableTh>
                <TableTh align="center" width={70}>
                  Actions
                </TableTh>
              </TableHead>
              <TableBody>
                {paginated.map((item, idx) => {
                  const sl = (safePage - 1) * pageSize + idx + 1;
                  const m = extractCashClosingMetrics(item);
                  const isShortage = m.varianceType === "SHORTAGE";

                  return (
                    <tr
                      key={item.id || m.closingDate || idx}
                      className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-[var(--ui-text)] text-xs font-normal">
                        {sl}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[var(--ui-text)] text-xs whitespace-nowrap">
                        {m.closingDate
                          ? moment(m.closingDate).format("DD MMM, YYYY")
                          : "N/A"}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] border rounded-md font-semibold ${
                            isShortage
                              ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                              : "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)] border-[var(--ui-warning-border)]"
                          }`}
                        >
                          {isShortage ? "Shortage" : "Surplus"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-medium text-[var(--ui-text)] whitespace-nowrap">
                        {m.reasonLabel}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)] whitespace-nowrap">
                        ৳ {formatMoney(m.expectedCash)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)] whitespace-nowrap">
                        ৳ {formatMoney(m.countedCash)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-xs whitespace-nowrap">
                        <span
                          className={
                            isShortage
                              ? "text-[var(--ui-danger)]"
                              : "text-amber-600"
                          }
                        >
                          {m.differenceAmount > 0 ? "+" : ""}৳{" "}
                          {formatMoney(m.differenceAmount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {m.closedBy || (
                          <span className="text-[var(--ui-text-subtle)]">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[200px] truncate">
                        {m.remarks || (
                          <span className="text-[var(--ui-text-subtle)]">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <TableActionButtons
                          onView={() => onViewDenominations(item)}
                          viewTitle="View Denomination Notes Breakdown"
                        />
                      </td>
                    </tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableScroll>

        {!isLoading && filtered.length > 0 && (
          <TablePaginationFooter
            totalCount={totalCount}
            pageCount={pageCount}
            currentPageNumber={safePage}
            dataLimit={pageSize}
            setDataLimit={setPageSize}
            setCurrentPageNumber={setCurrentPage}
            handlePagination={(d) => setCurrentPage(d.selected + 1)}
            pageSizeOptions={[10, 20, 50]}
            entityLabel="discrepancies"
          />
        )}
      </TableContainer>
    </div>
  );
};

export default CashClosingAuditTable;
