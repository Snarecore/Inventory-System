import React, { useState } from "react";
import moment from "moment";
import { FiChevronDown, FiCopy, FiCheck, FiRotateCcw } from "react-icons/fi";
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
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import ReportExportButtons from "@/components/reports/ReportExportButtons";
import ReportDateRangeControl from "@/components/reports/ReportDateRangeControl";
import ReportPartyFilterDropdown, { type ReportPartyOption } from "@/components/reports/ReportPartyFilterDropdown";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast } from "@/utils/toast-utils";
import type { SaleItem } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useReportCompanyMeta,
  type ReportDateFilterProps,
} from "@/utils/trade-report-helpers";
import {
  extractSaleReportMetrics,
  exportFilteredInvoicesExcel,
  downloadFilteredInvoicesPdf,
} from "../utils/sales-report-helpers";

interface SalesReportTableProps extends ReportDateFilterProps {
  transactions: SaleItem[];
  isLoading?: boolean;
  onView: (item: SaleItem) => void;
  onPrint: (item: SaleItem) => void;
}

export const SalesReportTable: React.FC<SalesReportTableProps> = ({
  transactions,
  isLoading,
  startDate,
  endDate,
  dateRange,
  onPresetChange,
  onDateChange,
  onView,
  onPrint,
}) => {
  const companyMeta = useReportCompanyMeta(startDate, endDate);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Copy Order ID to clipboard
  const handleCopyOrderId = (text?: string, id?: string | number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (id !== undefined) setCopiedId(id);
    showSuccessToast(`Copied Order ID: ${text}`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Distinct customer list from transactions for dropdown
  const customerMap = new Map<string, ReportPartyOption>();
  transactions.forEach((t: any) => {
    const { partyId, partyName, partyPhone } = extractSaleReportMetrics(t);
    if (!customerMap.has(partyName)) {
      customerMap.set(partyName, { id: partyId, name: partyName, phone: partyPhone });
    }
  });
  const customersList = Array.from(customerMap.values());

  // Available Columns Configuration
  const availableColumns: ColumnItem[] = [
    { key: "sl", label: "SL" },
    { key: "orderId", label: "Order ID" },
    { key: "customer", label: "Customer" },
    { key: "phone", label: "Phone" },
    { key: "date", label: "Date" },
    { key: "items", label: "Items" },
    { key: "subtotal", label: "Subtotal" },
    { key: "discount", label: "Discount" },
    { key: "vat", label: "VAT" },
    { key: "total", label: "Grand Total" },
    { key: "paid", label: "Paid" },
    { key: "due", label: "Due" },
    { key: "method", label: "Method" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("sales_report_table_columns");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const isColVisible = (key: string) => visibleColumns[key] !== false;

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const currentlyVisible = prev[key] !== false;
      const willBeVisible = !currentlyVisible;
      const countAfter = availableColumns.filter((c) =>
        c.key === key ? willBeVisible : prev[c.key] !== false
      ).length;
      if (countAfter === 0) return prev;
      const next = { ...prev, [key]: willBeVisible };
      try {
        localStorage.setItem("sales_report_table_columns", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetColumns = () => {
    const resetState: Record<string, boolean> = {};
    availableColumns.forEach((c) => {
      resetState[c.key] = true;
    });
    setVisibleColumns(resetState);
    try {
      localStorage.removeItem("sales_report_table_columns");
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    customerFilter !== "all" ||
    paymentFilter !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "latest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setCustomerFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
    setSortBy("latest");
    setCurrentPage(1);
  };

  // Filter & Sort
  const filtered = transactions.filter((t: any) => {
    const m = extractSaleReportMetrics(t);

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      const orderNo = String(t.orderNo || "").toLowerCase();
      const inv = String(t.invoiceNo || t.invoice_no || "").toLowerCase();
      const name = m.partyName.toLowerCase();
      const phone = m.partyPhone.toLowerCase();
      if (!orderNo.includes(q) && !inv.includes(q) && !name.includes(q) && !phone.includes(q)) {
        return false;
      }
    }

    if (customerFilter !== "all" && m.partyName.toLowerCase() !== customerFilter.toLowerCase()) {
      return false;
    }

    if (paymentFilter !== "all") {
      if (paymentFilter === "MFS") {
        if (m.paymentType !== "MFS" && m.paymentType !== "BKASH" && m.paymentType !== "NAGAD") {
          return false;
        }
      } else if (paymentFilter === "BANK") {
        if (m.paymentType !== "BANK" && m.paymentType !== "CARD") return false;
      } else if (m.paymentType !== paymentFilter) {
        return false;
      }
    }

    if (statusFilter !== "all" && m.status !== statusFilter) {
      return false;
    }

    return true;
  });

  if (sortBy === "amount_high_to_low") {
    filtered.sort(
      (a: any, b: any) =>
        extractSaleReportMetrics(b).grandTotal - extractSaleReportMetrics(a).grandTotal
    );
  } else if (sortBy === "amount_low_to_high") {
    filtered.sort(
      (a: any, b: any) =>
        extractSaleReportMetrics(a).grandTotal - extractSaleReportMetrics(b).grandTotal
    );
  } else if (sortBy === "customer_a_to_z") {
    filtered.sort((a: any, b: any) =>
      extractSaleReportMetrics(a).partyName.localeCompare(
        extractSaleReportMetrics(b).partyName
      )
    );
  } else if (sortBy === "customer_z_to_a") {
    filtered.sort((a: any, b: any) =>
      extractSaleReportMetrics(b).partyName.localeCompare(
        extractSaleReportMetrics(a).partyName
      )
    );
  }

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const renderSortHeader = (label: string, activeKey: "customer" | "amount") => {
    const isAsc =
      sortBy === (activeKey === "customer" ? "customer_a_to_z" : "amount_low_to_high");
    const isDesc =
      sortBy === (activeKey === "customer" ? "customer_z_to_a" : "amount_high_to_low");

    const handleClick = () => {
      if (activeKey === "customer") {
        setSortBy(isAsc ? "customer_z_to_a" : isDesc ? "latest" : "customer_a_to_z");
      } else {
        setSortBy(isAsc ? "amount_high_to_low" : isDesc ? "latest" : "amount_low_to_high");
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
      {/* Top Filter Bar */}
      <TableToolbar>
        {/* Left Section: Search & Dropdown Filters in uniform height */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="w-full sm:w-44 md:w-48 lg:w-52 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              setSearchQuery={setSearchQuery}
              placeholder="Search order, customer..."
            />
          </div>

          <ReportDateRangeControl
            startDate={startDate}
            endDate={endDate}
            dateRange={dateRange}
            onPresetChange={onPresetChange}
            onDateChange={onDateChange}
            onAfterChange={() => setCurrentPage(1)}
            className="w-[calc(50%-4px)] sm:w-40 lg:w-44 shrink-0 z-50"
          />

          {/* Searchable Customer Filter */}
          <ReportPartyFilterDropdown
            parties={customersList}
            selectedParty={customerFilter}
            onSelect={(val) => {
              setCustomerFilter(val);
              setCurrentPage(1);
            }}
            allLabel="All Customers"
            searchPlaceholder="Search customer name, phone..."
            emptyLabel="No customer found"
          />

          {/* Status Filter */}
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
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="DUE">Due / Credit</option>
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs" size={13} />
          </div>

          {/* Payment Method Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-28 shrink-0">
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CREDIT">Credit</option>
              <option value="MFS">MFS</option>
              <option value="BANK">Bank</option>
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text)] pointer-events-none text-xs" size={13} />
          </div>
        </div>

        {/* Right Actions: Reset, Column Visibility & Excel / PDF Export Buttons */}
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

          {/* Column Visibility Menu */}
          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          {/* Excel & Download PDF */}
          <ReportExportButtons
            onExportExcel={async () => {
              const count = await exportFilteredInvoicesExcel(filtered, companyMeta);
              return `Successfully exported ${count} sales to Excel!`;
            }}
            onDownloadPdf={async () => {
              await downloadFilteredInvoicesPdf(filtered, companyMeta);
              return "Sales report PDF downloaded!";
            }}
          />
        </div>
      </TableToolbar>

      {/* Main Table Content */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Sales Transactions Found"
            description="There are no sales records matching your selected search or filters."
            buttonText={isAnyFilterActive ? "Reset Filters" : undefined}
            onButtonClick={handleResetFilters}
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("sl") && <TableTh align="center" width={40}>SL</TableTh>}
              {isColVisible("orderId") && <TableTh className="whitespace-nowrap">Order ID</TableTh>}
              {isColVisible("customer") && (
                <TableTh className="min-w-[120px]">
                  {renderSortHeader("Customer", "customer")}
                </TableTh>
              )}
              {isColVisible("phone") && <TableTh className="whitespace-nowrap">Phone</TableTh>}
              {isColVisible("date") && <TableTh className="whitespace-nowrap">Date</TableTh>}
              {isColVisible("items") && <TableTh align="center" className="whitespace-nowrap">Items</TableTh>}
              {isColVisible("subtotal") && <TableTh align="right" className="whitespace-nowrap">Subtotal</TableTh>}
              {isColVisible("discount") && <TableTh align="right" className="whitespace-nowrap">Discount</TableTh>}
              {isColVisible("vat") && <TableTh align="right" className="whitespace-nowrap">VAT</TableTh>}
              {isColVisible("total") && (
                <TableTh align="right" className="whitespace-nowrap">
                  <div className="flex justify-end">
                    {renderSortHeader("Total", "amount")}
                  </div>
                </TableTh>
              )}
              {isColVisible("paid") && <TableTh align="right" className="whitespace-nowrap">Paid (৳)</TableTh>}
              {isColVisible("due") && <TableTh align="right" className="whitespace-nowrap">Due (৳)</TableTh>}
              {isColVisible("method") && <TableTh align="center" className="w-28 whitespace-nowrap">Method</TableTh>}
              {isColVisible("status") && <TableTh align="center" className="w-28 whitespace-nowrap">Payment Status</TableTh>}
              {isColVisible("actions") && <TableTh align="center" className="w-24 whitespace-nowrap">Actions</TableTh>}
            </TableHead>
            <TableBody>
              {paginated.map((item: any, idx: number) => {
                const sl = (currentPage - 1) * pageSize + idx + 1;
                const {
                  orderNo: orderDisplay,
                  partyName: customerName,
                  partyPhone: customerPhone,
                  tradeDate: saleDate,
                  grandTotal,
                  paid,
                  due,
                  subtotal: sub,
                  discount: disc,
                  vat,
                  paymentType: pType,
                  itemsCount,
                  isFullyPaid,
                  isPartial,
                } = extractSaleReportMetrics(item, idx);

                return (
                  <tr
                    key={item.id || item.invoiceNo || idx}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                  >
                    {/* SL */}
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-[var(--ui-text)] text-xs font-normal">
                        {sl}
                      </td>
                    )}

                    {/* Order ID - Exactly as in Purchase Return List */}
                    {isColVisible("orderId") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        <div className="flex items-center gap-1.5 group/ord">
                          <span
                            onClick={() => onView(item)}
                            title="Click to view invoice"
                            className="cursor-pointer hover:text-[var(--primary-color)] font-medium transition-colors"
                          >
                            {orderDisplay}
                          </span>
                          {orderDisplay && (
                            <button
                              type="button"
                              onClick={() => handleCopyOrderId(orderDisplay, item.id)}
                              title="Copy Order ID"
                              className="p-1 text-[var(--ui-text-subtle)] hover:text-[var(--primary-color)] transition-colors opacity-0 group-hover/ord:opacity-100 cursor-pointer"
                            >
                              {copiedId === item.id ? (
                                <FiCheck className="text-[var(--ui-success)] text-xs" />
                              ) : (
                                <FiCopy size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Customer */}
                    {isColVisible("customer") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        <span className="font-medium text-[var(--ui-text)]">
                          {customerName}
                        </span>
                      </td>
                    )}

                    {/* Phone */}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        {customerPhone || (
                          <span className="text-[var(--ui-text-subtle)] font-normal">N/A</span>
                        )}
                      </td>
                    )}

                    {/* Date */}
                    {isColVisible("date") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        {saleDate ? (
                          moment(saleDate).format("DD MMM YYYY")
                        ) : (
                          <span className="text-[var(--ui-text-subtle)] font-normal">N/A</span>
                        )}
                      </td>
                    )}

                    {/* Items */}
                    {isColVisible("items") && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] text-xs font-medium whitespace-nowrap">
                          {itemsCount > 0 ? `${itemsCount} ${itemsCount === 1 ? "item" : "items"}` : "1 item"}
                        </span>
                      </td>
                    )}

                    {/* Subtotal */}
                    {isColVisible("subtotal") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        ৳ {formatMoney(sub)}
                      </td>
                    )}

                    {/* Discount */}
                    {isColVisible("discount") && (
                      <td className="py-2.5 px-3 text-right text-xs font-normal whitespace-nowrap">
                        {disc > 0 ? (
                          <span className="text-[var(--ui-danger)] font-medium">-৳ {formatMoney(disc)}</span>
                        ) : (
                          <span className="text-[var(--ui-text-subtle)] font-normal">N/A</span>
                        )}
                      </td>
                    )}

                    {/* VAT */}
                    {isColVisible("vat") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-text-muted)] text-xs font-normal whitespace-nowrap">
                        {vat > 0 ? (
                          `+৳ ${formatMoney(vat)}`
                        ) : (
                          <span className="text-[var(--ui-text-subtle)] font-normal">N/A</span>
                        )}
                      </td>
                    )}

                    {/* Grand Total */}
                    {isColVisible("total") && (
                      <td className="py-2.5 px-3 text-right font-bold text-[var(--ui-text)] text-xs whitespace-nowrap">
                        ৳ {formatMoney(grandTotal)}
                      </td>
                    )}

                    {/* Paid */}
                    {isColVisible("paid") && (
                      <td className="py-2.5 px-3 text-right font-semibold text-[var(--ui-success)] text-xs whitespace-nowrap">
                        ৳ {formatMoney(paid)}
                      </td>
                    )}

                    {/* Due */}
                    {isColVisible("due") && (
                      <td className="py-2.5 px-3 text-right text-xs whitespace-nowrap">
                        {due > 0 ? (
                          <span className="text-[var(--ui-danger)] font-bold">
                            ৳ {formatMoney(due)}
                          </span>
                        ) : (
                          <span className="text-[var(--ui-text-subtle)] font-normal">৳ 0</span>
                        )}
                      </td>
                    )}

                    {/* Payment Type */}
                    {isColVisible("method") && (
                      <td className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] border rounded-md bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border-[var(--primary-color-muted)] font-semibold">
                          {pType}
                        </span>
                      </td>
                    )}

                    {/* Status */}
                    {isColVisible("status") && (
                      <td className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md font-semibold ${
                            isFullyPaid
                              ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                              : isPartial
                              ? "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)] border-[var(--ui-warning-border)]"
                              : "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                          }`}
                        >
                          {isFullyPaid ? "Paid" : isPartial ? "Partial" : "Due"}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    {isColVisible("actions") && (
                      <td className="py-2 px-3 text-center w-24 whitespace-nowrap">
                        <TableActionButtons
                          onView={() => onView(item)}
                          onPrint={() => onPrint(item)}
                          viewTitle="View Invoice"
                          printTitle="Print Receipt"
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

      {/* Pagination Footer */}
      {!isLoading && filtered.length > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={currentPage}
          dataLimit={pageSize}
          setDataLimit={setPageSize}
          setCurrentPageNumber={setCurrentPage}
          handlePagination={(data) => setCurrentPage(data.selected + 1)}
          pageSizeOptions={[10, 15, 20, 50]}
          entityLabel="orders"
        />
      )}
    </TableContainer>
  );
};

export default SalesReportTable;