import React, { useState, useMemo } from "react";
import { FiChevronDown, FiPrinter, FiChevronRight } from "react-icons/fi";
import { FaFileExcel } from "react-icons/fa";
import moment from "moment";
import * as XLSX from "xlsx";
import Search from "@/components/table-components/Search";
import DateRangePicker from "@/components/date-range-picker/DateRangePicker";
import Pagination from "@/components/pagination";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import { useCollectionReportQuery } from "@/hooks/useCollectionReport";
import { useDebounce } from "@/hooks/useDebounce";
import { formatMoney } from "@/utils/formatters";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { CollectionReceiptData } from "./CollectionReceiptModal";
import type { CollectionReportItem } from "@/types/collection.types";

interface CollectionHistoryTableProps {
  onPrintReceipt: (receipt: CollectionReceiptData) => void;
}

export const CollectionHistoryTable: React.FC<CollectionHistoryTableProps> = ({
  onPrintReceipt,
}) => {
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
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string | number>>(
    () => new Set()
  );

  // Pagination states matching Cash-Boi standards
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [dataLimit, setDataLimit] = useState<number>(10);

  // Fetch report data
  const {
    data: reportData = [],
    isLoading,
  } = useCollectionReportQuery({
    startDate,
    endDate,
  });

  const toggleRow = (id: string | number) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered collection list
  const filteredCollections = useMemo(() => {
    let list = [...reportData];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter((item) => {
        const name = (item.customerName || "").toLowerCase();
        const phone = (item.customerPhone || "").toLowerCase();
        const no = String(item.collectionNo || "").toLowerCase();
        const remark = (item.remark || "").toLowerCase();
        const invoices = (item.details || [])
          .map((d: any) => String(d.invoiceNo || "").toLowerCase())
          .join(" ");

        return (
          name.includes(q) ||
          phone.includes(q) ||
          no.includes(q) ||
          remark.includes(q) ||
          invoices.includes(q)
        );
      });
    }

    if (paymentModeFilter !== "all") {
      list = list.filter(
        (item) =>
          String(item.paymentMode || "").toLowerCase() ===
          paymentModeFilter.toLowerCase()
      );
    }

    return list;
  }, [reportData, debouncedSearch, paymentModeFilter]);

  // Paginated Slice
  const paginatedCollections = useMemo(() => {
    const start = (currentPageNumber - 1) * dataLimit;
    return filteredCollections.slice(start, start + dataLimit);
  }, [filteredCollections, currentPageNumber, dataLimit]);

  const totalCount = filteredCollections.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / dataLimit));

  const handlePagination = (paginationData: { selected: number }) => {
    setCurrentPageNumber(paginationData.selected + 1);
  };

  // Export to Excel
  const handleExport = () => {
    if (filteredCollections.length === 0) {
      showErrorToast("No collection records available to export");
      return;
    }

    try {
      const rows = filteredCollections.map((item, idx) => ({
        SL: idx + 1,
        "Voucher No": item.collectionNo || `COL-${idx + 1}`,
        Date: item.collectionDate || "-",
        Customer: item.customerName || "-",
        Phone: item.customerPhone || "-",
        "Payment Mode": item.paymentMode || "Cash",
        "Total Received (৳)": Number(item.totalAmount || 0),
        "Invoices Settled": (item.details || []).map((d: any) => d.invoiceNo).join(", "),
        Remark: item.remark || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Collections");

      const today = moment().format("YYYY-MM-DD");
      XLSX.writeFile(workbook, `Collection_History_${today}.xlsx`);
      showSuccessToast(`Successfully exported ${rows.length} records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export Excel file");
    }
  };

  const handlePrintClick = (row: CollectionReportItem) => {
    const isBank = String(row.paymentMode).toUpperCase() === "BANK";
    const isMfs = String(row.paymentMode).toUpperCase() === "MFS";

    const receipt: CollectionReceiptData = {
      receiptNo: String(row.collectionNo || `REC-${row.id}`),
      collectionDate: row.collectionDate || moment().format("YYYY-MM-DD"),
      customerName: row.customerName || "Customer",
      customerPhone: row.customerPhone || "",
      customerId: row.customerId || "",
      totalAmount: Number(row.totalAmount || 0),
      paymentMode: isBank ? "Bank" : isMfs ? "MFS" : "Cash",
      bankDetails: isBank
        ? row.bankDetails || (row.bankName ? {
            bankName: row.bankName,
            accountNumber: row.accountNo || row.accountNumber,
          } : null)
        : null,
      mfsDetails: isMfs
        ? row.mfsDetails || (row.mfsName ? {
            mfsName: row.mfsName,
            mfsPhone: row.mfsPhone,
          } : null)
        : null,
      remark: row.remark || "",
      allocations: (row.details || []).map((d: any) => ({
        invoiceNo: d.invoiceNo || "-",
        paidAmount: Number(d.paidAmount || 0),
        dueAmount: Number(d.dueAmount || 0),
      })),
    };

    onPrintReceipt(receipt);
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
      {/* Search and Filters Bar - Matching Cash-Boi standard layout */}
      <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
        {/* Left Section: Compact Search Box + Filters Group */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="w-full sm:w-44 md:w-48 lg:w-56 shrink-0">
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
              placeholder="Search customer, voucher..."
            />
          </div>

          {/* Date Range Picker */}
          <div className="w-[calc(50%-4px)] sm:w-40 lg:w-44 shrink-0 z-50">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              selectedPreset={dateFilterPreset}
              onPresetChange={(preset) => {
                setDateFilterPreset(preset);
                setCurrentPageNumber(1);
              }}
              onChange={({ startDate: s, endDate: e, label }) => {
                setStartDate(s);
                setEndDate(e);
                if (label) setDateFilterPreset(label);
                setCurrentPageNumber(1);
              }}
              size="sm"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="relative w-[calc(50%-4px)] sm:w-32 shrink-0">
            <select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setCurrentPageNumber(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-black font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer appearance-none"
            >
              <option value="all">All Methods</option>
              <option value="Cash">Cash Drawer</option>
              <option value="Bank">Bank Account</option>
              <option value="MFS">MFS (Mobile Banking)</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-xs"
              size={13}
            />
          </div>
        </div>

        {/* Right Section: Export to Excel Button */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <button
            type="button"
            onClick={handleExport}
            title="Download Excel Report"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 h-8 text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <FaFileExcel className="text-emerald-600 shrink-0" size={12} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto w-full relative z-10">
        {isLoading ? (
          <TableSkeleton columnCount={8} rowCount={8} />
        ) : filteredCollections.length === 0 ? (
          <EmptyState
            title="No Collection History Found"
            description="There are no collection vouchers matching your selected search or date range."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                <th className="py-2.5 px-3 text-center w-8"></th>
                <th className="py-2.5 px-3 text-center w-10">SL</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Voucher No</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3 text-center">Method</th>
                <th className="py-2.5 px-3 text-right">Received (৳)</th>
                <th className="py-2.5 px-3 text-center">Bills</th>
                <th className="py-2.5 px-3">Remark</th>
                <th className="py-2.5 px-3 text-center w-16">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCollections.map((row, idx) => {
                const serialNumber = (currentPageNumber - 1) * dataLimit + idx + 1;
                const rowId = row.id ?? row.collectionNo ?? idx;
                const isExpanded = expandedRowIds.has(rowId);
                const isBank = String(row.paymentMode).toUpperCase() === "BANK";
                const isMfs = String(row.paymentMode).toUpperCase() === "MFS";
                const detailsCount = (row.details || []).length;

                return (
                  <React.Fragment key={`row-${rowId}`}>
                    <tr className="hover:bg-sky-50/40 transition-colors group">
                      {/* Accordion Expand Toggle */}
                      <td className="py-2.5 px-2 text-center">
                        {detailsCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleRow(rowId)}
                            className="p-1 text-gray-500 hover:text-black transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse" : "View bills"}
                          >
                            <FiChevronRight
                              size={13}
                              className={`transition-transform duration-200 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        )}
                      </td>

                      {/* SL */}
                      <td className="py-2.5 px-3 text-center text-black text-xs font-normal">
                        {serialNumber}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                        {row.collectionDate || "-"}
                      </td>

                      {/* Voucher No */}
                      <td className="py-2.5 px-3 text-black text-xs font-semibold whitespace-nowrap font-mono">
                        {row.collectionNo || `COL-${idx + 1}`}
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3 text-black text-xs font-semibold whitespace-nowrap">
                        {row.customerName}
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 text-black text-xs font-normal whitespace-nowrap">
                        {row.customerPhone || "-"}
                      </td>

                      {/* Method */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold border rounded-md ${
                            isBank
                              ? "bg-sky-100 text-sky-900 border-sky-300"
                              : isMfs
                              ? "bg-purple-100 text-purple-800 border-purple-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {row.paymentMode || "Cash"}
                        </span>
                      </td>

                      {/* Received Amount */}
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold text-xs whitespace-nowrap">
                        ৳ {formatMoney(row.totalAmount)}
                      </td>

                      {/* Bills Count */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-black rounded text-[11px] font-normal">
                          {detailsCount}
                        </span>
                      </td>

                      {/* Remark */}
                      <td className="py-2.5 px-3 text-gray-500 text-xs truncate max-w-[150px]">
                        {row.remark || "-"}
                      </td>

                      {/* Receipt Action */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handlePrintClick(row)}
                          title="Print Money Receipt"
                          className="p-1 rounded text-gray-600 hover:bg-gray-100 hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                        >
                          <FiPrinter size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Invoices Row */}
                    {isExpanded && detailsCount > 0 && (
                      <tr className="bg-sky-50/20 border-b border-gray-100">
                        <td colSpan={11} className="py-2.5 px-4 pl-12">
                          <div className="bg-white rounded-lg border border-gray-200 p-2.5 space-y-1.5">
                            <span className="text-[11px] font-semibold text-gray-700">
                              Settled Bills Breakdown:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {(row.details || []).map((detail: any, di: number) => (
                                <div
                                  key={di}
                                  className="p-2 rounded bg-gray-50 border border-gray-200 text-xs flex items-center justify-between font-mono"
                                >
                                  <span className="font-semibold text-black">
                                    #{detail.invoiceNo}
                                  </span>
                                  <div className="text-right">
                                    <span className="text-emerald-700 font-bold block">
                                      Paid: ৳ {formatMoney(detail.paidAmount)}
                                    </span>
                                    <span className="text-gray-500 text-[10px]">
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
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer - Exact Cash-Boi styling */}
      {!isLoading && filteredCollections.length > 0 && (
        <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select
              value={dataLimit}
              onChange={(e) => {
                setDataLimit(Number(e.target.value));
                setCurrentPageNumber(1);
              }}
              className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries per page (Total {totalCount} records)</span>
          </div>

          <Pagination
            pageCount={pageCount}
            currentPageNumber={currentPageNumber}
            handlePagination={handlePagination}
          />
        </div>
      )}
    </div>
  );
};

export default CollectionHistoryTable;
