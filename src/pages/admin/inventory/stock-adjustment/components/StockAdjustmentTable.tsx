import React, { useState } from "react";
import moment from "moment";
import Search from "@/components/table-components/Search";
import ReportDateRangeControl from "@/components/reports/ReportDateRangeControl";
import DropdownFilter from "@/components/table-components/DropdownFilter";
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
  ExcelExportButton,
  TableActionButtons,
} from "@/components/common";
import type { StockAdjustmentReportItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import { buildAndDownloadExcel } from "@/utils/excel-export";
import { useDebounce } from "@/hooks/useDebounce";
import type { ReportDateFilterProps } from "@/utils/trade-report-helpers";

interface StockAdjustmentTableProps extends ReportDateFilterProps {
  items: StockAdjustmentReportItem[];
  isLoading: boolean;
  onViewDetails: (item: StockAdjustmentReportItem) => void;
}

export const StockAdjustmentTable: React.FC<StockAdjustmentTableProps> = ({
  items,
  isLoading,
  startDate,
  endDate,
  dateRange = "all",
  onPresetChange,
  onDateChange,
  onViewDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const typeOptions = [
    { label: "All Types", value: "" },
    { label: "Stock In (+)", value: "IN" },
    { label: "Stock Out (-)", value: "OUT" },
  ];

  // Filtering
  const term = debouncedSearch.trim().toLowerCase();
  const filteredList: StockAdjustmentReportItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];

    // Filter by adjustment type
    if (typeFilter && it.adjustmentType !== typeFilter) continue;

    // Filter by search query
    if (term) {
      const target = `${it.productName} ${it.adjustmentNo} ${it.productId || ""} ${it.remarks || ""}`.toLowerCase();
      if (!target.includes(term)) continue;
    }

    filteredList.push(it);
  }

  // Pagination calculation
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedList = filteredList.slice(startIndex, startIndex + pageSize);

  const formatUnit = (unit?: string) => {
    const raw = String(unit || "").trim();
    if (!raw || raw.toLowerCase().includes("dozen") || raw.toLowerCase() === "units" || raw.toLowerCase() === "unit") {
      return "Pcs";
    }
    return raw;
  };

  // Excel Export
  const handleExportExcel = () => {
    if (filteredList.length === 0) return;

    let sumQtyIn = 0;
    let sumQtyOut = 0;
    let sumValue = 0;

    const rows = filteredList.map((item, idx) => {
      const isOut = item.adjustmentType === "OUT";
      const value = item.adjustmentQty * item.price * (isOut ? -1 : 1);

      if (isOut) {
        sumQtyOut += item.adjustmentQty;
      } else {
        sumQtyIn += item.adjustmentQty;
      }
      sumValue += value;

      return {
        "SL": idx + 1,
        "Date": item.createdAt || "-",
        "Product Name": item.productName,
        "Product Code": item.productId || "-",
        "Type": isOut ? "Stock Out (-)" : "Stock In (+)",
        "Pack Size / Unit": formatUnit(item.packSize),
        "Unit Price (BDT)": item.price,
        "Previous Qty": item.previousQty,
        "Adjusted Qty": isOut ? -item.adjustmentQty : item.adjustmentQty,
        "New Qty": item.newQty,
        "Total Value Impact (BDT)": value,
        "Remarks": item.remarks || "-",
      };
    });

    const totalRow = {
      "SL": "Total",
      "Date": "-",
      "Product Name": "-",
      "Product Code": "-",
      "Type": "-",
      "Pack Size / Unit": "-",
      "Unit Price (BDT)": "-",
      "Previous Qty": "-",
      "Adjusted Qty": sumQtyIn - sumQtyOut,
      "New Qty": "-",
      "Total Value Impact (BDT)": sumValue,
      "Remarks": "-",
    };

    const dateSuffix =
      startDate && endDate
        ? `${startDate}_to_${endDate}`
        : moment().format("YYYY-MM-DD");

    buildAndDownloadExcel(rows, totalRow, {
      fileName: `Stock_Adjustments_${dateSuffix}.xlsx`,
      sheetName: "Stock_Adjustments",
    });
  };

  return (
    <TableContainer className="w-full">
      {/* Table Toolbar */}
      <TableToolbar>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
          {/* Left: Search Box & Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
            <div className="w-full sm:w-64 shrink-0">
              <Search
                searchQuery={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                placeholder="Search by product, P-code..."
              />
            </div>

            <ReportDateRangeControl
              startDate={startDate}
              endDate={endDate}
              dateRange={dateRange}
              onPresetChange={onPresetChange}
              onDateChange={onDateChange}
              onAfterChange={() => setCurrentPage(1)}
            />
          </div>

          {/* Right: Type Filter & Excel Button */}
          <div className="flex flex-wrap items-center gap-2">
            <DropdownFilter
              title="Adjustment Type"
              options={typeOptions}
              selectedOption={
                typeFilter ? typeOptions.find((o) => o.value === typeFilter) || null : null
              }
              isOpen={openDropdown === "type"}
              onToggle={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
              onSelect={(selected) => {
                setTypeFilter(selected ? selected.value : "");
                setCurrentPage(1);
                setOpenDropdown(null);
              }}
            />

            <ExcelExportButton
              onClick={handleExportExcel}
              disabled={filteredList.length === 0}
              title="Download Stock Adjustments Excel Report"
            />
          </div>
        </div>
      </TableToolbar>

      {/* Table Content */}
      <TableScroll>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columnCount={9} />
          </div>
        ) : (
          <Table className="table-fixed min-w-[950px]">
            <TableHead>
              <TableTh width="5%">SL</TableTh>
              <TableTh width="15%">P-Code</TableTh>
              <TableTh width="23%">Product Name</TableTh>
              <TableTh width="12%">Type</TableTh>
              <TableTh width="10%" align="right">Prev Qty</TableTh>
              <TableTh width="11%" align="right">Adjusted Qty</TableTh>
              <TableTh width="9%" align="right">New Qty</TableTh>
              <TableTh width="9%" align="right">Value (৳)</TableTh>
              <TableTh width="6%" align="right">Actions</TableTh>
            </TableHead>

            <TableBody>
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <EmptyState
                      title={
                        searchQuery || typeFilter || (startDate && endDate)
                          ? "No adjustments matching your filters"
                          : "No stock adjustments recorded yet"
                      }
                      description={
                        searchQuery || typeFilter || (startDate && endDate)
                          ? "Try adjusting your date range, search query, or type filter to see adjustment records."
                          : "Click 'Record Adjustment' above to adjust product stock levels."
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, index) => {
                  const sl = (safeCurrentPage - 1) * pageSize + (index + 1);
                  const isOut = item.adjustmentType === "OUT";
                  const valueImpact = item.adjustmentQty * item.price;

                  return (
                    <tr
                      key={item.adjustmentId}
                      className="hover:bg-[var(--primary-color-light)]/40 transition-colors group"
                    >
                      {/* SL */}
                      <td className="py-2.5 px-3 text-left text-xs font-normal text-[var(--ui-text)] truncate">
                        {sl}
                      </td>

                      {/* P-Code */}
                      <td className="py-2.5 px-3 text-left text-xs font-mono font-medium text-[var(--ui-text-muted)] truncate whitespace-nowrap">
                        <span
                          className="bg-[var(--ui-surface-sunken)] px-1.5 py-0.5 rounded border border-[var(--ui-border)] text-[11px] inline-block truncate max-w-[130px]"
                          title={item.productId || "-"}
                        >
                          {item.productId || "-"}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-2.5 px-3 text-left font-medium text-xs text-[var(--ui-text)] truncate whitespace-nowrap">
                        <span className="font-semibold text-xs text-[var(--ui-text)] block truncate" title={item.productName}>
                          {item.productName}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-2 text-left whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                            isOut
                              ? "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                              : "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                          }`}
                        >
                          {isOut ? "Stock Out (-)" : "Stock In (+)"}
                        </span>
                      </td>

                      {/* Previous Stock */}
                      <td className="py-2.5 px-3 text-right font-normal text-xs text-[var(--ui-text-muted)] whitespace-nowrap">
                        {item.previousQty} {formatUnit(item.packSize)}
                      </td>

                      {/* Adjusted Qty */}
                      <td className="py-2.5 px-3 text-right font-bold text-xs whitespace-nowrap">
                        <span className={isOut ? "text-[var(--ui-danger)]" : "text-[var(--ui-success)]"}>
                          {isOut ? "-" : "+"} {item.adjustmentQty} {formatUnit(item.packSize)}
                        </span>
                      </td>

                      {/* New Stock */}
                      <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--primary-color)] whitespace-nowrap">
                        {item.newQty} {formatUnit(item.packSize)}
                      </td>

                      {/* Value Impact */}
                      <td className="py-2.5 px-3 text-right font-semibold text-xs whitespace-nowrap">
                        <span className={isOut ? "text-[var(--ui-danger)]" : "text-[var(--ui-success)]"}>
                          {isOut ? "-" : "+"} ৳ {formatMoney(valueImpact)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right">
                        <TableActionButtons
                          onView={() => onViewDetails(item)}
                          viewTitle="View Adjustment Details"
                          className="justify-end"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </TableScroll>

      {/* Pagination Footer */}
      {!isLoading && totalItems > 0 && (
        <TablePaginationFooter
          totalCount={totalItems}
          pageCount={totalPages}
          currentPageNumber={safeCurrentPage}
          dataLimit={pageSize}
          setDataLimit={(limit) => {
            setPageSize(limit);
            setCurrentPage(1);
          }}
        />
      )}
    </TableContainer>
  );
};
