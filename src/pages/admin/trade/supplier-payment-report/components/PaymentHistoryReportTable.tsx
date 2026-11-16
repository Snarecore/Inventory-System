import React, { useMemo, useState } from "react";
import { FiRotateCcw } from "react-icons/fi";
import Search from "@/components/table-components/Search";
import ReportDateRangeControl from "@/components/reports/ReportDateRangeControl";
import {
  ReportPartyFilterDropdown,
  type ReportPartyOption,
} from "@/components/reports/ReportPartyFilterDropdown";
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
import type { PaymentReceiptData } from "@/types/payment.types";
import {
  type NormalizedPaymentRecord,
  exportPaymentVouchersExcel,
  downloadPaymentVouchersPdf,
} from "../utils/supplier-payment-report-helpers";

interface PaymentHistoryReportTableProps extends ReportDateFilterProps {
  records: NormalizedPaymentRecord[];
  isLoading?: boolean;
  onViewReceipt: (receipt: PaymentReceiptData) => void;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "paymentDate", label: "Date" },
  { key: "voucherNo", label: "Voucher No" },
  { key: "supplier", label: "Supplier Name" },
  { key: "phone", label: "Phone" },
  { key: "method", label: "Method" },
  { key: "bills", label: "Adjusted Bills" },
  { key: "discount", label: "Discount (৳)" },
  { key: "paid", label: "Paid Amount (৳)" },
  { key: "remark", label: "Remark" },
  { key: "actions", label: "Actions" },
];

export const PaymentHistoryReportTable: React.FC<
  PaymentHistoryReportTableProps
