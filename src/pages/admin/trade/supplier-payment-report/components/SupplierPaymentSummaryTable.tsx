import React, { useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
} from "react-icons/fi";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
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
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import {
  useReportCompanyMeta,
  formatShortReportDate,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { PaymentReceiptData } from "@/types/payment.types";
import {
  type NormalizedPaymentRecord,
  type NormalizedSupplierDueRow,
  type SupplierPaymentSummary,
  aggregateSupplierPayments,
  buildSupplierStatementEntries,
  exportSupplierPaymentSummaryExcel,
  downloadSupplierPaymentSummaryPdf,
  exportSupplierStatementExcel,
  downloadSupplierStatementPdf,
} from "../utils/supplier-payment-report-helpers";
import InlinePurchaseLedgerRow from "./InlinePurchaseLedgerRow";
import SupplierStatementDrawer from "./SupplierStatementDrawer";

interface SupplierPaymentSummaryTableProps extends ReportDateFilterProps {
  payments: NormalizedPaymentRecord[];
  dueRows: NormalizedSupplierDueRow[];
  purchasesList?: any[];
  returnRecords?: any[];
  rawPartyData?: any;
  isLoading?: boolean;
  onViewReceipt?: (receipt: PaymentReceiptData) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "supplierName", label: "Supplier Name" },
  { key: "phone", label: "Phone" },
  { key: "voucherCount", label: "Vouchers" },
  { key: "billsSettled", label: "Bills Settled" },
  { key: "cashPaid", label: "Cash Paid (৳)" },
  { key: "digitalPaid", label: "Bank / MFS (৳)" },
  { key: "totalDiscount", label: "Discount (৳)" },
  { key: "totalPaid", label: "Total Paid (৳)" },
  { key: "currentDue", label: "Remaining Due (৳)" },
  { key: "lastPaymentDate", label: "Last Payment" },
  { key: "actions", label: "History" },
];

export const SupplierPaymentSummaryTable: React.FC<
  SupplierPaymentSummaryTableProps
