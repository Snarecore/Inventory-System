import React, { useState, useMemo } from "react";
import { FiChevronDown, FiPrinter, FiChevronRight } from "react-icons/fi";
import { FaFileExcel } from "react-icons/fa";
import moment from "moment";
import * as XLSX from "xlsx";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
  TablePaginationFooter,
  TableSkeleton,
  EmptyState,
} from "@/components/common";
import ColumnVisibilityDropdown, { type ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";
import { useDebounce } from "@/hooks/useDebounce";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface GenericSettlementHistoryItem {
  id?: string | number;
  collectionNo?: string;
  paymentNo?: string;
  voucherNo?: string;
  collectionDate?: string;
  paymentDate?: string;
  addedDate?: string;
  customerName?: string;
  supplierName?: string;
  customerPhone?: string;
  supplierPhone?: string;
  customerId?: string | number;
  supplierId?: string | number;
  paymentMode?: string;
  totalAmount?: number;
  totalPaid?: number;
  totalCollected?: number;
  totalDiscount?: number;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
  remark?: string;
  details?: any[];
  collectionDetails?: any[];
  paymentDetails?: any[];
  bankDetails?: any;
  mfsDetails?: any;
  [key: string]: any;
}

export interface TradeSettlementHistoryTableProps<T extends GenericSettlementHistoryItem> {
  partyType: "customer" | "supplier";
  dataList: T[];
  isLoading?: boolean;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onPrintReceipt: (receiptData: any) => void;
  storageKey: string;
  excelFileName?: string;
}

const cleanDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  return String(dateStr).replace("T", " ").split(" ")[0].trim() || "-";
};

