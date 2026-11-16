import React, { useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
  FiFileText,
  FiMaximize2,
} from "react-icons/fi";
import { FaStore, FaFileExcel, FaFilePdf } from "react-icons/fa";
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
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import {
  useReportCompanyMeta,
  formatShortReportDate,
} from "@/utils/trade-report-helpers";
import type { PaymentReceiptData } from "@/types/payment.types";
import {
  type NormalizedSupplierDueRow,
  type SupplierPaymentSummary,
  type NormalizedPaymentRecord,
  buildSupplierStatementEntries,
  exportSupplierDueReportExcel,
  downloadSupplierDueReportPdf,
  exportSupplierStatementExcel,
  downloadSupplierStatementPdf,
} from "../utils/supplier-payment-report-helpers";
import SupplierStatementTable from "./SupplierStatementTable";
import SupplierStatementDrawer from "./SupplierStatementDrawer";

interface SupplierDueReportTableProps {
  dueRows: NormalizedSupplierDueRow[];
  payments?: NormalizedPaymentRecord[];
  purchasesList?: any[];
  returnRecords?: any[];
  rawPartyData?: any;
  isLoading?: boolean;
  onViewReceipt?: (receipt: PaymentReceiptData) => void;
  startDate?: string;
  endDate?: string;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "supplierName", label: "Supplier Name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "invoiceCount", label: "Pending Invoices" },
  { key: "lastPurchaseDate", label: "Last Purchase Date" },
  { key: "totalDue", label: "Outstanding Due (৳)" },
  { key: "actions", label: "History" },
];