> = ({ records, isLoading, onViewReceipt, ...dateFilterProps }) => {
  const companyMeta = useReportCompanyMeta(
    dateFilterProps.startDate,
    dateFilterProps.endDate
  );

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [selectedParty, setSelectedParty] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
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
    "supplier_payment_report_vouchers_columns_v2"
  );

  // Extract distinct suppliers for party dropdown filter
  const supplierOptions = useMemo<ReportPartyOption[]>(() => {
    const map = new Map<string, { id: string; name: string; phone: string }>();
    records.forEach((r) => {
      if (
        r.supplierName &&
        r.supplierName !== "-" &&
        !map.has(r.supplierName)
      ) {
        map.set(r.supplierName, {
          id: r.supplierId || r.supplierName,
          name: r.supplierName,
          phone: r.supplierPhone || "",
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [records]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    const list = records.filter((r) => {
      if (selectedParty !== "all" && r.supplierName !== selectedParty) {
        return false;
      }

      if (
        methodFilter !== "all" &&
        !r.paymentMode.toLowerCase().includes(methodFilter.toLowerCase())
      ) {
        return false;
      }

      if (q) {
        const matches =
          r.voucherNo.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          r.supplierPhone.toLowerCase().includes(q) ||
          r.billsSummary.toLowerCase().includes(q) ||
          r.remark.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "amount_desc") return b.totalAmount - a.totalAmount;
      if (sortBy === "amount_asc") return a.totalAmount - b.totalAmount;
      const tA = parseFlexibleReportDate(a.paymentDate)?.valueOf() || 0;
      const tB = parseFlexibleReportDate(b.paymentDate)?.valueOf() || 0;
      return sortBy === "oldest" ? tA - tB : tB - tA;
    });
  }, [records, selectedParty, methodFilter, debouncedSearch, sortBy]);

  const totals = useMemo(() => {
    let sumDiscount = 0;
    let sumPaid = 0;
    filtered.forEach((r) => {
      sumDiscount += r.totalDiscount || 0;
      sumPaid += r.totalAmount || 0;
    });
    return { sumDiscount, sumPaid };
  }, [filtered]);

  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const hasActiveFilter =
    searchQuery.trim() !== "" ||
    selectedParty !== "all" ||
    methodFilter !== "all" ||
    sortBy !== "latest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedParty("all");
    setMethodFilter("all");
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

          <div className="w-full sm:w-52 shrink-0">
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
              placeholder="Search voucher, supplier..."
            />
          </div>

          <ReportPartyFilterDropdown
            parties={supplierOptions}
            selectedParty={selectedParty}
            onSelect={(name) => {
              setSelectedParty(name);
              setCurrentPage(1);
            }}
            allLabel="All Suppliers"
            searchPlaceholder="Search supplier..."
          />

          <TableFilterSelect
            value={methodFilter}
            onChange={(val) => {
              setMethodFilter(val);
              setCurrentPage(1);
            }}
            className="shrink-0"
            options={[
              { value: "all", label: "All Methods" },
              { value: "cash", label: "Cash" },
              { value: "bank", label: "Bank / Card" },
              { value: "mfs", label: "MFS" },
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
              { value: "amount_desc", label: "Highest Amount" },
              { value: "amount_asc", label: "Lowest Amount" },
            ]}
          />

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
              const count = await exportPaymentVouchersExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} payment vouchers to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadPaymentVouchersPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Supplier payment report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && records.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Payment Vouchers Found"
            description="No supplier payment disbursements found matching the selected filters or date range."
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
              {isColVisible("paymentDate") && (
                <TableTh className="w-px whitespace-nowrap">Date</TableTh>
              )}
              {isColVisible("voucherNo") && (
                <TableTh className="w-px whitespace-nowrap">Voucher No</TableTh>
              )}
              {isColVisible("supplier") && (
                <TableTh className="whitespace-nowrap">Supplier Name</TableTh>
              )}
              {isColVisible("phone") && (
                <TableTh className="whitespace-nowrap">Phone</TableTh>
              )}
              {isColVisible("method") && (
                <TableTh align="center" className="whitespace-nowrap">
                  Method
                </TableTh>
              )}
              {isColVisible("bills") && (
                <TableTh className="whitespace-nowrap">Adjusted Bills</TableTh>
              )}
              {isColVisible("discount") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Discount (৳)
                </TableTh>
              )}
              {isColVisible("paid") && (
                <TableTh align="right" className="whitespace-nowrap">
                  Paid Amount (৳)
                </TableTh>
              )}
              {isColVisible("remark") && (
                <TableTh className="whitespace-nowrap">Remark</TableTh>
              )}
              {isColVisible("actions") && (
                <TableTh align="center" width={76} className="whitespace-nowrap">
                  Actions
                </TableTh>
              )}
            </TableHead>

            <TableBody>
              {paginated.map((r, idx) => {
                const sl = (safePage - 1) * pageSize + idx + 1;

                return (
                  <tr
                    key={`${r.id}_${idx}`}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                        {sl}
                      </td>
                    )}
                    {isColVisible("paymentDate") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text)] whitespace-nowrap">
                        {formatShortReportDate(r.paymentDate)}
                      </td>
                    )}
                    {isColVisible("voucherNo") && (
                      <td className="py-2.5 px-3 text-xs font-semibold text-[var(--primary-color)] whitespace-nowrap">
                        <span
                          onClick={() => onViewReceipt(r.receiptData)}
                          className="cursor-pointer hover:underline"
                        >
                          {r.voucherNo}
                        </span>
                      </td>
                    )}
                    {isColVisible("supplier") && (
                      <td className="py-2.5 px-3 text-xs font-medium text-[var(--ui-text)] max-w-[200px] truncate">
                        {r.supplierName}
                      </td>
                    )}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {r.supplierPhone || "-"}
                      </td>
                    )}
                    {isColVisible("method") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border-[var(--primary-color-muted)]">
                          {r.paymentMode}
                        </span>
                      </td>
                    )}
                    {isColVisible("bills") && (
                      <td
                        className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[190px] truncate"
                        title={r.billsSummary}
                      >
                        {r.billsSummary}
                      </td>
                    )}
                    {isColVisible("discount") && (
                      <td className="py-2.5 px-3 text-right text-xs text-amber-600 whitespace-nowrap tabular-nums">
                        {r.totalDiscount > 0
                          ? `৳ ${formatMoney(r.totalDiscount)}`
                          : "-"}
                      </td>
                    )}
                    {isColVisible("paid") && (
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">
                        ৳ {formatMoney(r.totalAmount)}
                      </td>
                    )}
                    {isColVisible("remark") && (
                      <td
                        className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[170px] truncate"
                        title={r.remark}
                      >
                        {r.remark}
                      </td>
                    )}
                    {isColVisible("actions") && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <TableActionButtons
                          onPrint={() => onViewReceipt(r.receiptData)}
                          onView={() => onViewReceipt(r.receiptData)}
                          viewTitle="View Payment Receipt"
                          printTitle="Print Payment Receipt"
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
                      isColVisible("paymentDate"),
                      isColVisible("voucherNo"),
                      isColVisible("supplier"),
                      isColVisible("phone"),
                      isColVisible("method"),
                      isColVisible("bills"),
                    ].filter(Boolean).length
                  }
                  className="py-2.5 px-3 text-left font-bold"
                >
                  Grand Total ({filtered.length} Vouchers)
                </td>

                {isColVisible("discount") && (
                  <td className="py-2.5 px-3 text-right font-bold text-amber-600 whitespace-nowrap tabular-nums">
                    {totals.sumDiscount > 0
                      ? `৳ ${formatMoney(totals.sumDiscount)}`
                      : "-"}
                  </td>
                )}

                {isColVisible("paid") && (
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">
                    ৳ {formatMoney(totals.sumPaid)}
                  </td>
                )}

                {isColVisible("remark") && <td></td>}
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
          entityLabel="vouchers"
        />
      )}
    </TableContainer>
  );
};

export default PaymentHistoryReportTable;
