import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FiChevronDown, FiCopy, FiCheck } from "react-icons/fi";
import moment from "moment";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TablePaginationFooter,
  TableActionButtons,
} from "@/components/common";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import type { SaleItem, PartyItem } from "@/types";
import { FaSearch, FaFileExcel } from "react-icons/fa";
import { exportSalesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { formatMoney } from "@/utils/formatters";
import { usePermission } from "@/hooks/usePermission";
import { getCleanOrderNo } from "../hooks/useSalesQueries";

interface SaleTableProps {
  sales: SaleItem[];
  exportableSales?: SaleItem[];
  totalCount: number;
  isLoading?: boolean;
  isFetching?: boolean;
  pageCount: number;
  currentPageNumber: number;
  setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
  dataLimit: number;
  setDataLimit: React.Dispatch<React.SetStateAction<number>>;
  handlePagination: (paginationData: { selected: number }) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (method: string) => void;
  customerFilter: string;
  setCustomerFilter: (customerId: string) => void;
  customersList?: PartyItem[];
  dateFilter?: string;
  setDateFilter?: (filter: string) => void;
  customStartDate?: string;
  setCustomStartDate?: (date: string) => void;
  customEndDate?: string;
  setCustomEndDate?: (date: string) => void;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
  returnedInvoiceSet?: Set<string>;
  onEdit: (sale: SaleItem) => void;
  onView: (sale: SaleItem) => void;
  onPrint: (sale: SaleItem) => void;
  onDelete?: (sale: SaleItem) => void;
  onExport?: () => void;
}

export const SaleTable: React.FC<SaleTableProps> = ({
  sales,
  exportableSales,
  totalCount,
  isLoading,
  pageCount,
  currentPageNumber,
  setCurrentPageNumber,
  dataLimit,
  setDataLimit,
  handlePagination,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  customerFilter,
  setCustomerFilter,
  customersList = [],
  dateFilter = "all",
  setDateFilter,
  customStartDate = "",
  setCustomStartDate,
  customEndDate = "",
  setCustomEndDate,
  sortBy = "latest",
  setSortBy,
  returnedInvoiceSet,
  onEdit,
  onView,
  onPrint,
  onDelete: _onDelete,
  onExport,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canUpdate, canDelete, canCreate } = usePermission();
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const handleCopyOrderId = (text?: string, id?: string | number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (id !== undefined) setCopiedId(id);
    showSuccessToast(`Copied Order ID: ${text}`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const customerRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    const dataToExport = exportableSales && exportableSales.length > 0 ? exportableSales : sales;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast("No sales records available to export");
      return;
    }
    try {
      exportSalesToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} sales to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered customers for searchable dropdown
  const filteredCustomerOptions = useMemo(() => {
    if (!customerSearchQuery.trim()) return customersList;
    const q = customerSearchQuery.toLowerCase().trim();
    return customersList.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [customersList, customerSearchQuery]);

  const selectedCustomerObj = customerFilter
    ? customersList.find((c) => String(c.id ?? c.name ?? "") === String(customerFilter)) || null
    : null;

  const currentCustomerLabel = selectedCustomerObj
    ? (selectedCustomerObj.name || t("Customer"))
    : t("All Customers");

  // Lightweight sort header render helper with small black chevron
  const renderSortHeader = (label: string, activeKey: "customer" | "amount") => {
    const isAsc =
      sortBy === (activeKey === "customer" ? "customer_a_to_z" : "amount_low_to_high") ||
      (activeKey === "amount" && sortBy === "amount_low");
    const isDesc =
      sortBy === (activeKey === "customer" ? "customer_z_to_a" : "amount_high_to_low") ||
      (activeKey === "amount" && sortBy === "amount_high");

    const handleClick = () => {
      if (!setSortBy) return;
      if (activeKey === "customer") {
        setSortBy(isAsc ? "customer_z_to_a" : isDesc ? "latest" : "customer_a_to_z");
      } else {
        setSortBy(isAsc ? "amount_high_to_low" : isDesc ? "latest" : "amount_low_to_high");
      }
      setCurrentPageNumber(1);
    };

    return (
      <span
        onClick={setSortBy ? handleClick : undefined}
        className={`inline-flex items-center gap-1 select-none text-current ${
          setSortBy ? "cursor-pointer" : ""
        }`}
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

  // Column Visibility Configuration
  const availableColumns: ColumnItem[] = [
    { key: "sl", label: "SL" },
    { key: "orderId", label: "Order ID" },
    { key: "customer", label: "Customer" },
    { key: "phone", label: "Phone" },
    { key: "date", label: "Date" },
    { key: "items", label: "Items" },
    { key: "total", label: "Total (৳)" },
    { key: "paid", label: "Paid (৳)" },
    { key: "due", label: "Due (৳)" },
    { key: "method", label: "Method" },
    { key: "status", label: "Payment Status" },
    { key: "actions", label: "Actions" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("sale_table_columns");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
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
        localStorage.setItem("sale_table_columns", JSON.stringify(next));
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
      localStorage.removeItem("sale_table_columns");
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  return (
    <TableContainer>
      {/* Search and Filters Bar */}
      <TableToolbar>
        {/* Left Section: Compact Search Box + Filters Group */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Compact Search Box */}
          <div className="w-full sm:w-44 md:w-48 lg:w-52 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPageNumber(1);
              }}
              setSearchQuery={setSearchQuery}
              placeholder="Search sales..."
            />
          </div>

          {/* Date Range Picker */}
          <div className="w-[calc(50%-4px)] sm:w-40 lg:w-44 shrink-0 z-50">
            <DateRangePicker
              startDate={customStartDate}
              endDate={customEndDate}
              selectedPreset={dateFilter}
              onPresetChange={(preset) => {
                if (setDateFilter) setDateFilter(preset);
                setCurrentPageNumber(1);
              }}
              onChange={({ startDate, endDate, label }) => {
                if (setCustomStartDate) setCustomStartDate(startDate);
                if (setCustomEndDate) setCustomEndDate(endDate);
                if (setDateFilter) setDateFilter(label || "custom");
                setCurrentPageNumber(1);
              }}
              size="sm"
              inputClassName="!h-8 !rounded-lg !py-0"
            />
          </div>

          {/* Searchable Customer Filter */}
          {customersList.length > 0 && (
            <div className="relative w-[calc(50%-4px)] sm:w-36 shrink-0 z-50" ref={customerRef}>
              <button
                type="button"
                onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                className="w-full h-8 px-2 flex items-center justify-between text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                <span className="truncate flex-1 text-left">{currentCustomerLabel}</span>
                <FiChevronDown className="text-[var(--ui-text-muted)] shrink-0 ml-1 text-xs" size={13} />
              </button>

              {isCustomerDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 max-w-[calc(100vw-2rem)] bg-[var(--ui-surface)] rounded-lg shadow-2xl border border-[var(--ui-border)] p-2 z-[99999]">
                  <div className="relative mb-2">
                    <FaSearch className="absolute left-2.5 top-2.5 text-[var(--ui-text-subtle)] text-xs" />
                    <input
                      type="text"
                      placeholder="Search customer name, phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-[var(--color-primary)] rounded-md focus:outline-none focus:border-[var(--color-primary)] text-[var(--ui-text)]"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-[var(--ui-border)]">
                    <div
                      onClick={() => {
                        setCustomerFilter("");
                        setIsCustomerDropdownOpen(false);
                        setCustomerSearchQuery("");
                        setCurrentPageNumber(1);
                      }}
                      className={`p-2 hover:bg-[var(--primary-color-light)] cursor-pointer rounded-md transition-colors text-xs font-medium ${
                        !customerFilter ? "bg-[var(--primary-color-light)] text-[var(--color-primary)] font-semibold" : "text-[var(--ui-text)]"
                      }`}
                    >
                      All Customers
                    </div>

                    {filteredCustomerOptions.length > 0 ? (
                      filteredCustomerOptions.map((c) => {
                        const cVal = String(c.id ?? c.name ?? "");
                        const isSelected = customerFilter === cVal;
                        const cName = c.name || "Customer";
                        const cPhone = c.phone || "";

                        return (
                          <div
                            key={c.id ?? c.name}
                            onClick={() => {
                              setCustomerFilter(cVal);
                              setIsCustomerDropdownOpen(false);
                              setCustomerSearchQuery("");
                              setCurrentPageNumber(1);
                            }}
                            className={`p-2 hover:bg-[var(--primary-color-light)] cursor-pointer rounded-md transition-colors text-xs flex justify-between items-center ${
                              isSelected ? "bg-[var(--primary-color-light)] text-[var(--color-primary)] font-semibold" : "text-[var(--ui-text)]"
                            }`}
                          >
                            <span className="truncate">{cName}</span>
                            {cPhone && (
                              <span className="text-[10px] text-[var(--ui-text-muted)] shrink-0 ml-1">
                                ({cPhone})
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-[var(--ui-text-subtle)] text-xs">{t("No customer found")}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-28 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="">{t("All Status")}</option>
              <option value="PAID">{t("Paid")}</option>
              <option value="PARTIAL">{t("Partial")}</option>
              <option value="DUE">{t("Due / Credit")}</option>
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none text-xs" size={13} />
          </div>

          {/* Payment Method Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-28 shrink-0">
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">{t("All Methods")}</option>
              <option value="CASH">{t("Cash")}</option>
              <option value="CREDIT">{t("Credit")}</option>
            </select>
            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none text-xs" size={13} />
          </div>
        </div>

        {/* Right Actions: Column Visibility, Export */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          {/* Column Visibility Menu */}
          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

            {/* Export to Excel Button */}
            <button
              type="button"
              onClick={handleExport}
              title={t("Download Excel Report")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)] border border-[var(--ui-success-border)] rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FaFileExcel className="text-[var(--ui-success)] shrink-0" size={12} />
              <span>{t("Export")}</span>
            </button>
          </div>
        </TableToolbar>

        {/* Main Table Content */}
        <TableScroll>
          {isLoading ? (
            <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
          ) : sales.length === 0 ? (
            <EmptyState
              title="No Sales Found"
              description="There are no sales records matching your selected search or filters."
            />
          ) : (
            <Table>
              <TableHead rowClassName="!bg-[var(--primary-color-dark)] [&>th]:!text-[var(--ui-surface)]">
                {isColVisible("sl") && <TableTh align="center" width={40}>SL</TableTh>}
                {isColVisible("orderId") && <TableTh className="whitespace-nowrap">Order ID</TableTh>}
                {isColVisible("customer") && (
                  <TableTh>
                    {renderSortHeader("Customer", "customer")}
                  </TableTh>
                )}
                {isColVisible("phone") && <TableTh>Phone</TableTh>}
                {isColVisible("date") && <TableTh>Date</TableTh>}
                {isColVisible("items") && <TableTh align="center">Items</TableTh>}
                {isColVisible("total") && (
                  <TableTh align="right">
                    <div className="flex justify-end">
                      {renderSortHeader("Total (৳)", "amount")}
                    </div>
                  </TableTh>
                )}
                {isColVisible("paid") && <TableTh align="right">Paid (৳)</TableTh>}
                {isColVisible("due") && <TableTh align="right">Due (৳)</TableTh>}
                {isColVisible("method") && <TableTh align="center">Method</TableTh>}
                {isColVisible("status") && <TableTh align="center">Payment Status</TableTh>}
                {isColVisible("actions") && (
                  <TableTh align="center" className="w-28">Actions</TableTh>
                )}
              </TableHead>
            <TableBody>
              {sales.map((sale, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const itemsCount = Array.isArray(sale.salesDetails) && sale.salesDetails.length > 0
                  ? sale.salesDetails.length
                  : 1;

                const grandTotal = Number(sale.grandTotal ?? 0);
                const paidAmount = Number(sale.paidAmount ?? 0);
                const dueAmount = Number(sale.dueAmount ?? 0);
                const paymentType = (sale.paymentType || "CASH").toUpperCase();
                const displayOrderId = getCleanOrderNo(sale.orderNo, sale.invoiceNo || (sale as any).salesInvoiceNo);

                let statusBadge = "Paid";
                let statusBg = "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)] font-semibold";
                if (dueAmount > 0 && paidAmount > 0) {
                  statusBadge = "Partial";
                  statusBg = "bg-[var(--ui-warning-border)] text-[var(--ui-warning-dark)] border-[var(--ui-warning-border)] font-semibold";
                } else if (dueAmount > 0 && paidAmount === 0) {
                  statusBadge = "Due";
                  statusBg = "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)] font-semibold";
                }

                // Directly read return flag from backend or returnedInvoiceSet
                const invoiceKey = String(sale.invoiceNo || "").trim().toLowerCase();
                const orderKey = String(sale.orderNo || "").trim().toLowerCase();
                const idKey = String(sale.id || "").trim().toLowerCase();
                const isAlreadyReturned =
                  Boolean(sale.hasReturn) ||
                  Boolean(
                    returnedInvoiceSet &&
                      ((invoiceKey && returnedInvoiceSet.has(invoiceKey)) ||
                        (orderKey && returnedInvoiceSet.has(orderKey)) ||
                        (idKey && returnedInvoiceSet.has(idKey)))
                  );

                return (
                  <tr
                    key={sale.id}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                  >
                    {/* SL */}
                    {isColVisible("sl") && (
                      <td className="py-2.5 px-3 text-center text-[var(--ui-text)] text-xs font-normal">
                        {serialNumber}
                      </td>
                    )}

                    {/* Order ID */}
                    {isColVisible("orderId") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        <div className="flex items-center gap-1.5 group/ord">
                          <span
                            onClick={() => onView(sale)}
                            title="Click to view invoice"
                            className="cursor-pointer hover:text-[var(--primary-color)] font-medium transition-colors"
                          >
                            {displayOrderId}
                          </span>
                          {displayOrderId && (
                            <button
                              type="button"
                              onClick={() => handleCopyOrderId(displayOrderId, sale.id)}
                              title="Copy Order ID"
                              className="p-1 text-[var(--ui-text-subtle)] hover:text-[var(--primary-color)] transition-colors opacity-0 group-hover/ord:opacity-100 cursor-pointer"
                            >
                              {copiedId === sale.id ? (
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
                        {sale.customerName || "Walk-in Customer"}
                      </td>
                    )}

                    {/* Phone */}
                    {isColVisible("phone") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        {sale.customerPhone || "-"}
                      </td>
                    )}

                    {/* Date */}
                    {isColVisible("date") && (
                      <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        <span className="flex items-center gap-1 text-[11px] text-[var(--ui-text)] font-normal">
                          {sale.salesDate
                            ? moment(sale.salesDate).format("DD MMM, YYYY")
                            : moment().format("DD MMM, YYYY")}
                        </span>
                      </td>
                    )}

                    {/* Items Count */}
                    {isColVisible("items") && (
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] rounded text-[11px] font-normal">
                          {itemsCount}
                        </span>
                      </td>
                    )}

                    {/* Total Amount */}
                    {isColVisible("total") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        ৳ {formatMoney(grandTotal)}
                      </td>
                    )}

                    {/* Paid Amount */}
                    {isColVisible("paid") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        ৳ {formatMoney(paidAmount)}
                      </td>
                    )}

                    {/* Due Amount */}
                    {isColVisible("due") && (
                      <td className="py-2.5 px-3 text-right text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                        ৳ {formatMoney(dueAmount)}
                      </td>
                    )}

                    {/* Payment Method */}
                    {isColVisible("method") && (
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--primary-color-muted)] text-[var(--primary-color-dark)] border border-[var(--primary-color-muted)] rounded-md">
                          {paymentType}
                        </span>
                      </td>
                    )}

                    {/* Payment Status */}
                    {isColVisible("status") && (
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] border rounded-md ${statusBg}`}>
                          {t(statusBadge)}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    {isColVisible("actions") && (
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <TableActionButtons
                          onView={() => onView(sale)}
                          onPrint={() => onPrint(sale)}
                          onEdit={canUpdate("sales") ? () => onEdit(sale) : undefined}
                          onDelete={canDelete("sales") && _onDelete ? () => _onDelete(sale) : undefined}
                          onReturn={
                            (canCreate("sales_return") || canCreate("sales"))
                              ? () =>
                                  navigate("/admin/create-sales-return", {
                                    state: { sale },
                                  })
                              : undefined
                          }
                          returnTitle="Return Sale / পণ্য ফেরত"
                          isReturnDisabled={isAlreadyReturned}
                          returnDisabledTitle="This sale has already been returned"
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
      {!isLoading && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={currentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          setCurrentPageNumber={setCurrentPageNumber}
          handlePagination={handlePagination}
          entityLabel="sales"
        />
      )}
    </TableContainer>
  );
};

export default SaleTable;
