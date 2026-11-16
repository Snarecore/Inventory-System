import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiRotateCcw, FiExternalLink } from "react-icons/fi";
import { FaUserFriends, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import Search from "@/components/table-components/Search";
import ReportDateRangeControl from "@/components/reports/ReportDateRangeControl";
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
import {
  useReportCompanyMeta,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import type { LedgerPerson } from "@/types";
import {
  type NormalizedKhatabookTransaction,
  exportKhatabookTransactionsExcel,
  downloadKhatabookTransactionsPdf,
} from "../utils/khatabook-report-helpers";

interface KhatabookTransactionReportTableProps extends ReportDateFilterProps {
  transactions: NormalizedKhatabookTransaction[];
  persons?: LedgerPerson[];
  isLoading?: boolean;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "date", label: "Date & Time" },
  { key: "person", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "type", label: "Type" },
  { key: "method", label: "Method" },
  { key: "description", label: "Description & Ref" },
  { key: "receivable", label: "Receivable (+)" },
  { key: "payable", label: "Payable (-)" },
  { key: "commission", label: "Commission" },
  { key: "actions", label: "Actions" },
];

export const KhatabookTransactionReportTable: React.FC<
  KhatabookTransactionReportTableProps
> = ({ transactions, persons, isLoading, ...dateFilterProps }) => {
  const { t } = useTranslation();
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");

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
    "khatabook_report_txn_columns"
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return transactions.filter((txn) => {
      // 1. Type filter
      if (typeFilter !== "all") {
        if (typeFilter === "PABO" && txn.transactionType !== "PABO") return false;
        if (typeFilter === "DIBO" && txn.transactionType !== "DIBO") return false;
        if (typeFilter === "OPENING" && txn.transactionType !== "OPENING") return false;
      }

      // 2. Search query (person, phone, note, ref, paymentType)
      if (q) {
        const target =
          `${txn.personName} ${txn.personPhone} ${txn.note} ${txn.refNo} ${txn.paymentType}`.toLowerCase();
        if (!target.includes(q)) return false;
      }

      return true;
    });
  }, [transactions, debouncedSearch, typeFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "amount_desc") return b.amount - a.amount;
      if (sortBy === "amount_asc") return a.amount - b.amount;
      const tA = new Date(a.rawDate).getTime() || 0;
      const tB = new Date(b.rawDate).getTime() || 0;
      return sortBy === "oldest" ? tA - tB : tB - tA;
    });
  }, [filtered, sortBy]);

  // Totals for filtered records
  const filteredTotals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => {
        acc.totalReceivable += t.receivableAmount;
        acc.totalPayable += t.payableAmount;
        acc.totalCommission += t.commission;
        return acc;
      },
      { totalReceivable: 0, totalPayable: 0, totalCommission: 0 }
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
    debouncedSearch ||
    typeFilter !== "all" ||
    sortBy !== "latest";

  const singlePersonMeta = useMemo(() => {
    if (filtered.length === 0) return null;
    const firstTxn = filtered[0];
    const firstKey = firstTxn.personId
      ? String(firstTxn.personId)
      : `${firstTxn.personName}_${firstTxn.personPhone}`;
    const allMatch = filtered.every((t) => {
      const k = t.personId
        ? String(t.personId)
        : `${t.personName}_${t.personPhone}`;
      return k === firstKey;
    });

    if (!allMatch) return null;

    const personObj = persons?.find(
      (p) => Number(p.id) === Number(firstTxn.personId)
    );

    const net = filteredTotals.totalReceivable - filteredTotals.totalPayable;

    return {
      name: firstTxn.personName || personObj?.name || "Person",
      phone: firstTxn.personPhone || personObj?.phone || "",
      address: personObj?.address || "",
      netBalance: net,
      isReceivable: net > 0,
      isPayable: net < 0,
    };
  }, [filtered, persons, filteredTotals]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSortBy("latest");
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    return exportKhatabookTransactionsExcel(sorted, companyMeta, visibleColumns, persons);
  };

  const handleDownloadPdf = async () => {
    return downloadKhatabookTransactionsPdf(sorted, companyMeta, visibleColumns, persons);
  };

  return (
    <TableContainer>
      {/* Table Toolbar */}
      <TableToolbar>
        <div className="flex flex-col gap-2 w-full">
          {/* Top Control Bar: Search + Date Range + Filters */}
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
                  placeholder={t("Search person, note, ref...")}
                />
              </div>

              {/* Date Range Control */}
              <ReportDateRangeControl
                {...dateFilterProps}
                onAfterChange={() => setCurrentPage(1)}
              />

              {/* Type Filter */}
              <TableFilterSelect
                value={typeFilter}
                onChange={(val) => {
                  setTypeFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "PABO", label: "Receivable (Pabo)" },
                  { value: "DIBO", label: "Payable (Dibo)" },
                  { value: "OPENING", label: "Opening Balance" },
                ]}
              />

              {/* Sort By */}
              <TableFilterSelect
                value={sortBy}
                onChange={(val) => {
                  setSortBy(val);
                  setCurrentPage(1);
                }}
                isFiltered={sortBy !== "latest"}
                options={[
                  { value: "latest", label: "Latest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "amount_desc", label: "Amount: High to Low" },
                  { value: "amount_asc", label: "Amount: Low to High" },
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

      {/* Single Person Header Banner (shown when filtered/viewing a single person's ledger) */}
      {singlePersonMeta && (
        <div className="mx-2 mb-2 px-3.5 py-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--ui-text)]">
              <FaUserFriends className="text-[var(--primary-color)]" size={14} />
              <span>{singlePersonMeta.name}</span>
            </div>
            {singlePersonMeta.phone && (
              <div className="flex items-center gap-1 text-[var(--ui-text-muted)] text-xs">
                <FaPhone size={11} />
                <span>{singlePersonMeta.phone}</span>
              </div>
            )}
            {singlePersonMeta.address && (
              <div className="flex items-center gap-1 text-[var(--ui-text-subtle)] text-xs">
                <FaMapMarkerAlt size={11} />
                <span>{singlePersonMeta.address}</span>
              </div>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[var(--primary-color-light)] text-[var(--primary-color)]">
              {filtered.length} {t("Transactions")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 border ${
                singlePersonMeta.isReceivable
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : singlePersonMeta.isPayable
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  : "bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
              }`}
            >
              <span>
                {singlePersonMeta.isReceivable
                  ? `${companyMeta.businessName || "Zia Enterprises"} ওদের কাছে পাবে:`
                  : singlePersonMeta.isPayable
                  ? `${companyMeta.businessName || "Zia Enterprises"} ওদের দিবে (দেনা):`
                  : t("হিসাব পরিশোধিত (Settled):")}
              </span>
              <span className="tabular-nums">
                ৳{formatMoney(Math.abs(singlePersonMeta.netBalance))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table Content */}
      <TableScroll>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columnCount={8} rowCount={6} />
          </div>
        ) : (
          <Table className="min-w-[1020px] w-full">
            <TableHead>
              {isColVisible("sl") && (
                <TableTh width={40} align="center" className="whitespace-nowrap">
                  SL
                </TableTh>
              )}
              {isColVisible("date") && (
                <TableTh width={140} className="whitespace-nowrap">
                  {t("Date & Time")}
                </TableTh>
              )}
              {!singlePersonMeta && isColVisible("person") && (
                <TableTh width={120} className="whitespace-nowrap">
                  {t("Name")}
                </TableTh>
              )}
              {!singlePersonMeta && isColVisible("phone") && (
                <TableTh width={115} className="whitespace-nowrap">
                  {t("Phone")}
                </TableTh>
              )}
              {isColVisible("type") && (
                <TableTh width={125} align="center" className="whitespace-nowrap">
                  {t("Type")}
                </TableTh>
              )}
              {isColVisible("method") && (
                <TableTh width={80} align="center" className="whitespace-nowrap">
                  {t("Method")}
                </TableTh>
              )}
              {isColVisible("description") && (
                <TableTh className="whitespace-nowrap">
                  {t("Description & Ref")}
                </TableTh>
              )}
              {isColVisible("receivable") && (
                <TableTh width={105} align="right" className="whitespace-nowrap">
                  {t("Receivable (+)")}
                </TableTh>
              )}
              {isColVisible("payable") && (
                <TableTh width={105} align="right" className="whitespace-nowrap">
                  {t("Payable (-)")}
                </TableTh>
              )}
              {isColVisible("commission") && (
                <TableTh width={85} align="right" className="whitespace-nowrap">
                  {t("Commission")}
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
                  <td colSpan={singlePersonMeta ? 9 : 11} className="py-12 text-center">
                    <EmptyState
                      title={t("No transactions found")}
                      description={
                        hasActiveFilters
                          ? t("Try adjusting your date range or filters to see transactions.")
                          : t("No khatabook transactions recorded in this period.")
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((txn, idx) => {
                  const isPabo = txn.transactionType === "PABO";
                  const isDibo = txn.transactionType === "DIBO";
                  const isOpening = txn.transactionType === "OPENING";

                  const isCash = txn.paymentType === "CASH";
                  const isBank = txn.paymentType === "BANK";
                  const isMfs = txn.paymentType === "MFS";

                  return (
                    <tr
                      key={txn.id}
                      className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                    >
                      {/* SL */}
                      {isColVisible("sl") && (
                        <td className="py-1.5 px-2.5 text-center text-[var(--ui-text-muted)] text-[11px] tabular-nums">
                          {(safePage - 1) * pageSize + idx + 1}
                        </td>
                      )}

                      {/* Date */}
                      {isColVisible("date") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-[var(--ui-text-muted)] text-[11px]">
                          {txn.formattedDate}
                        </td>
                      )}

                      {/* Person Name */}
                      {!singlePersonMeta && isColVisible("person") && (
                        <td className="py-1.5 px-2.5 truncate font-medium text-xs text-[var(--ui-text)]">
                          <Link
                            to={`/admin/khatabook/${txn.personId}`}
                            className="hover:text-[var(--primary-color)] transition-colors truncate inline-block max-w-[120px]"
                            title={txn.personName}
                          >
                            {txn.personName}
                          </Link>
                        </td>
                      )}

                      {/* Phone */}
                      {!singlePersonMeta && isColVisible("phone") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-[11px] text-[var(--ui-text-muted)] tabular-nums">
                          {txn.personPhone || "-"}
                        </td>
                      )}

                      {/* Type Badge */}
                      {isColVisible("type") && (
                        <td className="py-1.5 px-3 whitespace-nowrap text-center">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border inline-block ${
                              isOpening
                                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                                : isPabo
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            }`}
                          >
                            {txn.displayType}
                          </span>
                        </td>
                      )}

                      {/* Method Badge */}
                      {isColVisible("method") && (
                        <td className="py-1.5 px-3 whitespace-nowrap text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block ${
                              isCash
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : isBank
                                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                                : isMfs
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                                : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                            }`}
                          >
                            {txn.paymentType}
                          </span>
                        </td>
                      )}

                      {/* Description & Ref */}
                      {isColVisible("description") && (
                        <td className="py-1.5 px-2.5 truncate whitespace-nowrap text-xs text-[var(--ui-text)]">
                          <span
                            className="inline-flex items-center gap-1 truncate max-w-[200px]"
                            title={`${txn.note}${txn.refNo ? ` (Ref: ${txn.refNo})` : ""}`}
                          >
                            <span className="truncate">{txn.note || "-"}</span>
                            {txn.refNo && (
                              <span className="text-[10px] text-[var(--ui-text-subtle)] font-normal shrink-0">
                                ({txn.refNo})
                              </span>
                            )}
                          </span>
                        </td>
                      )}

                      {/* Receivable */}
                      {isColVisible("receivable") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-right text-xs font-semibold tabular-nums text-[var(--ui-success)]">
                          {txn.receivableAmount > 0
                            ? `৳${txn.receivableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </td>
                      )}

                      {/* Payable */}
                      {isColVisible("payable") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-right text-xs font-semibold tabular-nums text-[var(--ui-danger)]">
                          {txn.payableAmount > 0
                            ? `৳${txn.payableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </td>
                      )}

                      {/* Commission */}
                      {isColVisible("commission") && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-right text-xs tabular-nums">
                          {txn.commission > 0 ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              ৳{txn.commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-[var(--ui-text-muted)]">-</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      {isColVisible("actions") && (
                        <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                          <Link
                            to={`/admin/khatabook/${txn.personId}`}
                            className="p-1 rounded hover:bg-[var(--primary-color-light)] text-[var(--primary-color)] transition-colors inline-block"
                            title={t("View Person Ledger")}
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
                      (isColVisible("date") ? 1 : 0) +
                      (!singlePersonMeta && isColVisible("person") ? 1 : 0) +
                      (!singlePersonMeta && isColVisible("phone") ? 1 : 0) +
                      (isColVisible("type") ? 1 : 0) +
                      (isColVisible("method") ? 1 : 0) +
                      (isColVisible("description") ? 1 : 0)
                    }
                    className="py-2 px-3 text-right"
                  >
                    {t("Filtered Total Summary")} ({filtered.length} {t("Txns")}):
                  </td>
                  {isColVisible("receivable") && (
                    <td className="py-2 px-2.5 text-right text-[var(--ui-success)] tabular-nums">
                      ৳{filteredTotals.totalReceivable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {isColVisible("payable") && (
                    <td className="py-2 px-2.5 text-right text-[var(--ui-danger)] tabular-nums">
                      ৳{filteredTotals.totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  {isColVisible("commission") && (
                    <td className="py-2 px-2.5 text-right text-amber-600 dark:text-amber-400 tabular-nums">
                      ৳{filteredTotals.totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  )}
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

export default KhatabookTransactionReportTable;
