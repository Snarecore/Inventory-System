import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiRotateCcw, FiExternalLink } from "react-icons/fi";
import Search from "@/components/table-components/Search";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import ColumnVisibilityDropdown, {
  type ColumnItem,
} from "@/components/table-components/ColumnVisibilityDropdown";
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
  EmptyState,
  TableFilterSelect,
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { useReportCompanyMeta } from "@/utils/trade-report-helpers";
import type { LedgerPerson } from "@/types";
import {
  type NormalizedPersonSummaryRow,
  formatKhatabookDate,
  exportPersonSummaryExcel,
  downloadPersonSummaryPdf,
} from "../utils/khatabook-report-helpers";

interface KhatabookPersonSummaryReportTableProps {
  persons: LedgerPerson[];
  isLoading?: boolean;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "pabo", label: "Total Receivable (Pabo)" },
  { key: "dibo", label: "Total Payable (Dibo)" },
  { key: "netBalance", label: "Net Balance" },
  { key: "txnCount", label: "Transactions" },
  { key: "lastTxnDate", label: "Last Transaction" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

export const KhatabookPersonSummaryReportTable: React.FC<
  KhatabookPersonSummaryReportTableProps
> = ({ persons, isLoading }) => {
  const { t } = useTranslation();
  const companyMeta = useReportCompanyMeta();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);

  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(
    AVAILABLE_COLUMNS,
    "khatabook_report_person_summary_columns"
  );

  const normalizedRows: NormalizedPersonSummaryRow[] = useMemo(() => {
    return persons.map((p) => ({
      id: Number(p.id),
      name: p.name || `Person #${p.id}`,
      phone: p.phone || "",
      address: p.address || "",
      type: p.type || "PERSON",
      tag: p.tag || "Regular",
      totalPabo: p.totalPabo ?? 0,
      totalDibo: p.totalDibo ?? 0,
      totalCommission: p.totalCommission ?? 0,
      netBalance: p.netBalance ?? 0,
      transactionCount: p.transactionCount ?? 0,
      lastTransactionDate: p.lastTransactionDate || "",
      status: p.status || "Active",
    }));
  }, [persons]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return normalizedRows.filter((row) => {
      // 1. Balance filter
      if (balanceFilter === "PABO" && row.netBalance <= 0) return false;
      if (balanceFilter === "DIBO" && row.netBalance >= 0) return false;
      if (balanceFilter === "SETTLED" && row.netBalance !== 0) return false;

      // 2. Status filter
      if (statusFilter !== "all" && row.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. Search query
      if (q) {
        const target = `${row.name} ${row.phone} ${row.address} ${row.tag} ${row.type}`.toLowerCase();
        if (!target.includes(q)) return false;
      }

      return true;
    });
  }, [normalizedRows, debouncedSearch, balanceFilter, statusFilter]);

  // Sorted records (default by name)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // Totals for filtered records
  const filteredTotals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.totalPabo += r.totalPabo;
        acc.totalDibo += r.totalDibo;
        acc.netBalance += r.netBalance;
        acc.totalTxns += r.transactionCount;
        return acc;
      },
      { totalPabo: 0, totalDibo: 0, netBalance: 0, totalTxns: 0 }
    );
  }, [filtered]);

  // Pagination
  const totalCount = sorted.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = sorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    balanceFilter !== "all" ||
    statusFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setBalanceFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    return exportPersonSummaryExcel(sorted, companyMeta, visibleColumns);
  };

  const handleDownloadPdf = async () => {
    return downloadPersonSummaryPdf(sorted, companyMeta, visibleColumns);
  };

  return (
    <TableContainer>
      {/* Table Toolbar */}
      <TableToolbar>
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              {/* Search */}
              <div className="w-full sm:w-56 lg:w-64">
                <Search
                  searchQuery={searchQuery}
                  onSearchChange={(val) => {
                    setSearchQuery(val);
                    setCurrentPage(1);
                  }}
                  setSearchQuery={setSearchQuery}
                  placeholder={t("Search person name, phone...")}
                />
              </div>

              {/* Balance Filter */}
              <TableFilterSelect
                value={balanceFilter}
                onChange={(val) => {
                  setBalanceFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All Balances" },
                  { value: "PABO", label: "Receivable (Pabo)" },
                  { value: "DIBO", label: "Payable (Dibo)" },
                  { value: "SETTLED", label: "Settled (Zero)" },
                ]}
              />

              {/* Status Filter */}
              <TableFilterSelect
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />


              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-8 px-2 text-xs text-[var(--ui-text-muted)] hover:text-[var(--ui-danger)] hover:bg-[var(--ui-danger-light)]/40 rounded-lg border border-[var(--ui-border)] flex items-center gap-1 transition-colors cursor-pointer"
                  title={t("Reset all filters")}
                >
                  <FiRotateCcw size={12} />
                  <span className="hidden sm:inline">{t("Reset")}</span>
                </button>
              )}
            </div>

            {/* Right Export & Column Controls */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <ReportExportButtons
                onExportExcel={handleExportExcel}
                onDownloadPdf={handleDownloadPdf}
              />

              <ColumnVisibilityDropdown
                columns={AVAILABLE_COLUMNS}
                visibleColumns={visibleColumns}
                onToggle={handleToggleColumn}
                onReset={handleResetColumns}
              />
            </div>
          </div>
        </div>
      </TableToolbar>

      {/* Table Content */}
      <TableScroll>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columnCount={8} rowCount={6} />
          </div>
        ) : (
          <Table className="min-w-[1080px] w-full">
            <TableHead>
              {isColVisible("sl") && (
                <TableTh width={40} align="center" className="whitespace-nowrap">
                  SL
                </TableTh>
              )}
              {isColVisible("name") && (
                <TableTh width={120} className="whitespace-nowrap">
                  {t("Name")}
                </TableTh>
              )}
              {isColVisible("phone") && (
                <TableTh width={135} className="whitespace-nowrap">
                  {t("Phone")}
                </TableTh>
              )}
              {isColVisible("address") && (
                <TableTh className="whitespace-nowrap pl-4">
                  {t("Address")}
                </TableTh>
              )}
              {isColVisible("pabo") && (
                <TableTh width={115} align="right" className="whitespace-nowrap">
                  {t("Receivable (Pabo)")}
                </TableTh>
              )}
              {isColVisible("dibo") && (
                <TableTh width={115} align="right" className="whitespace-nowrap">
                  {t("Payable (Dibo)")}
                </TableTh>
              )}
              {isColVisible("netBalance") && (
                <TableTh width={115} align="right" className="whitespace-nowrap">
                  {t("Net Balance")}
                </TableTh>
              )}
              {isColVisible("txnCount") && (
                <TableTh width={55} align="center" className="whitespace-nowrap">
                  {t("Txns")}
                </TableTh>
              )}
              {isColVisible("lastTxnDate") && (
                <TableTh width={165} className="whitespace-nowrap">
                  {t("Last Transaction")}
                </TableTh>
              )}
              {isColVisible("status") && (
                <TableTh width={80} align="center" className="whitespace-nowrap">
                  {t("Status")}
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh width={45} align="center" className="whitespace-nowrap">
                  {t("Actions")}
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <EmptyState
                      title={t("No person accounts found")}
                      description={
                        hasActiveFilters
                          ? t("Try adjusting your search or balance filter.")
                          : t("No khatabook person accounts created yet.")
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => {
                  const net = row.netBalance;
                  const isPabo = net > 0;
                  const isDibo = net < 0;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                    >
                      {/* SL */}
                      {isColVisible("sl") && (
                        <td className="py-1.5 px-2.5 text-center text-[var(--ui-text-muted)] text-[11px] tabular-nums">
                          {(safePage - 1) * pageSize + idx + 1}
                        </td>
                      )}

                      {/* Name */}
                      {isColVisible("name") && (
                        <td className="py-1.5 px-2.5 truncate font-medium text-xs text-[var(--ui-text)]">
                          <Link
                            to={`/admin/khatabook/${row.id}`}
                            className="hover:text-[var(--primary-color)] transition-colors truncate inline-block max-w-[200px]"
                            title={row.name}
                          >
                            {row.name}
                          </Link>
                        </td>
                      )}

                      {/* Phone */}
                      {isColVisible("phone") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-[11px] text-[var(--ui-text-muted)] tabular-nums">
                          {row.phone || "-"}
                        </td>
                      )}

                      {/* Address */}
                      {isColVisible("address") && (
                        <td className="py-1.5 px-2.5 pl-4 truncate text-[11px] text-[var(--ui-text-subtle)] max-w-[200px]">
                          {row.address || "-"}
                        </td>
                      )}

                      {/* Total Pabo */}
                      {isColVisible("pabo") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-right text-xs font-semibold tabular-nums text-[var(--ui-success)]">
                          ৳{formatMoney(row.totalPabo)}
                        </td>
                      )}

                      {/* Total Dibo */}
                      {isColVisible("dibo") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-right text-xs font-semibold tabular-nums text-[var(--ui-danger)]">
                          ৳{formatMoney(row.totalDibo)}
                        </td>
                      )}

                      {/* Net Balance */}
                      {isColVisible("netBalance") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-right text-xs font-bold tabular-nums">
                          <span
                            className={
                              isPabo
                                ? "text-[var(--ui-success)]"
                                : isDibo
                                ? "text-[var(--ui-danger)]"
                                : "text-[var(--ui-text)]"
                            }
                          >
                            {isDibo ? "- " : ""}৳{formatMoney(Math.abs(net))}
                          </span>
                        </td>
                      )}

                      {/* Transactions count */}
                      {isColVisible("txnCount") && (
                        <td className="py-1.5 px-2.5 text-center text-xs tabular-nums text-[var(--ui-text-muted)]">
                          {row.transactionCount}
                        </td>
                      )}

                      {/* Last transaction date */}
                      {isColVisible("lastTxnDate") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-[11px] text-[var(--ui-text-muted)]">
                          {formatKhatabookDate(row.lastTransactionDate)}
                        </td>
                      )}

                      {/* Status */}
                      {isColVisible("status") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-center">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                              row.status.toLowerCase() === "active"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {isColVisible("actions") && (
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                          <Link
                            to={`/admin/khatabook/${row.id}`}
                            className="p-1 rounded hover:bg-[var(--primary-color-light)] text-[var(--primary-color)] transition-colors inline-block"
                            title={t("View Ledger")}
                          >
                            <FiExternalLink size={13} />
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </TableBody>

            {/* Summary Footer */}
            {paginated.length > 0 && (
              <tfoot>
                <tr className="bg-[var(--ui-surface-muted)]/80 font-bold border-t-2 border-[var(--ui-border)] text-xs text-[var(--ui-text)]">
                  <td
                    colSpan={
                      (isColVisible("sl") ? 1 : 0) +
                      (isColVisible("name") ? 1 : 0) +
                      (isColVisible("phone") ? 1 : 0) +
                      (isColVisible("address") ? 1 : 0)
                    }
                    className="py-2 px-3 text-right"
                  >
                    {t("Filtered Total Summary")} ({filtered.length} {t("Accounts")}):
                  </td>
                  {isColVisible("pabo") && (
                    <td className="py-2 px-2.5 text-right text-[var(--ui-success)] tabular-nums">
                      ৳{formatMoney(filteredTotals.totalPabo)}
                    </td>
                  )}
                  {isColVisible("dibo") && (
                    <td className="py-2 px-2.5 text-right text-[var(--ui-danger)] tabular-nums">
                      ৳{formatMoney(filteredTotals.totalDibo)}
                    </td>
                  )}
                  {isColVisible("netBalance") && (
                    <td className="py-2 px-2.5 text-right font-bold tabular-nums">
                      <span
                        className={
                          filteredTotals.netBalance > 0
                            ? "text-[var(--ui-success)]"
                            : filteredTotals.netBalance < 0
                            ? "text-[var(--ui-danger)]"
                            : "text-[var(--ui-text)]"
                        }
                      >
                        {filteredTotals.netBalance < 0 ? "- " : ""}৳
                        {formatMoney(Math.abs(filteredTotals.netBalance))}
                      </span>
                    </td>
                  )}
                  {isColVisible("txnCount") && (
                    <td className="py-2 px-2.5 text-center tabular-nums">
                      {filteredTotals.totalTxns}
                    </td>
                  )}
                  {isColVisible("lastTxnDate") && <td />}
                  {isColVisible("status") && <td />}
                  {isColVisible("actions") && <td />}
                </tr>
              </tfoot>
            )}
          </Table>
        )}
      </TableScroll>

      {/* Pagination Footer */}
      <TablePaginationFooter
        totalItems={totalCount}
        currentPage={safePage}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
      />
    </TableContainer>
  );
};

export default KhatabookPersonSummaryReportTable;
