import React, { useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiRotateCcw,
  FiFileText,
  FiMaximize2,
} from "react-icons/fi";
import { FaStore } from "react-icons/fa";
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
import {
  useReportCompanyMeta,
  formatShortReportDate,
} from "@/utils/trade-report-helpers";
import type { CollectionReceiptData } from "@/pages/admin/trade/customer-collection/components/CollectionReceiptModal";
import {
  type NormalizedCustomerDueRow,
  type CustomerCollectionSummary,
  type NormalizedCollectionRecord,
  buildCustomerStatementEntries,
  exportCustomerDueReportExcel,
  downloadCustomerDueReportPdf,
  exportCustomerStatementExcel,
  downloadCustomerStatementPdf,
} from "../utils/customer-collection-report-helpers";
import CustomerStatementTable from "./CustomerStatementTable";
import CustomerStatementDrawer from "./CustomerStatementDrawer";

interface CustomerDueReportTableProps {
  dueRows: NormalizedCustomerDueRow[];
  collections?: NormalizedCollectionRecord[];
  salesList?: any[];
  rawPartyData?: any;
  isLoading?: boolean;
  onViewReceipt?: (receipt: CollectionReceiptData) => void;
  startDate?: string;
  endDate?: string;
}

const AVAILABLE_COLUMNS: ColumnItem[] = [
  { key: "sl", label: "SL" },
  { key: "customerName", label: "Customer Name" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "invoiceCount", label: "Pending Invoices" },
  { key: "lastSaleDate", label: "Last Sale Date" },
  { key: "totalDue", label: "Outstanding Due (৳)" },
  { key: "actions", label: "History" },
];

