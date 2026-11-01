import React, { useState } from "react";
import {
  Search,
  EmptyState,
  TableSkeleton,
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
  TableActionButtons,
  ExcelExportButton,
} from "@/components/common";
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";
import type { CategoryItem } from "@/types";
import { exportCategoriesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import {
  FaLayerGroup,
  FaArrowDown,
  FaArrowUp,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { FiChevronDown, FiLock } from "react-icons/fi";

interface CategoryTableProps {
  categories: CategoryItem[];
  isLoading: boolean;
  onAddNew: () => void;
  onEdit: (item: CategoryItem) => void;
  onToggleStatus: (item: CategoryItem) => void;
  togglingId?: number | null;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  isLoading,
  onAddNew,
  onEdit,
  onToggleStatus,
  togglingId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState<"categoryName" | "type" | "status">("categoryName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Compute category counts in a single pass
  let expenseCount = 0;
  let incomeCount = 0;
  let statusActiveCount = 0;
  let statusInactiveCount = 0;
  let statusAllCount = 0;

  for (const c of categories) {
    const t = normalizeCategoryType(c.type);
    if (t === "Expense") expenseCount++;
    else if (t === "Income") incomeCount++;

    const matchesCurrentType = !typeFilter || t.toLowerCase() === typeFilter.toLowerCase();
    if (matchesCurrentType) {
      statusAllCount++;
      const st = (c.status || "").toLowerCase();
      if (st === "active") statusActiveCount++;
      else if (st === "inactive") statusInactiveCount++;
    }
  }

  // Type tabs configuration
  const typeTabs = [
    { label: "All Types", value: "", count: categories.length, icon: FaLayerGroup },
    {
      label: "Expense",
      value: "Expense",
      count: expenseCount,
      icon: FaArrowDown,
      iconColor: "text-rose-500",
    },
    {
      label: "Income",
      value: "Income",
      count: incomeCount,
      icon: FaArrowUp,
      iconColor: "text-sky-500",
    },
  ];

  // Status tabs configuration: All -> Active -> Inactive
  const statusTabs = [
    { label: "All", value: "", count: statusAllCount },
    { label: "Active", value: "Active", count: statusActiveCount, icon: FaCheckCircle },
    { label: "Inactive", value: "Inactive", count: statusInactiveCount, icon: FaTimesCircle },
  ];

  // Filter list
  const term = searchQuery.trim().toLowerCase();
  const filtered = categories.filter((item) => {
    const itemType = normalizeCategoryType(item.type);
    const matchesSearch =
      !term ||
      (item.categoryName || "").toLowerCase().includes(term) ||
      itemType.toLowerCase().includes(term);

    const matchesType = !typeFilter || itemType.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus =
      !statusFilter || (item.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort list
  const sorted = [...filtered].sort((a, b) => {
    const factor = sortDir === "asc" ? 1 : -1;
    const valA = String(a[sortKey] || "").toLowerCase();
    const valB = String(b[sortKey] || "").toLowerCase();
    return valA.localeCompare(valB) * factor;
  });

  // Pagination slice
  const totalCount = sorted.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedRows = sorted.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortHeader = (label: string, key: typeof sortKey, align: string = "left") => {
    const isActive = sortKey === key;
    return (
      <span
        onClick={() => handleSort(key)}
        className={`inline-flex items-center gap-1 select-none text-current cursor-pointer ${
          align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : ""
        }`}
      >
        <span>{label}</span>
        <FiChevronDown
          size={11}
          className={`text-current transition-transform duration-200 ${
            isActive && sortDir === "asc" ? "rotate-180" : ""
          }`}
        />
      </span>
    );
  };

  const handleExport = () => {
    const dataToExport = filtered.length > 0 ? filtered : categories;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast("No category records available to export");
      return;
    }
    try {
      exportCategoriesToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} categories to Excel!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export Excel file";
      showErrorToast(msg);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Category Type Tabs (Standard Cash-Boi Tab Pattern) */}
      <div className="flex items-center gap-1.5 border-b border-gray-200/90 -my-0.5 overflow-x-auto scrollbar-none">
        {typeTabs.map((tab) => {
          const isActive = typeFilter === tab.value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setTypeFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-sky-50/50 rounded-t-md"
                  : "border-transparent text-gray-700 hover:text-black hover:bg-gray-50 rounded-t-md"
              }`}
            >
              <Icon
                size={12}
                className={isActive ? "text-[var(--color-primary)]" : tab.iconColor || "text-gray-500"}
              />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Table Container */}
      <TableContainer className="w-full">
        {/* Table Toolbar */}
        <TableToolbar>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            {/* Search Box */}
            <div className="w-full sm:w-72">
              <Search
                searchQuery={searchQuery}
                onSearchChange={(val) => {
                  setSearchQuery(val);
                  setCurrentPage(1);
                }}
                placeholder="Search by category name..."
              />
            </div>

            {/* Right Group: Status Segmented Tabs & Reusable Excel Export Button */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <div className="inline-flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 h-8">
                {statusTabs.map((tab) => {
                  const isActive = statusFilter === tab.value;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(tab.value);
                        setCurrentPage(1);
                      }}
                      className={`h-7 px-3 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? tab.value === "Active"
                            ? "bg-white text-emerald-600 shadow-xs"
                            : tab.value === "Inactive"
                            ? "bg-white text-rose-600 shadow-xs"
                            : "bg-white text-[var(--color-primary)] shadow-xs"
                          : "text-gray-600 hover:text-black"
                      }`}
                    >
                      {Icon && (
                        <Icon
                          size={11}
                          className={
                            isActive
                              ? tab.value === "Active"
                                ? "text-emerald-600"
                                : "text-rose-600"
                              : "text-gray-400"
                          }
                        />
                      )}
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive
                            ? tab.value === "Active"
                              ? "bg-emerald-100 text-emerald-700"
                              : tab.value === "Inactive"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-sky-100 text-sky-700"
                            : "bg-gray-200/70 text-gray-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Reusable Excel Export Button */}
              <ExcelExportButton
                onClick={handleExport}
                title="Download Categories Excel Report"
              />
            </div>
          </div>
        </TableToolbar>

        {/* Main Table Content */}
        <TableScroll>
          {isLoading && categories.length === 0 ? (
            <div className="p-3">
              <TableSkeleton columnCount={5} rowCount={8} />
            </div>
          ) : (
            <Table minWidth={700}>
              <TableHead>
                <TableTh width={60} align="center">
                  SL
                </TableTh>
                <TableTh>
                  {renderSortHeader("Category Name", "categoryName")}
                </TableTh>
                <TableTh width={140}>
                  {renderSortHeader("Type", "type")}
                </TableTh>
                <TableTh width={120} align="center">
                  {renderSortHeader("Status", "status", "center")}
                </TableTh>
                <TableTh width={100} align="center">
                  Action
                </TableTh>
              </TableHead>

              <TableBody>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((item, index) => {
                    const isAdmin = isCategoryAdmin(item);
                    const normType = normalizeCategoryType(item.type);
                    const isActive = (item.status || "").toLowerCase() === "active";
                    const isToggling = togglingId === item.categoryId;
                    const sl = (safeCurrentPage - 1) * pageSize + index + 1;

                    return (
                      <TableRow key={item.categoryId || index}>
                        {/* SL */}
                        <TableCell align="center" className="text-black font-medium">
                          {sl}
                        </TableCell>

                        {/* Category Name */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-medium text-black truncate">
                              {item.categoryName}
                            </span>
                            {isAdmin && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300 shrink-0"
                                title="System default category — locked"
                              >
                                <FiLock size={10} />
                                Default
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Type Badge */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              normType === "Expense"
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : "bg-sky-100 text-sky-800 border-sky-300"
                            }`}
                          >
                            {normType}
                          </span>
                        </TableCell>

                        {/* Status Toggle Badge */}
                        <TableCell align="center">
                          <button
                            type="button"
                            onClick={() => !isAdmin && onToggleStatus(item)}
                            disabled={isAdmin || isToggling}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                              isAdmin
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                : isToggling
                                ? "bg-gray-100 text-gray-500 border-gray-300 cursor-wait"
                                : isActive
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 cursor-pointer"
                                : "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 cursor-pointer"
                            }`}
                            title={
                              isAdmin
                                ? "System default category status cannot be changed"
                                : "Click to toggle status"
                            }
                          >
                            {isToggling ? "Updating..." : isActive ? "Active" : "Inactive"}
                          </button>
                        </TableCell>

                        {/* Action: Edit */}
                        <TableCell align="center">
                          {isAdmin ? (
                            <span
                              className="p-1 rounded text-gray-300 cursor-not-allowed inline-flex items-center justify-center"
                              title="Default category cannot be edited"
                            >
                              <FiLock size={14} />
                            </span>
                          ) : (
                            <TableActionButtons
                              onEdit={() => onEdit(item)}
                              editTitle="Edit Category"
                              className="justify-center"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <EmptyState
                        title="No categories found"
                        description="There are no categories matching your search or filters."
                        buttonText="+ Add Category"
                        onButtonClick={onAddNew}
                      />
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          )}
        </TableScroll>

        {/* Pagination Footer */}
        {!isLoading && totalCount > 0 && (
          <TablePaginationFooter
            totalCount={totalCount}
            pageCount={pageCount}
            currentPageNumber={safeCurrentPage}
            dataLimit={pageSize}
            setDataLimit={(limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            }}
            setCurrentPageNumber={setCurrentPage}
            handlePagination={(d) => setCurrentPage(d.selected + 1)}
            entityLabel="categories"
            pageSizeOptions={[10, 20, 50, 100]}
          />
        )}
      </TableContainer>
    </div>
  );
};

export default CategoryTable;