export const TradeSettlementHistoryTable = <T extends GenericSettlementHistoryItem>({
  partyType,
  dataList,
  isLoading = false,
  onDateRangeChange,
  onPrintReceipt,
  storageKey,
  excelFileName,
}: TradeSettlementHistoryTableProps<T>) => {
  const isCustomer = partyType === "customer";
  const partyTitle = isCustomer ? "Customer" : "Supplier";
  const actionTitle = isCustomer ? "Collection" : "Payment";

  // Date range filters (default to current month)
  const [startDate, setStartDate] = useState<string>(
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );
  const [dateFilterPreset, setDateFilterPreset] = useState<string>("this_month");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("all");

  // Accordion state
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string | number>>(() => new Set());

  // Pagination states
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Column Visibility Configuration
  const availableColumns: ColumnItem[] = useMemo(
    () => [
      { key: "expand", label: "Expand" },
      { key: "sl", label: "SL" },
      { key: "date", label: "Date" },
      { key: "voucherNo", label: "Voucher No" },
      { key: "party", label: partyTitle },
      { key: "phone", label: "Phone" },
      { key: "method", label: "Method" },
      { key: "amount", label: isCustomer ? "Collected (৳)" : "Paid (৳)" },
      { key: "bills", label: "Bills" },
      { key: "remark", label: "Remark" },
      { key: "receipt", label: "Receipt" },
    ],
    [partyTitle, isCustomer]
  );

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
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
        localStorage.setItem(storageKey, JSON.stringify(next));
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
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const activeVisibleColumnCount = availableColumns.filter((c) => isColVisible(c.key)).length;

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    onDateRangeChange(val, endDate);
    setCurrentPageNumber(1);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    onDateRangeChange(startDate, val);
    setCurrentPageNumber(1);
  };

  // Helper getters
  const getPartyName = (item: T) =>
    item.customerName || item.supplierName || item.name || partyTitle;
  const getPartyPhone = (item: T) => item.customerPhone || item.supplierPhone || item.phone || "-";
  const getVoucherNo = (item: T, idx: number) =>
    item.collectionNo || item.paymentNo || item.voucherNo || `${isCustomer ? "COL" : "PAY"}-${idx + 1}`;
  const getVoucherDate = (item: T) =>
    cleanDateOnly(item.collectionDate || item.paymentDate || item.addedDate);
  const getItemDetails = (item: T): any[] =>
    item.details || item.collectionDetails || item.paymentDetails || [];
  const getTotalAmount = (item: T) =>
    Number(item.totalAmount ?? item.totalPaid ?? item.totalCollected ?? 0);

  // Client-side filtering
  const processedList = useMemo(() => {
    let list = [...dataList];

    if (paymentModeFilter !== "all") {
      list = list.filter((r) =>
        String(r.paymentMode || "").toLowerCase().includes(paymentModeFilter.toLowerCase())
      );
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((r, idx) => {
        const party = getPartyName(r).toLowerCase();
        const phone = getPartyPhone(r).toLowerCase();
        const vNo = getVoucherNo(r, idx).toLowerCase();
        const rem = (r.remark || "").toLowerCase();
        return party.includes(q) || phone.includes(q) || vNo.includes(q) || rem.includes(q);
      });
    }

    // Sort descending by date
    list.sort((a, b) => {
      const dateA = a.collectionDate || a.paymentDate || a.addedDate || "";
      const dateB = b.collectionDate || b.paymentDate || b.addedDate || "";
      return dateB.localeCompare(dateA);
    });

    return list;
  }, [dataList, paymentModeFilter, debouncedSearch]);

  const totalCount = processedList.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / dataLimit));
  const startIndex = (currentPageNumber - 1) * dataLimit;
  const paginatedList = processedList.slice(startIndex, startIndex + dataLimit);

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  const toggleRow = (id: string | number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Export to Excel
  const handleExport = () => {
    if (processedList.length === 0) {
      showErrorToast(`No ${actionTitle.toLowerCase()} history to export`);
      return;
    }

    try {
      const rows = processedList.map((item, idx) => ({
        SL: idx + 1,
        Date: getVoucherDate(item),
        "Voucher No": getVoucherNo(item, idx),
        [`${partyTitle} Name`]: getPartyName(item),
        Phone: getPartyPhone(item),
        "Payment Mode": item.paymentMode || "Cash",
        [`${isCustomer ? "Collected" : "Paid"} Amount (৳)`]: getTotalAmount(item),
        "Discount (৳)": Number(item.totalDiscount || 0),
        Bills: getItemDetails(item).map((d) => d.invoiceNo).join(", ") || "-",
        Remark: item.remark || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${actionTitle} History`);
      const today = new Date().toISOString().split("T")[0];
      const fname = excelFileName || `${actionTitle}_History_${today}.xlsx`;
      XLSX.writeFile(workbook, fname);
      showSuccessToast(`Successfully exported ${rows.length} records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  const handlePrintHistoricalReceipt = (item: T, idx: number) => {
    const details = getItemDetails(item);
    const receiptData = {
      receiptNo: getVoucherNo(item, idx),
      [isCustomer ? "collectionDate" : "paymentDate"]: getVoucherDate(item),
      [isCustomer ? "customerName" : "supplierName"]: getPartyName(item),
      [isCustomer ? "customerPhone" : "supplierPhone"]: getPartyPhone(item),
      [isCustomer ? "customerId" : "supplierId"]: item.customerId || item.supplierId || item.id || "",
      totalAmount: getTotalAmount(item),
      totalDiscount: Number(item.totalDiscount || 0),
      paymentMode: item.paymentMode || "Cash",
      remark: item.remark || "",
      allocations: details.map((d) => ({
        invoiceNo: d.invoiceNo,
        paidAmount: Number(d.paidAmount || 0),
        discountAmount: 0,
        dueAmount: Number(d.dueAmount || 0),
      })),
      cashAmount: item.cashAmount,
      bankAmount: item.bankAmount,
      mfsAmount: item.mfsAmount,
      bankDetails: item.bankDetails,
      mfsDetails: item.mfsDetails,
    };

    onPrintReceipt(receiptData);
  };

  return (
    <TableContainer>
      {/* Search and Filters Bar */}
      <TableToolbar>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="w-full sm:w-auto">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              filterPreset={dateFilterPreset}
              onFilterPresetChange={setDateFilterPreset}
              size="sm"
            />
          </div>

          <div className="w-full sm:w-52 shrink-0">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setCurrentPageNumber(1);
              }}
              setSearchQuery={(val) => {
                setSearchQuery(val);
                setCurrentPageNumber(1);
              }}
              placeholder={`Search voucher, ${partyTitle.toLowerCase()}...`}
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="h-8 pl-2.5 pr-7 text-xs bg-[var(--ui-surface)] border border-[var(--ui-border)] rounded-lg text-[var(--ui-text)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-color)] appearance-none cursor-pointer font-medium"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank / Card</option>
              <option value="mfs">MFS</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)] pointer-events-none text-xs"
              size={13}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--ui-border)]">
          <ColumnVisibilityDropdown
            columns={availableColumns}
            visibleColumns={visibleColumns}
            onToggle={handleToggleColumn}
            onReset={handleResetColumns}
          />

          <button
            type="button"
            onClick={handleExport}
            title="Download Excel Report"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)] border border-[var(--ui-success-border)] rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <FaFileExcel className="text-[var(--ui-success)] shrink-0" size={12} />
            <span>Export</span>
          </button>
        </div>
      </TableToolbar>

      {/* Main Table Content */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={activeVisibleColumnCount} rowCount={8} />
        ) : processedList.length === 0 ? (
          <EmptyState
            title={`No ${actionTitle} History Found`}
            description={`There are no ${actionTitle.toLowerCase()} vouchers matching your selected search or date range.`}
          />
        ) : (
          <Table>
            <TableHead>
              {isColVisible("expand") && <TableTh align="center" className="w-8" />}
              {isColVisible("sl") && <TableTh align="center" width={40}>SL</TableTh>}
              {isColVisible("date") && <TableTh>Date</TableTh>}
              {isColVisible("voucherNo") && <TableTh>Voucher No</TableTh>}
              {isColVisible("party") && <TableTh>{partyTitle}</TableTh>}
              {isColVisible("phone") && <TableTh>Phone</TableTh>}
              {isColVisible("method") && <TableTh align="center">Method</TableTh>}
              {isColVisible("amount") && (
                <TableTh align="right">
                  {isCustomer ? "Collected (৳)" : "Paid (৳)"}
                </TableTh>
              )}
              {isColVisible("bills") && <TableTh align="center">Bills</TableTh>}
              {isColVisible("remark") && <TableTh>Remark</TableTh>}
              {isColVisible("receipt") && <TableTh align="center" className="w-16">Receipt</TableTh>}
            </TableHead>
            <TableBody>
              {paginatedList.map((row, index) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + index + 1;
                const rowKey = row.id ?? index;
                const isExpanded = expandedRowIds.has(rowKey);
                const details = getItemDetails(row);
                const totalAmt = getTotalAmount(row);

                return (
                  <React.Fragment key={rowKey}>
                    <tr className="hover:bg-[var(--primary-color-light)]/40 transition-colors group">
                      {/* Expand Chevron */}
                      {isColVisible("expand") && (
                        <td className="py-2.5 px-3 text-center">
                          {details.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleRow(rowKey)}
                              className="p-1 rounded hover:bg-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors cursor-pointer"
                              title={isExpanded ? "Collapse bills" : "Expand settled bills"}
                            >
                              <FiChevronRight
                                size={13}
                                className={`transition-transform duration-200 ${
                                  isExpanded ? "rotate-90 text-[var(--color-primary)] font-bold" : ""
                                }`}
                              />
                            </button>
                          ) : (
                            <span className="text-[var(--ui-text-subtle)]">-</span>
                          )}
                        </td>
                      )}

                      {/* SL */}
                      {isColVisible("sl") && (
                        <td className="py-2.5 px-3 text-center text-[var(--ui-text)] text-xs font-normal">
                          {serialNumber}
                        </td>
                      )}

                      {/* Date */}
                      {isColVisible("date") && (
                        <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                          {getVoucherDate(row)}
                        </td>
                      )}

                      {/* Voucher No */}
                      {isColVisible("voucherNo") && (
                        <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-semibold whitespace-nowrap">
                          {getVoucherNo(row, index)}
                        </td>
                      )}

                      {/* Party */}
                      {isColVisible("party") && (
                        <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-semibold whitespace-nowrap">
                          {getPartyName(row)}
                        </td>
                      )}

                      {/* Phone */}
                      {isColVisible("phone") && (
                        <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal whitespace-nowrap">
                          {getPartyPhone(row)}
                        </td>
                      )}

                      {/* Method */}
                      {isColVisible("method") && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              String(row.paymentMode).toLowerCase().includes("cash")
                                ? "bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] border border-[var(--ui-success-border)]"
                                : String(row.paymentMode).toLowerCase().includes("bank")
                                ? "bg-[var(--primary-color-light)] text-[var(--primary-color-dark)] border border-[var(--primary-color-muted)]"
                                : "bg-[var(--ui-info-light)] text-[var(--ui-info-dark)] border border-[var(--ui-info-border)]"
                            }`}
                          >
                            {row.paymentMode || "Cash"}
                          </span>
                        </td>
                      )}

                      {/* Amount */}
                      {isColVisible("amount") && (
                        <td className="py-2.5 px-3 text-right font-bold text-[var(--ui-text)] text-xs whitespace-nowrap">
                          ৳ {formatMoney(totalAmt)}
                        </td>
                      )}

                      {/* Bills Count */}
                      {isColVisible("bills") && (
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-1.5 py-0.5 bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] rounded text-[11px] font-normal">
                            {details.length} bill{details.length !== 1 ? "s" : ""}
                          </span>
                        </td>
                      )}

                      {/* Remark */}
                      {isColVisible("remark") && (
                        <td className="py-2.5 px-3 text-[var(--ui-text)] text-xs font-normal truncate max-w-[150px]">
                          {row.remark || <span className="text-[var(--ui-text-subtle)]">-</span>}
                        </td>
                      )}

                      {/* Print Receipt */}
                      {isColVisible("receipt") && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePrintHistoricalReceipt(row, index)}
                            className="inline-flex items-center justify-center p-1.5 text-[var(--ui-text)] hover:text-[var(--ui-text)] bg-[var(--ui-surface-sunken)] hover:bg-[var(--ui-border)] rounded-md transition-colors cursor-pointer"
                            title="Print Money Receipt"
                          >
                            <FiPrinter size={13} />
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Accordion Row */}
                    {isExpanded && details.length > 0 && (
                      <tr className="bg-[var(--primary-color-light)]/20">
                        <td
                          colSpan={activeVisibleColumnCount}
                          className="px-6 py-2 border-b border-[var(--ui-border)]"
                        >
                          <div className="bg-[var(--ui-surface)] rounded-lg border border-[var(--ui-border)] p-2.5 space-y-1.5">
                            <span className="text-[11px] font-semibold text-[var(--ui-text)]">
                              Settled Bills Breakdown:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {details.map((detail: any, di: number) => (
                                <div
                                  key={di}
                                  className="p-2 rounded bg-[var(--ui-surface-muted)] border border-[var(--ui-border)] text-xs flex items-center justify-between"
                                >
                                  <span className="font-semibold text-[var(--ui-text)]">
                                    #{detail.invoiceNo}
                                  </span>
                                  <div className="text-right">
                                    <span className="text-[var(--ui-success-dark)] font-bold block">
                                      Paid: ৳ {formatMoney(detail.paidAmount)}
                                    </span>
                                    <span className="text-[var(--ui-text-muted)] text-[10px]">
                                      Due Left: ৳ {formatMoney(detail.dueAmount)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
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

      {/* Pagination Footer */}
      {!isLoading && processedList.length > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={currentPageNumber}
          dataLimit={dataLimit}
          setDataLimit={setDataLimit}
          setCurrentPageNumber={setCurrentPageNumber}
          handlePagination={handlePagination}
          entityLabel={`${actionTitle.toLowerCase()}s`}
        />
      )}
    </TableContainer>
  );
};

export default TradeSettlementHistoryTable;