export const CustomerDueReportTable: React.FC<CustomerDueReportTableProps> = ({
  dueRows,
  collections = [],
  salesList = [],
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

  const [expandedCustomerKey, setExpandedCustomerKey] = useState<string | null>(null);
  const [selectedCustomerForDrawer, setSelectedCustomerForDrawer] =
    useState<CustomerCollectionSummary | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  } = useColumnVisibility(
    AVAILABLE_COLUMNS,
    "customer_collection_report_dues_columns_v2"
  );

  const adaptedSummaries: CustomerCollectionSummary[] = useMemo(() => {
    return dueRows.map((d) => ({
      customerKey: d.customerKey,
      customerId: d.customerId,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      voucherCount: 0,
      billsSettled: d.invoiceCount,
      cashPaid: 0,
      digitalPaid: 0,
      totalDiscount: 0,
      totalCollected: 0,
      currentDue: d.totalDue,
      lastCollectionDate: d.lastSaleDate || "",
    }));
  }, [dueRows]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = q
      ? dueRows.filter(
          (d) =>
            d.customerName.toLowerCase().includes(q) ||
            d.customerPhone.toLowerCase().includes(q) ||
            d.customerAddress.toLowerCase().includes(q)
        )
      : dueRows;

    return [...list].sort((a, b) => {
      if (sortBy === "due_asc") return a.totalDue - b.totalDue;
      if (sortBy === "invoices_desc") return b.invoiceCount - a.invoiceCount;
      if (sortBy === "name_asc")
        return a.customerName.localeCompare(b.customerName);
      return b.totalDue - a.totalDue;
    });
  }, [dueRows, debouncedSearch, sortBy]);

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
    if (!expandedCustomerKey) return null;
    const target = adaptedSummaries.find(
      (c) => c.customerKey === expandedCustomerKey
    );
    if (!target) return null;
    return buildCustomerStatementEntries(
      target,
      collections,
      salesList,
      rawPartyData,
      { startDate, endDate }
    );
  }, [
    expandedCustomerKey,
    adaptedSummaries,
    collections,
    salesList,
    rawPartyData,
    startDate,
    endDate,
  ]);

  return (
    <TableContainer>
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-60 shrink-0">
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
              placeholder="Search customer, phone, address..."
            />
          </div>

          <TableFilterSelect
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setCurrentPage(1);
            }}
            isFiltered={sortBy !== "due_desc"}
            className="shrink-0"
            options={[
              { value: "due_desc", label: "Highest Due" },
              { value: "due_asc", label: "Lowest Due" },
              { value: "invoices_desc", label: "Most Pending Invoices" },
              { value: "name_asc", label: "Customer Name A–Z" },
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
              const targetCustomer =
                (expandedCustomerKey
                  ? adaptedSummaries.find(
                      (c) => c.customerKey === expandedCustomerKey
                    )
                  : null) ||
                (filtered.length === 1
                  ? adaptedSummaries.find(
                      (c) => c.customerKey === filtered[0].customerKey
                    )
                  : null);

              if (targetCustomer) {
                const stmt = buildCustomerStatementEntries(
                  targetCustomer,
                  collections,
                  salesList,
                  rawPartyData,
                  { startDate, endDate }
                );
                const count = await exportCustomerStatementExcel(
                  targetCustomer,
                  stmt.entries,
                  companyMeta
                );
                return `Exported ${count} statement entries for ${targetCustomer.customerName} to Excel!`;
              }

              const count = await exportCustomerDueReportExcel(
                filtered,
                companyMeta,
                visibleColumns
              );
              return `Exported ${count} customer due records to Excel!`;
            }}
            onDownloadPdf={async () => {
              const targetCustomer =
                (expandedCustomerKey
                  ? adaptedSummaries.find(
                      (c) => c.customerKey === expandedCustomerKey
                    )
                  : null) ||
                (filtered.length === 1
                  ? adaptedSummaries.find(
                      (c) => c.customerKey === filtered[0].customerKey
                    )
                  : null);

              if (targetCustomer) {
                const stmt = buildCustomerStatementEntries(
                  targetCustomer,
                  collections,
                  salesList,
                  rawPartyData,
                  { startDate, endDate }
                );
                await downloadCustomerStatementPdf(
                  targetCustomer,
                  stmt.entries,
                  companyMeta
                );
                return `Customer statement PDF downloaded for ${targetCustomer.customerName}!`;
              }

              await downloadCustomerDueReportPdf(
                filtered,
                companyMeta,
                visibleColumns
              );
              return "Customer due report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && dueRows.length === 0 ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={6} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Outstanding Customer Dues"
            description="No customers currently match the receivable filter or have unpaid balances."
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && (
                <TableTh align="center" width={42} className="whitespace-nowrap">
                  SL
                </TableTh>
              )}
              {isColVisible("customerName") && (
                <TableTh className="whitespace-nowrap">Customer Name</TableTh>
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
              {isColVisible("lastSaleDate") && (
                <TableTh align="center" className="w-px whitespace-nowrap">
                  Last Sale Date
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
                const isExpanded = expandedCustomerKey === d.customerKey;

                return (
                  <React.Fragment key={`${d.customerKey}_${idx}`}>
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
                      {isColVisible("customerName") && (
                        <td className="py-2.5 px-3 text-xs font-semibold text-[var(--ui-text)] max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCustomerKey(
                                  isExpanded ? null : d.customerKey
                                );
                              }}
                              className="p-1 rounded text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] hover:bg-[var(--primary-color-light)] transition-colors cursor-pointer shrink-0"
                              title={
                                isExpanded
                                  ? "Collapse History"
                                  : "Expand Statement & Invoices"
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
                                setExpandedCustomerKey(
                                  isExpanded ? null : d.customerKey
                                )
                              }
                              className="truncate cursor-pointer hover:text-[var(--primary-color)] transition-colors font-semibold"
                              title="Click to view statement and invoices"
                            >
                              {d.customerName}
                            </span>
                          </div>
                        </td>
                      )}
                      {isColVisible("phone") && (
                        <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                          {d.customerPhone}
                        </td>
                      )}
                      {isColVisible("address") && (
                        <td
                          className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[210px] truncate"
                          title={d.customerAddress}
                        >
                          {d.customerAddress}
                        </td>
                      )}
                      {isColVisible("invoiceCount") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)] tabular-nums">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCustomerKey(
                                isExpanded ? null : d.customerKey
                              )
                            }
                            className="hover:text-[var(--primary-color)] hover:underline cursor-pointer"
                            title="Click to view invoices"
                          >
                            {d.invoiceCount}
                          </button>
                        </td>
                      )}
                      {isColVisible("lastSaleDate") && (
                        <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                          {formatShortReportDate(d.lastSaleDate)}
                        </td>
                      )}
                      {isColVisible("totalDue") && (
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-[var(--ui-danger)] tabular-nums whitespace-nowrap">
                          ৳ {formatMoney(d.totalDue)}
                        </td>
                      )}
                      {isColVisible("actions") && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const found = adaptedSummaries.find(
                                (c) => c.customerKey === d.customerKey
                              );
                              setSelectedCustomerForDrawer(found || null);
                              setIsDrawerOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[var(--primary-color)] bg-[var(--primary-color-light)] hover:bg-[var(--primary-color-muted)]/30 rounded-lg transition-colors cursor-pointer"
                            title="View Detailed Statement & Invoices"
                          >
                            <FiFileText size={12} />
                            <span>Statement</span>
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Inline Collapsible Statement / Invoice Details Section */}
                    {isExpanded && expandedStatementData && (
                      <tr className="bg-[var(--ui-surface-muted)]/20 border-b border-[var(--ui-border)]">
                        <td
                          colSpan={activeVisibleColumnCount}
                          className="p-2 sm:p-3 text-left"
                        >
                          <div className="flex flex-col gap-2.5 p-3 bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-xl shadow-xs">
                            {/* Expanded Description Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--ui-border)]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center font-bold">
                                  <FaStore size={14} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-[var(--ui-text)]">
                                      {d.customerName}
                                    </span>
                                    <span className="text-[11px] text-[var(--ui-text-muted)]">
                                      (Outstanding Due & Invoices)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[var(--ui-text-muted)] flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span>Phone: {d.customerPhone}</span>
                                    {d.customerAddress && d.customerAddress !== "-" && (
                                      <>
                                        <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                                        <span>Address: {d.customerAddress}</span>
                                      </>
                                    )}
                                    <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                                    <span>Pending Invoices: {d.invoiceCount}</span>
                                    <span className="inline-block w-px h-2.5 bg-[var(--ui-border)]" />
                                    <span className="text-[var(--ui-danger)] font-semibold">
                                      Outstanding Due: ৳ {formatMoney(d.totalDue)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const found = adaptedSummaries.find(
                                      (c) => c.customerKey === d.customerKey
                                    );
                                    setSelectedCustomerForDrawer(found || null);
                                    setIsDrawerOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--primary-color-light)] text-[var(--primary-color)] transition-colors cursor-pointer"
                                >
                                  <FiMaximize2 size={12} />
                                  <span>Full View</span>
                                </button>
                              </div>
                            </div>

                            {/* Embedded Statement Table */}
                            <CustomerStatementTable
                              entries={expandedStatementData.entries}
                              stats={expandedStatementData.stats}
                              onViewReceipt={onViewReceipt}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
          entityLabel="customers"
        />
      )}

      {/* Full Customer Statement Drawer */}
      <CustomerStatementDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCustomerForDrawer(null);
        }}
        selectedCustomer={selectedCustomerForDrawer}
        allCustomers={adaptedSummaries}
        onSelectCustomer={(c) => setSelectedCustomerForDrawer(c)}
        collections={collections}
        salesList={salesList}
        rawPartyData={rawPartyData}
        onViewReceipt={onViewReceipt}
      />
    </TableContainer>
  );
};

export default CustomerDueReportTable;