> = ({
  payments,
  dueRows,
  purchasesList = [],
  returnRecords = [],
  rawPartyData,
  isLoading,
  onViewReceipt,
  ...dateFilterProps
}) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("paid_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Expandable row & Drawer states
  const [expandedSupplierKey, setExpandedSupplierKey] = useState<string | null>(null);
  const [downloadingSupplierKey, setDownloadingSupplierKey] = useState<string | null>(null);
  const [selectedSupplierForDrawer, setSelectedSupplierForDrawer] =
    useState<SupplierPaymentSummary | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(
    AVAILABLE_COLUMNS,
    "supplier_payment_report_summary_columns_v2"
  );

  const summaries = useMemo(
    () => aggregateSupplierPayments(payments, dueRows),
    [payments, dueRows]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = q
      ? summaries.filter(
          (s) =>
            s.supplierName.toLowerCase().includes(q) ||
            s.supplierPhone.toLowerCase().includes(q)
        )
      : summaries;

    return [...list].sort((a, b) => {
      if (sortBy === "due_desc") return b.currentDue - a.currentDue;
      if (sortBy === "vouchers_desc") return b.voucherCount - a.voucherCount;
      if (sortBy === "name_asc")
        return a.supplierName.localeCompare(b.supplierName);
      return b.totalPaid - a.totalPaid;
    });
  }, [summaries, debouncedSearch, sortBy]);

  const totals = useMemo(() => {
    let sumVouchers = 0;
    let sumBills = 0;
    let sumCash = 0;
    let sumDigital = 0;
    let sumDiscount = 0;
    let sumPaid = 0;
    let sumDue = 0;

    filtered.forEach((s) => {
      sumVouchers += s.voucherCount || 0;
      sumBills += s.billsSettled || 0;
      sumCash += s.cashPaid || 0;
      sumDigital += s.digitalPaid || 0;
      sumDiscount += s.totalDiscount || 0;
      sumPaid += s.totalPaid || 0;
      sumDue += s.currentDue || 0;
    });

    return {
      sumVouchers,
      sumBills,
      sumCash,
      sumDigital,
      sumDiscount,
      sumPaid,
      sumDue,
    };
  }, [filtered]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilter = searchQuery.trim() !== "" || sortBy !== "paid_desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("paid_desc");
    setCurrentPage(1);
  };

  const handleDownloadSingleSupplierPdf = async (s: SupplierPaymentSummary) => {
    try {
      setDownloadingSupplierKey(s.supplierKey);
      const stmt = buildSupplierStatementEntries(
        s,
        payments,
        purchasesList,
        returnRecords,
        rawPartyData,
        {
          startDate: dateFilterProps.startDate,
          endDate: dateFilterProps.endDate,
        }
      );
      await downloadSupplierStatementPdf(stmt, companyMeta);
      showSuccessToast(`Purchase ledger PDF downloaded for ${s.supplierName}!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to download purchase ledger PDF");
    } finally {
      setDownloadingSupplierKey(null);
    }
  };

  const handleExportSingleSupplierExcel = async (s: SupplierPaymentSummary) => {
    try {
      const stmt = buildSupplierStatementEntries(
        s,
        payments,
        purchasesList,
        returnRecords,
        rawPartyData,
        {
          startDate: dateFilterProps.startDate,
          endDate: dateFilterProps.endDate,
        }
      );
      await exportSupplierStatementExcel(stmt, companyMeta);
      showSuccessToast(`Purchase ledger Excel exported for ${s.supplierName}!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export purchase ledger Excel");
    }
  };

  return (
    <TableContainer>
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <ReportDateRangeControl
            {...dateFilterProps}
            onAfterChange={() => setCurrentPage(1)}
          />

          <div className="w-full sm:w-56 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              setSearchQuery={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              placeholder="Search supplier name, phone..."
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-2.5 pr-7 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer font-medium"
            >
              <option value="paid_desc">Highest Paid Amount</option>
              <option value="due_desc">Highest Remaining Due</option>
              <option value="vouchers_desc">Most Vouchers</option>
              <option value="name_asc">Supplier Name A–Z</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none"
              size={12}
            />
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 h-8 text-xs font-semibold text-[var(--ui-danger)] bg-[var(--ui-danger-light)] hover:bg-[var(--ui-danger-border)] border border-[var(--ui-danger-border)] rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <FiRotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          <ColumnVisibilityDropdown
            columns={AVAILABLE_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <ReportExportButtons
            onExportExcel={async () => {
              const targetSupplier =
                (expandedSupplierKey
                  ? filtered.find((s) => s.supplierKey === expandedSupplierKey)
                  : null) ||
                (filtered.length === 1 ? filtered[0] : null);

              if (targetSupplier) {
                const stmt = buildSupplierStatementEntries(
                  targetSupplier,
                  payments,
                  purchasesList,
                  returnRecords,
                  rawPartyData,
                  {
                    startDate: dateFilterProps.startDate,
                    endDate: dateFilterProps.endDate,
                  }
                );
                const count = await exportSupplierStatementExcel(
                  stmt,
                  companyMeta
                );
                return `Exported ${count} statement entries for ${targetSupplier.supplierName} to Excel!`;
              }

              const count = await exportSupplierPaymentSummaryExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} supplier payment summaries to Excel!`;
            }}
            onDownloadPdf={async () => {
              const targetSupplier =
                (expandedSupplierKey
                  ? filtered.find((s) => s.supplierKey === expandedSupplierKey)
                  : null) ||
                (filtered.length === 1 ? filtered[0] : null);

              if (targetSupplier) {
                const stmt = buildSupplierStatementEntries(
                  targetSupplier,
                  payments,
                  purchasesList,
                  returnRecords,
                  rawPartyData,
                  {
                    startDate: dateFilterProps.startDate,
                    endDate: dateFilterProps.endDate,
                  }
                );
                await downloadSupplierStatementPdf(stmt, companyMeta);
                return `Supplier statement PDF downloaded for ${targetSupplier.supplierName}!`;
              }

              await downloadSupplierPaymentSummaryPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Supplier payment summary report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && payments.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Supplier Payment Data Found"
            description="No supplier payments match the selected date range or search."
            buttonText={hasActiveFilter ? "Reset Filters" : undefined}
            onButtonClick={hasActiveFilter ? handleResetFilters : undefined}
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && (
                <TableTh align="center" width={42} className="whitespace-nowrap">
                  SL
                </TableTh>
              )}
              {isColVisible("supplierName") && (
                <TableTh className="whitespace-nowrap">Supplier Name</TableTh>
              )}
              {isColVisible("phone") && (
                <TableTh className="whitespace-nowrap">Phone</TableTh>
              )}
              {isColVisible("voucherCount") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Vouchers
                </TableTh>
              )}
              {isColVisible("billsSettled") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Bills Settled
                </TableTh>
              )}
              {isColVisible("cashPaid") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Cash (৳)
                </TableTh>
              )}
              {isColVisible("digitalPaid") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Bank / MFS (৳)
                </TableTh>
              )}
              {isColVisible("totalDiscount") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Discount (৳)
                </TableTh>
              )}
              {isColVisible("totalPaid") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Total Paid (৳)
                </TableTh>
              )}
              {isColVisible("currentDue") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Remaining Due (৳)
                </TableTh>
              )}
              {isColVisible("lastPaymentDate") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Last Payment
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" className="whitespace-nowrap w-24">
                  History
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((s, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const isExpanded = expandedSupplierKey === s.supplierKey;

                return (
                  <React.Fragment key={`${s.supplierKey}_${idx}`}>
                    <tr
                      className={`hover:bg-[var(--primary-color-light)]/40 transition-colors ${
                        isExpanded
                          ? "bg-[var(--primary-color-light)]/30 font-medium"
                          : ""
                      }`}
                    >
                      {isColVisible("sl") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                          {sl}
                        </td>
                      )}
                      {isColVisible("supplierName") && (
                        <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)] max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSupplierKey(
                                  isExpanded ? null : s.supplierKey
                                );
                              }}
                              className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] transition-colors cursor-pointer shrink-0"
                              title={
                                isExpanded
                                  ? "Collapse History"
                                  : "Expand Statement History"
                              }
                            >
                              {isExpanded ? (
                                <FiChevronDown
                                  size={13}
                                  className="text-[var(--primary-color)]"
                                />
                              ) : (
                                <FiChevronRight size={13} />
                              )}
                            </button>
                            <span
                              onClick={() =>
                                setExpandedSupplierKey(
                                  isExpanded ? null : s.supplierKey
                                )
                              }
                              className="truncate cursor-pointer hover:text-[var(--primary-color)] transition-colors"
                              title="Click to toggle statement history"
                            >
                              {s.supplierName}
                            </span>
                          </div>
                        </td>
                      )}
                      {isColVisible("phone") && (
                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                          {s.supplierPhone}
                        </td>
                      )}
                      {isColVisible("voucherCount") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                          {s.voucherCount}
                        </td>
                      )}
                      {isColVisible("billsSettled") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                          {s.billsSettled}
                        </td>
                      )}
                      {isColVisible("cashPaid") && (
                        <td className="py-2.5 px-3 text-right text-xs text-[var(--ui-text)] tabular-nums whitespace-nowrap">
                          ৳ {formatMoney(s.cashPaid)}
                        </td>
                      )}
                      {isColVisible("digitalPaid") && (
                        <td className="py-2.5 px-3 text-right text-xs text-[var(--primary-color)] tabular-nums whitespace-nowrap">
                          {s.digitalPaid > 0
                            ? `৳ ${formatMoney(s.digitalPaid)}`
                            : "-"}
                        </td>
                      )}
                      {isColVisible("totalDiscount") && (
                        <td className="py-2.5 px-3 text-right text-xs text-amber-600 tabular-nums whitespace-nowrap">
                          {s.totalDiscount > 0
                            ? `৳ ${formatMoney(s.totalDiscount)}`
                            : "-"}
                        </td>
                      )}
                      {isColVisible("totalPaid") && (
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          ৳ {formatMoney(s.totalPaid)}
                        </td>
                      )}
                      {isColVisible("currentDue") && (
                        <td className="py-2.5 px-3 text-right text-xs font-semibold tabular-nums whitespace-nowrap">
                          {s.currentDue > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              ৳ {formatMoney(s.currentDue)}
                            </span>
                          ) : (
                            <span className="text-[var(--ui-text-subtle)]">-</span>
                          )}
                        </td>
                      )}
                      {isColVisible("lastPaymentDate") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                          {s.lastPaymentDate
                            ? formatShortReportDate(s.lastPaymentDate)
                            : "-"}
                        </td>
                      )}
                      {isColVisible("actions") && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            {/* Direct Download Purchase Ledger PDF (Icon Only) */}
                            <button
                              type="button"
                              disabled={downloadingSupplierKey === s.supplierKey}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleDownloadSingleSupplierPdf(s);
                              }}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                              title="Download Purchase Ledger PDF"
                            >
                              <FaFilePdf size={13} />
                            </button>

                            {/* Direct Export Purchase Ledger Excel (Icon Only) */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleExportSingleSupplierExcel(s);
                              }}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                              title="Export Purchase Ledger to Excel"
                            >
                              <FaFileExcel size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Inline Collapsible Statement / Purchase Ledger Section */}
                    {isExpanded && (
                      <InlinePurchaseLedgerRow
                        supplier={s}
                        startDate={dateFilterProps.startDate}
                        endDate={dateFilterProps.endDate}
                        purchasesList={purchasesList}
                        payments={payments}
                        returnRecords={returnRecords}
                        rawPartyData={rawPartyData}
                        companyMeta={companyMeta}
                        activeVisibleColumnCount={activeVisibleColumnCount}
                        onViewReceipt={onViewReceipt}
                        onOpenDrawer={() => {
                          setSelectedSupplierForDrawer(s);
                          setIsDrawerOpen(true);
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Grand Total Summary Row */}
              <tr className="bg-[var(--ui-surface-muted)]/70 font-bold border-t-2 border-[var(--ui-border)] text-xs text-[var(--ui-text)]">
                <td
                  colSpan={
                    [
                      isColVisible("sl"),
                      isColVisible("supplierName"),
                      isColVisible("phone"),
                    ].filter(Boolean).length
                  }
                  className="py-2.5 px-3 text-left font-bold"
                >
                  Grand Total ({filtered.length} Suppliers)
                </td>

                {isColVisible("voucherCount") && (
                  <td className="py-2.5 px-3 text-center font-bold">
                    {totals.sumVouchers}
                  </td>
                )}

                {isColVisible("billsSettled") && (
                  <td className="py-2.5 px-3 text-center font-bold">
                    {totals.sumBills}
                  </td>
                )}

                {isColVisible("cashPaid") && (
                  <td className="py-2.5 px-3 text-right font-bold text-[var(--ui-text)]">
                    ৳ {formatMoney(totals.sumCash)}
                  </td>
                )}

                {isColVisible("digitalPaid") && (
                  <td className="py-2.5 px-3 text-right font-bold text-[var(--primary-color)]">
                    {totals.sumDigital > 0
                      ? `৳ ${formatMoney(totals.sumDigital)}`
                      : "-"}
                  </td>
                )}

                {isColVisible("totalDiscount") && (
                  <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                    {totals.sumDiscount > 0
                      ? `৳ ${formatMoney(totals.sumDiscount)}`
                      : "-"}
                  </td>
                )}

                {isColVisible("totalPaid") && (
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    ৳ {formatMoney(totals.sumPaid)}
                  </td>
                )}

                {isColVisible("currentDue") && (
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                    ৳ {formatMoney(totals.sumDue)}
                  </td>
                )}

                {isColVisible("lastPaymentDate") && <td></td>}
                {isColVisible("actions") && <td></td>}
              </tr>
            </TableBody>
          </Table>
        )}
      </TableScroll>

      {!isLoading && totalCount > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={safePage}
          dataLimit={pageSize}
          setDataLimit={(limit) => {
            setPageSize(limit);
            setCurrentPage(1);
          }}
          setCurrentPageNumber={setCurrentPage}
          handlePagination={(d) => setCurrentPage(d.selected + 1)}
          entityLabel="suppliers"
        />
      )}

      {/* Supplier Statement Drawer */}
      <SupplierStatementDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedSupplierForDrawer(null);
        }}
        selectedSupplier={selectedSupplierForDrawer}
        allSuppliers={filtered}
        onSelectSupplier={(s) => setSelectedSupplierForDrawer(s)}
        payments={payments}
        purchasesList={purchasesList}
        returnRecords={returnRecords}
        rawPartyData={rawPartyData}
        onViewReceipt={onViewReceipt}
      />
    </TableContainer>
  );
};

export default SupplierPaymentSummaryTable;