export const SupplierDueReportTable: React.FC<SupplierDueReportTableProps> = ({
  dueRows,
  payments = [],
  purchasesList = [],
  returnRecords = [],
  rawPartyData,
  isLoading,
  onViewReceipt,
  startDate,
  endDate,
}) => {
  const companyMeta = useReportCompanyMeta();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("due_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [expandedSupplierKey, setExpandedSupplierKey] = useState<string | null>(null);
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
    "supplier_due_report_table_columns_v2"
  );

  const adaptedSummaries: SupplierPaymentSummary[] = useMemo(() => {
    return dueRows.map((d) => ({
      supplierKey: d.supplierKey,
      supplierId: d.supplierId,
      supplierName: d.supplierName,
      supplierPhone: d.supplierPhone,
      voucherCount: 0,
      billsSettled: d.invoiceCount,
      cashPaid: 0,
      digitalPaid: 0,
      totalDiscount: 0,
      totalPaid: 0,
      currentDue: d.totalDue,
      lastPaymentDate: d.lastPurchaseDate || "",
    }));
  }, [dueRows]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = q
      ? dueRows.filter(
          (d) =>
            d.supplierName.toLowerCase().includes(q) ||
            d.supplierPhone.toLowerCase().includes(q) ||
            d.supplierAddress.toLowerCase().includes(q)
        )
      : dueRows;

    return [...list].sort((a, b) => {
      if (sortBy === "due_asc") return a.totalDue - b.totalDue;
      if (sortBy === "invoices_desc") return b.invoiceCount - a.invoiceCount;
      if (sortBy === "name_asc")
        return a.supplierName.localeCompare(b.supplierName);
      return b.totalDue - a.totalDue;
    });
  }, [dueRows, debouncedSearch, sortBy]);

  const totals = useMemo(() => {
    let sumInvoices = 0;
    let sumDue = 0;
    filtered.forEach((d) => {
      sumInvoices += d.invoiceCount || 0;
      sumDue += d.totalDue || 0;
    });
    return { sumInvoices, sumDue };
  }, [filtered]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilter = searchQuery.trim() !== "" || sortBy !== "due_desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("due_desc");
    setCurrentPage(1);
  };

  // Compute statement data for currently expanded row
  const expandedStatementData = useMemo(() => {
    if (!expandedSupplierKey) return null;
    const target = adaptedSummaries.find(
      (s) => s.supplierKey === expandedSupplierKey
    );
    if (!target) return null;
    return buildSupplierStatementEntries(
      target,
      payments,
      purchasesList,
      returnRecords,
      rawPartyData,
      { startDate, endDate }
    );
  }, [
    expandedSupplierKey,
    adaptedSummaries,
    payments,
    purchasesList,
    returnRecords,
    rawPartyData,
    startDate,
    endDate,
  ]);

  const handleOpenDrawer = (d: NormalizedSupplierDueRow) => {
    const summary: SupplierPaymentSummary = {
      supplierKey: d.supplierKey,
      supplierId: d.supplierId,
      supplierName: d.supplierName,
      supplierPhone: d.supplierPhone,
      voucherCount: 0,
      billsSettled: 0,
      cashPaid: 0,
      digitalPaid: 0,
      totalDiscount: 0,
      totalPaid: 0,
      currentDue: d.totalDue,
      lastPaymentDate: "",
    };
    setSelectedSupplierForDrawer(summary);
    setIsDrawerOpen(true);
  };

  return (
    <TableContainer>
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-64 shrink-0">
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
              placeholder="Search supplier, phone, address..."
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
              <option value="due_desc">Highest Due Amount</option>
              <option value="due_asc">Lowest Due Amount</option>
              <option value="invoices_desc">Most Pending Invoices</option>
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
                  ? adaptedSummaries.find(
                      (s) => s.supplierKey === expandedSupplierKey
                    )
                  : null) ||
                (filtered.length === 1
                  ? adaptedSummaries.find(
                      (s) => s.supplierKey === filtered[0].supplierKey
                    )
                  : null);

              if (targetSupplier) {
                const stmt = buildSupplierStatementEntries(
                  targetSupplier,
                  payments,
                  purchasesList,
                  returnRecords,
                  rawPartyData,
                  { startDate, endDate }
                );
                const count = await exportSupplierStatementExcel(
                  stmt,
                  companyMeta
                );
                return `Exported ${count} statement entries for ${targetSupplier.supplierName} to Excel!`;
              }

              const count = await exportSupplierDueReportExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} supplier dues to Excel!`;
            }}
            onDownloadPdf={async () => {
              const targetSupplier =
                (expandedSupplierKey
                  ? adaptedSummaries.find(
                      (s) => s.supplierKey === expandedSupplierKey
                    )
                  : null) ||
                (filtered.length === 1
                  ? adaptedSummaries.find(
                      (s) => s.supplierKey === filtered[0].supplierKey
                    )
                  : null);

              if (targetSupplier) {
                const stmt = buildSupplierStatementEntries(
                  targetSupplier,
                  payments,
                  purchasesList,
                  returnRecords,
                  rawPartyData,
                  { startDate, endDate }
                );
                await downloadSupplierStatementPdf(stmt, companyMeta);
                return `Supplier statement PDF downloaded for ${targetSupplier.supplierName}!`;
              }

              await downloadSupplierDueReportPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Supplier outstanding dues PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && dueRows.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Outstanding Dues Found"
            description="All supplier balances are completely settled or match no filters."
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
              {isColVisible("address") && (
                <TableTh className="whitespace-nowrap">Address</TableTh>
              )}
              {isColVisible("invoiceCount") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Pending Invoices
                </TableTh>
              )}
              {isColVisible("lastPurchaseDate") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Last Purchase Date
                </TableTh>
              )}
              {isColVisible("totalDue") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Outstanding Due (৳)
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" className="whitespace-nowrap w-24">
                  History
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((d, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;
                const isExpanded = expandedSupplierKey === d.supplierKey;

                return (
                  <React.Fragment key={`${d.supplierKey}_${idx}`}>
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
                                  isExpanded ? null : d.supplierKey
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
                                  isExpanded ? null : d.supplierKey
                                )
                              }
                              className="truncate cursor-pointer hover:text-[var(--primary-color)] transition-colors"
                              title="Click to toggle statement history"
                            >
                              {d.supplierName}
                            </span>
                          </div>
                        </td>
                      )}
                      {isColVisible("phone") && (
                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                          {d.supplierPhone}
                        </td>
                      )}
                      {isColVisible("address") && (
                        <td
                          className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[190px] truncate"
                          title={d.supplierAddress}
                        >
                          {d.supplierAddress}
                        </td>
                      )}
                      {isColVisible("invoiceCount") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[var(--ui-surface-muted)] text-[var(--ui-text)]">
                            {d.invoiceCount}
                          </span>
                        </td>
                      )}
                      {isColVisible("lastPurchaseDate") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                          {d.lastPurchaseDate
                            ? formatShortReportDate(d.lastPurchaseDate)
                            : "-"}
                        </td>
                      )}
                      {isColVisible("totalDue") && (
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap tabular-nums">
                          ৳ {formatMoney(d.totalDue)}
                        </td>
                      )}
                      {isColVisible("actions") && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDrawer(d);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[var(--primary-color)] bg-[var(--primary-color-light)] hover:bg-[var(--primary-color-muted)]/30 rounded-lg transition-colors cursor-pointer"
                            title="View Detailed Statement"
                          >
                            <FiFileText size={12} />
                            <span>Statement</span>
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Inline Collapsible Statement Ledger */}
                    {isExpanded && expandedStatementData && (
                      <tr className="bg-[var(--ui-surface-muted)]/20 border-b border-[var(--ui-border)]">
                        <td
                          colSpan={activeVisibleColumnCount}
                          className="p-2 sm:p-3 text-left"
                        >
                          <div className="flex flex-col gap-2.5 p-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl shadow-xs">
                            {/* Expanded Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--ui-border)]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center font-bold">
                                  <FaStore size={14} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-[var(--ui-text)]">
                                      {d.supplierName}
                                    </span>
                                    <span className="text-[11px] text-[var(--ui-text-muted)]">
                                      (Statement History)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span>Phone: {d.supplierPhone}</span>
                                    <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                                    <span>Pending Invoices: {d.invoiceCount}</span>
                                    <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                                    <span>
                                      Total Purchases:{" "}
                                      <strong className="text-[var(--ui-text)] font-semibold">
                                        ৳{" "}
                                        {formatMoney(
                                          expandedStatementData.totalPurchases
                                        )}
                                      </strong>
                                    </span>
                                    <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                                    <span>
                                      Total Paid:{" "}
                                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        ৳{" "}
                                        {formatMoney(
                                          expandedStatementData.totalPayments
                                        )}
                                      </strong>
                                    </span>
                                    <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                                      Outstanding Due: ৳ {formatMoney(d.totalDue)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await exportSupplierStatementExcel(
                                      expandedStatementData,
                                      companyMeta
                                    );
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition-colors cursor-pointer"
                                  title="Export This Supplier Statement to Excel"
                                >
                                  <FaFileExcel size={12} />
                                  <span>Excel</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    await downloadSupplierStatementPdf(
                                      expandedStatementData,
                                      companyMeta
                                    );
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors cursor-pointer"
                                  title="Download This Supplier Statement PDF"
                                >
                                  <FaFilePdf size={12} />
                                  <span>PDF</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenDrawer(d)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--primary-color-light)] text-[var(--primary-color)] transition-colors cursor-pointer"
                                  title="Open Full Statement Drawer"
                                >
                                  <FiMaximize2 size={12} />
                                  <span>Full View</span>
                                </button>
                              </div>
                            </div>

                            {/* Embedded Statement Table */}
                            <SupplierStatementTable
                              entries={expandedStatementData.entries}
                              stats={{
                                openingBalance:
                                  expandedStatementData.openingBalance,
                                totalPurchases:
                                  expandedStatementData.totalPurchases,
                                totalPayments:
                                  expandedStatementData.totalPayments,
                                totalReturns:
                                  expandedStatementData.totalReturns,
                                totalDiscounts:
                                  expandedStatementData.totalDiscounts,
                                closingBalance:
                                  expandedStatementData.closingBalance,
                              }}
                              onViewReceipt={onViewReceipt}
                            />
                          </div>
                        </td>
                      </tr>
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
                      isColVisible("address"),
                    ].filter(Boolean).length
                  }
                  className="py-2.5 px-3 text-left font-bold"
                >
                  Grand Total ({filtered.length} Due Suppliers)
                </td>

                {isColVisible("invoiceCount") && (
                  <td className="py-2.5 px-3 text-center font-bold">
                    {totals.sumInvoices}
                  </td>
                )}

                {isColVisible("lastPurchaseDate") && <td></td>}

                {isColVisible("totalDue") && (
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                    ৳ {formatMoney(totals.sumDue)}
                  </td>
                )}

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
          entityLabel="due suppliers"
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
        payments={payments}
        purchasesList={purchasesList}
        returnRecords={returnRecords}
        rawPartyData={rawPartyData}
        onViewReceipt={onViewReceipt}
      />
    </TableContainer>
  );
};

export default SupplierDueReportTable;
