import React, { useMemo, useState } from "react";
import { FiChevronDown, FiRotateCcw } from "react-icons/fi";
import Search from "@/components/table-components/Search";
import ReportDateRangeControl from "@/components/reports/ReportDateRangeControl";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import ReportPartyFilterDropdown, {
  type ReportPartyOption,
} from "@/components/reports/ReportPartyFilterDropdown";
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
  TableActionButtons,
  EmptyState,
  TableFilterSelect,
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { useDebounce } from "@/hooks/useDebounce";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import {
  useReportCompanyMeta,
  formatShortReportDate,
  parseFlexibleReportDate,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import type { PurchaseReturnItem } from "@/types";
import {
  type NormalizedPurchaseReturnRecord,
  exportPurchaseReturnVouchersExcel,
  downloadPurchaseReturnVouchersPdf,
} from "../utils/purchase-return-report-helpers";

interface PurchaseReturnVouchersTableProps extends ReportDateFilterProps {
  records: NormalizedPurchaseReturnRecord[];
  isLoading?: boolean;
  onPrint: (item: PurchaseReturnItem) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "returnNo", label: "Return No" },
  { key: "orderId", label: "Purchase No" },
  { key: "returnDate", label: "Return Date" },
  { key: "supplier", label: "Supplier" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "items", label: "Items" },
  { key: "refundMode", label: "Refund Mode" },
  { key: "refundAmount", label: "Refund Amount (৳)" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
];

export const PurchaseReturnVouchersTable: React.FC<
  PurchaseReturnVouchersTableProps
> = ({ records, isLoading, onPrint, ...dateFilterProps }) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
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
    "purchase_return_report_vouchers_columns"
  );

  // Distinct supplier list from records for searchable dropdown
  const suppliersList = useMemo(() => {
    const map = new Map<string, ReportPartyOption>();
    records.forEach((r) => {
      if (r.supplierName && !map.has(r.supplierName)) {
        map.set(r.supplierName, {
          id: r.supplierId,
          name: r.supplierName,
          phone: r.supplierPhone,
        });
      }
    });
    return Array.from(map.values());
  }, [records]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    const list = records.filter((r) => {
      if (supplierFilter !== "all" && r.supplierName !== supplierFilter) {
        return false;
      }

      if (modeFilter === "CREDIT" && !r.isCreditAdjust) return false;
      if (
        modeFilter === "CASH" &&
        (r.isCreditAdjust ||
          r.paymentType.includes("BANK") ||
          r.paymentType.includes("MFS"))
      ) {
        return false;
      }
      if (modeFilter === "BANK" && !r.paymentType.includes("BANK")) return false;
      if (modeFilter === "MFS" && !r.paymentType.includes("MFS")) return false;

      if (q) {
        const matches =
          r.returnNo.toLowerCase().includes(q) ||
          r.orderNo.toLowerCase().includes(q) ||
          r.purchaseInvoiceNo.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          r.supplierPhone.toLowerCase().includes(q) ||
          r.reasonSummary.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "amount_desc") return b.refundAmount - a.refundAmount;
      if (sortBy === "amount_asc") return a.refundAmount - b.refundAmount;
      const tA = parseFlexibleReportDate(a.returnDate)?.valueOf() || 0;
      const tB = parseFlexibleReportDate(b.returnDate)?.valueOf() || 0;
      return sortBy === "oldest" ? tA - tB : tB - tA;
    });
  }, [records, supplierFilter, modeFilter, debouncedSearch, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.sumItems += r.itemsCount;
        acc.sumRefund += r.refundAmount;
        return acc;
      },
      { sumItems: 0, sumRefund: 0 }
    );
  }, [filtered]);

  const hasActiveFilter =
    searchQuery.trim() !== "" ||
    supplierFilter !== "all" ||
    modeFilter !== "all" ||
    sortBy !== "latest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSupplierFilter("all");
    setModeFilter("all");
    setSortBy("latest");
    setCurrentPage(1);
  };

  return (
    <TableContainer>
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <ReportDateRangeControl
            {...dateFilterProps}
            onAfterChange={() => setCurrentPage(1)}
          />

          <div className="w-full sm:w-44 md:w-48 lg:w-52 shrink-0">
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
              placeholder="Search return, supplier..."
            />
          </div>

          <ReportPartyFilterDropdown
            parties={suppliersList}
            selectedParty={supplierFilter}
            onSelect={(val) => {
              setSupplierFilter(val);
              setCurrentPage(1);
            }}
            allLabel="All Suppliers"
            searchPlaceholder="Search supplier name, phone..."
            emptyLabel="No supplier found"
          />

          <TableFilterSelect
            value={modeFilter}
            onChange={(val) => {
              setModeFilter(val);
              setCurrentPage(1);
            }}
            className="shrink-0"
            options={[
              { value: "all", label: "All Refund Modes" },
              { value: "CASH", label: "Cash Refund" },
              { value: "CREDIT", label: "Due Adjusted" },
              { value: "BANK", label: "Bank Transfer" },
              { value: "MFS", label: "MFS" },
            ]}
          />

          <TableFilterSelect
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setCurrentPage(1);
            }}
            isFiltered={sortBy !== "latest"}
            className="shrink-0"
            options={[
              { value: "latest", label: "Latest First" },
              { value: "oldest", label: "Oldest First" },
              { value: "amount_desc", label: "Highest Refund" },
              { value: "amount_asc", label: "Lowest Refund" },
            ]}
          />

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all active filters"
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
              const count = await exportPurchaseReturnVouchersExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} purchase return vouchers to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadPurchaseReturnVouchersPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Purchase return report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && records.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Purchase Return Vouchers Found"
            description="No returned purchase orders match the selected filters or date range."
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
              {isColVisible("returnNo") && (
                <TableTh className="w-px whitespace-nowrap">Return No</TableTh>
              )}
              {isColVisible("orderId") && (
                <TableTh className="w-px whitespace-nowrap">Purchase No</TableTh>
              )}
              {isColVisible("returnDate") && (
                <TableTh className="w-px whitespace-nowrap">Return Date</TableTh>
              )}
              {isColVisible("supplier") && (
                <TableTh className="whitespace-nowrap">Supplier</TableTh>
              )}
              {isColVisible("phone") && (
                <TableTh className="whitespace-nowrap">Phone</TableTh>
              )}
              {isColVisible("address") && (
                <TableTh className="whitespace-nowrap">Address</TableTh>
              )}
              {isColVisible("items") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Items
                </TableTh>
              )}
              {isColVisible("refundMode") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Refund Mode
                </TableTh>
              )}
              {isColVisible("refundAmount") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Refund (৳)
                </TableTh>
              )}
              {isColVisible("status") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Status
                </TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" width={76} className="whitespace-nowrap">
                  Actions
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((r, idx) => {
                const slNumber = (safePage - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={`${r.id}_${idx}`}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {slNumber}
                      </td>
                    )}

                    {isColVisible("returnNo") && (
                      <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)] whitespace-nowrap">
                        {r.returnNo}
                      </td>
                    )}

                    {isColVisible("orderId") && (
                      <td className="py-2.5 px-3 text-xs font-medium text-[var(--ui-text)] whitespace-nowrap">
                        {r.purchaseInvoiceNo !== "-"
                          ? r.purchaseInvoiceNo
                          : r.orderNo}
                      </td>
                    )}

                    {isColVisible("returnDate") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {formatShortReportDate(r.returnDate)}
                      </td>
                    )}

                    {isColVisible("supplier") && (
                      <td className="py-2.5 px-3 text-left font-semibold text-xs text-[var(--ui-text)]">
                        {r.supplierName}
                      </td>
                    )}

                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {r.supplierPhone || "-"}
                      </td>
                    )}

                    {isColVisible("address") && (
                      <td className="py-2.5 px-3 text-left text-xs text-[var(--ui-text-muted)] max-w-[180px] truncate">
                        {r.supplierAddress || "-"}
                      </td>
                    )}

                    {isColVisible("items") && (
                      <td className="py-2.5 px-3 text-center font-medium">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[var(--ui-surface-muted)] text-[var(--ui-text)]">
                          {r.itemsCount}
                        </span>
                      </td>
                    )}

                    {isColVisible("refundMode") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.isCreditAdjust
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              : "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border border-[var(--ui-success-border)]"
                          }`}
                        >
                          {r.isCreditAdjust ? "Due Adjust" : r.paymentType}
                        </span>
                      </td>
                    )}

                    {isColVisible("refundAmount") && (
                      <td className="py-2.5 px-3 text-right font-bold text-xs text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        ৳ {formatMoney(r.refundAmount)}
                      </td>
                    )}

                    {isColVisible("status") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border border-[var(--ui-success-border)]">
                          {r.status}
                        </span>
                      </td>
                    )}

                    {isColVisible("actions") && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <TableActionButtons
                          onPrint={() => onPrint(r.raw)}
                          printTitle="Print Return Voucher"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Grand Total Summary Row */}
              <tr className="bg-[var(--ui-surface-muted)]/70 font-bold border-t-2 border-[var(--ui-border)] text-xs text-[var(--ui-text)]">
                <td
                  colSpan={
                    [
                      isColVisible("sl"),
                      isColVisible("returnNo"),
                      isColVisible("orderId"),
                      isColVisible("returnDate"),
                      isColVisible("supplier"),
                      isColVisible("phone"),
                      isColVisible("address"),
                    ].filter(Boolean).length
                  }
                  className="py-2.5 px-3 text-left font-bold"
                >
                  Grand Total ({filtered.length} Returns)
                </td>

                {isColVisible("items") && (
                  <td className="py-2.5 px-3 text-center font-bold">
                    {totals.sumItems}
                  </td>
                )}

                {isColVisible("refundMode") && <td></td>}

                {isColVisible("refundAmount") && (
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                    ৳ {formatMoney(totals.sumRefund)}
                  </td>
                )}

                {isColVisible("status") && <td></td>}
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
          entityLabel="returns"
        />
      )}
    </TableContainer>
  );
};

export default PurchaseReturnVouchersTable;
